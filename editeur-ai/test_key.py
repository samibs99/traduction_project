import os
import requests
from dotenv import load_dotenv

load_dotenv()

DS_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DS_BASE = os.getenv("DEEPSEEK_BASE", "https://api.deepseek.com/v1")

headers = {"Authorization": f"Bearer {DS_API_KEY}", "Content-Type": "application/json"}

payload = {
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Bonjour"}],
}

try:
    resp = requests.post(f"{DS_BASE}/chat/completions", headers=headers, json=payload)
    resp.raise_for_status()
    print("✅ Clé valide !")
    print(resp.json())
except requests.exceptions.HTTPError as e:
    print("❌ Clé invalide ou problème :", e)
except Exception as e:
    print("Erreur :", e)
