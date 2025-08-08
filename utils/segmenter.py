import sys
import spacy
import json

nlp = spacy.load("fr_core_news_md")

def segmenter(texte):
    doc = nlp(texte)
    return [sent.text.strip() for sent in doc.sents]

if __name__ == "__main__":
    texte = sys.stdin.read()
    segments = segmenter(texte)
    print(json.dumps(segments, ensure_ascii=False))
