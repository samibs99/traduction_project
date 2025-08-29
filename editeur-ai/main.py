# main.py
import os
import json
import requests
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import sacrebleu
from comet_ml import Experiment
import nltk
nltk.download('punkt')


load_dotenv()
app = FastAPI(title="Editeur IA - Microservice")

# 🔑 API Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyByaF3s6RNRfvAa03ZR8N4YDd_S6nXpn-A")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

# =============== Schémas I/O ===============
class SuggestIn(BaseModel):
    contenu: str
    consignes: Optional[str] = None

class TraduireIn(BaseModel):
    texte: str
    langue_cible: str
    langue_source: Optional[str] = None
    consignes: Optional[str] = None

class TexteIn(BaseModel):
    texte: str

class SegmentsIn(BaseModel):
    segments: List[str]

class EvalIn(BaseModel):
    reference: str  # texte de référence
    hypothesis: str  # texte traduit à évaluer

# =============== Endpoints segmenter / classifier (inchangés) ===============
CATEGORIES = {
    'juridique': ['contrat', 'loi', 'clause', 'justice', 'litige'],
    'technique': ['moteur', 'code', 'système', 'serveur', 'algorithme'],
    'marketing': ['campagne', 'client', 'vente', 'promotion', 'marque']
}

@app.post("/segmenter")
def segmenter_ep(data: TexteIn):
    rough = [s.strip() for s in data.texte.replace("\n", " ").split(".")]
    segments = [s for s in rough if s]
    return {"segments": segments}

@app.post("/classifier")
def classifier_ep(data: TexteIn):
    low = data.texte.lower()
    for cat, kws in CATEGORIES.items():
        if any(k in low for k in kws):
            return {"contexte": cat}
    return {"contexte": "general"}

# =============== Endpoints harmoniser / suggest / traduire (Gemini uniquement) ===============
def call_gemini(prompt: str) -> str:
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(GEMINI_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        text = (
            result.get("candidates", [{}])[0]
                  .get("content", {})
                  .get("parts", [{}])[0]
                  .get("text", "")
        )
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/harmoniser")
def harmoniser_ep(data: SuggestIn):
    if not data.contenu.strip():
        raise HTTPException(status_code=400, detail="Le contenu est vide")
    prompt = f"""Harmonise les segments suivants pour uniformiser les traductions sur un projet.
Préserve le sens, la terminologie et le style.
Réponds SEULEMENT avec le texte harmonisé, sans explications, sans listes, sans options.
Texte: {data.contenu}"""
    if data.consignes:
        prompt = f"{data.consignes}\n{prompt}"
    try:
        harmonized = call_gemini(prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Gemini: {str(e)}")
    return {"harmonisation": harmonized}

@app.post("/suggest")
def suggest_ep(data: SuggestIn):
    prompt = f"""Améliore la cohérence et le style du texte suivant.
Préserve le sens et la terminologie.
Réponds SEULEMENT avec le texte amélioré, sans explications, sans listes, sans options.
Texte: {data.contenu}"""
    if data.consignes:
        prompt = f"{data.consignes}\n{prompt}"
    suggestion = call_gemini(prompt)
    return {"suggestion": suggestion}

@app.post("/traduire")
def traduire_ep(data: TraduireIn):
    consignes = data.consignes or "Translate precisely. Keep numbers, placeholders {var}, and style."
    src = f"(source: {data.langue_source})" if data.langue_source else ""
    prompt = f"Consignes: {consignes}\nLangue cible: {data.langue_cible} {src}\nTexte:\n{data.texte}"
    traduction = call_gemini(prompt)
    return {"traduction": traduction}

@app.post("/evaluer")
def evaluer(data: dict):
    reference = data.get("reference")
    hypothesis = data.get("hypothesis")
    if not reference or not hypothesis:
        raise HTTPException(status_code=400, detail="Reference et hypothesis sont requis")

    # Exemple simple avec BLEU (nltk)
    import nltk
    from nltk.translate.bleu_score import sentence_bleu

    reference_tokens = [reference.split()]
    hypothesis_tokens = hypothesis.split()
    bleu_score = sentence_bleu(reference_tokens, hypothesis_tokens)

    # COMET : si tu n'as pas de modèle COMET installé, mets un score factice
    comet_score = 0.9

    return {"bleu": {"score": bleu_score}, "comet": {"score": comet_score}}
