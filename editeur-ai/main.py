# main.py
import os
import json
import requests
from typing import List, Optional
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from bytez import Bytez

app = FastAPI()


# 🔑 Load API key (better to keep it in env variable)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyByaF3s6RNRfvAa03ZR8N4YDd_S6nXpn-A")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
class SuggestIn(BaseModel):
    contenu: str  # instead of "texte"
    consignes: str | None = None
class TraduireIn(BaseModel):
    texte: str
    langue_source: str | None = None
    langue_cible: str
    consignes: str | None = None
load_dotenv()

app = FastAPI(title="Editeur IA - Microservice (DeepSeek)")

# =============== Config DeepSeek ===============
DS_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DS_BASE = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com/v1")
MODEL_REASONING = os.getenv("DEEPSEEK_MODEL_REASONING", "deepseek-reasoner")
MODEL_TRANSLATE = os.getenv("DEEPSEEK_MODEL_TRANSLATE", "deepseek-chat")

HEADERS = {
    "Authorization": f"Bearer {DS_API_KEY}",
    "Content-Type": "application/json",
}

def call_deepseek_chat(messages: List[dict], model: str, temperature: float = 0.2, json_mode: bool = False) -> Optional[str]:
    """
    Appel 'chat/completions' compatible OpenAI.
    Retourne le texte (content) ou None si erreur.
    """
    if not DS_API_KEY:
        return None

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    # Certaines implémentations supportent un mode JSON strict ; on reste "prompt-based"
    # pour compat max, mais tu peux ajouter:
    # payload["response_format"] = {"type": "json_object"} if json_mode else {"type": "text"}

    try:
        resp = requests.post(f"{DS_BASE}/chat/completions", headers=HEADERS, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print("DeepSeek error:", repr(e))
        return None

# =============== Schémas I/O ===============
class TexteIn(BaseModel):
    texte: str

class SegmentsIn(BaseModel):
    segments: List[str]

class TraduireIn(BaseModel):
    texte: str
    langue_cible: str
    langue_source: Optional[str] = None
    consignes: Optional[str] = None  # ex: "garder les balises {var} et le vouvoiement"

# =============== Règles simples fallback ===============
CATEGORIES = {
    'juridique': ['contrat', 'loi', 'clause', 'justice', 'litige'],
    'technique': ['moteur', 'code', 'système', 'serveur', 'algorithme'],
    'marketing': ['campagne', 'client', 'vente', 'promotion', 'marque']
}

def detect_context(text: str) -> str:
    low = text.lower()
    for cat, kws in CATEGORIES.items():
        if any(k in low for k in kws):
            return cat
    return "general"

def segmenter_heuristique(texte: str) -> List[str]:
    rough = [s.strip() for s in texte.replace("\n", " ").split(".")]
    return [s for s in rough if s]

def harmoniser_style_fallback(segments: List[str]) -> List[str]:
    res = []
    for s in segments:
        s_clean = s.strip()
        if not s_clean:
            continue
        if s_clean[-1] not in ".!?":
            s_clean += "."
        s_clean = s_clean[0].upper() + s_clean[1:]
        res.append(s_clean)
    return res

def suggestion_fallback(contenu: str, contexte: Optional[str]) -> str:
    base = contenu.strip()
    if not base:
        return ""
    if contexte == "juridique":
        return f"{base} (Formulation plus formelle conformément au contexte juridique)."
    if contexte == "technique":
        return f"{base} (Précision technique ajoutée)."
    if contexte == "marketing":
        return f"{base} (Tonalité marketing renforcée)."
    return f"{base} (Légère amélioration stylistique)."

# =============== Endpoints ===============
@app.post("/segmenter")
def segmenter_ep(data: TexteIn):
    return {"segments": segmenter_heuristique(data.texte)}

@app.post("/classifier")
def classifier_ep(data: TexteIn):
    return {"contexte": detect_context(data.texte)}



@app.post("/harmoniser")
def harmoniser_ep(data: SegmentsIn):
    # Prompt DeepSeek pour harmoniser une liste
    joined = "\n".join(f"- {s}" for s in data.segments)
    messages = [
        {"role": "system", "content":
         "Tu harmonises un lot de segments: terminologie constante, ton cohérent, "
         "ponctuation/majuscules uniformes. Ne change pas le sens. "
         "Réponds en JSON strict: {\"segments\":[\"...\",\"...\"]}"},
        {"role": "user", "content": f"Liste à harmoniser:\n{joined}"}
    ]
    out = call_deepseek_chat(messages, model=MODEL_REASONING, temperature=0.2)
    if out:
        try:
            parsed = json.loads(out)
            if isinstance(parsed, dict) and "segments" in parsed:
                return {"segments": parsed["segments"]}
        except Exception:
            pass
    # fallback
    return {"segments": harmoniser_style_fallback(data.segments)}


@app.post("/traduire")
def traduire_ep(data: TraduireIn):
    consignes = data.consignes or "Translate precisely. Keep numbers, placeholders {var}, and style."
    src = f"(source: {data.langue_source})" if data.langue_source else ""

    # 📝 Build prompt
    prompt = f"Consignes: {consignes}\nLangue cible: {data.langue_cible} {src}\nTexte:\n{data.texte}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(GEMINI_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()

        # Gemini returns nested candidates → extract safely
        traduction = (
            result.get("candidates", [{}])[0]
                  .get("content", {})
                  .get("parts", [{}])[0]
                  .get("text", "")
        )

        if not traduction:
            raise HTTPException(status_code=500, detail=f"Unexpected response: {result}")

        return {"traduction": traduction}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/suggest")
def suggest_ep(data: SuggestIn):
    # Build prompt
    prompt = f"""Améliore la cohérence et le style du texte suivant.
Préserve le sens et la terminologie.
Réponds SEULEMENT avec le texte amélioré, sans explications, sans listes, sans options.
Texte: {data.contenu}"""

    if data.consignes:
        prompt = f"{data.consignes}\n{prompt}"

    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }

    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(GEMINI_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        suggestion = (
            result.get("candidates", [{}])[0]
                  .get("content", {})
                  .get("parts", [{}])[0]
                  .get("text", "")
        )
        return {"suggestion": suggestion.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
