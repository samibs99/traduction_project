import sys
import json

# Très simplifié : basé sur des mots-clés
CATEGORIES = {
    'juridique': ['contrat', 'loi', 'clause', 'justice', 'litige'],
    'technique': ['moteur', 'code', 'système', 'serveur', 'algorithme'],
    'marketing': ['campagne', 'client', 'vente', 'promotion', 'marque']
}

def detect_context(text):
    for category, keywords in CATEGORIES.items():
        if any(word in text.lower() for word in keywords):
            return category
    return 'general'

if __name__ == "__main__":
    texte = sys.stdin.read()
    contexte = detect_context(texte)
    print(json.dumps({ "contexte": contexte }))
