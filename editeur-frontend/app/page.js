"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function Home() {
  const [texte, setTexte] = useState("");
  const [segments, setSegments] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [traduction, setTraduction] = useState("");

  // ------------------- Handlers -------------------
  const handleChangeTexte = (e) => setTexte(e.target.value);

  const segmenter = async () => {
    try {
      const { data } = await axios.post("http://localhost:3000/api/ai/segmenter", { texte });
      setSegments(data.segments || []);
    } catch (e) {
      alert("Erreur lors du segmenter");
    }
  };

  const harmoniser = async () => {
    try {
      const { data } = await axios.post("http://localhost:3000/api/ai/harmoniser", { contenu: texte });
      setTexte(data.harmonisation);
      alert("✅ Harmonisation terminée");
    } catch (e) {
      alert("Erreur lors de l'harmonisation");
    }
  };

  const traduire = async () => {
    try {
      const { data } = await axios.post("http://localhost:3000/api/ai/traduire", {
        texte,
        langue_cible: "en"
      });
      setTraduction(data.traduction);
    } catch (e) {
      alert("Erreur lors de la traduction");
    }
  };

  const demanderSuggestion = async (index) => {
    try {
      const { data } = await axios.post("http://localhost:3000/api/ai/suggest", {
        contenu: segments[index]
      });
      setSuggestions((prev) => ({ ...prev, [index]: data.suggestion }));
    } catch (e) {
      alert("Erreur lors de la suggestion");
    }
  };

  const accepterSuggestion = (index) => {
    const s = suggestions[index];
    if (!s) return;
    const copy = [...segments];
    copy[index] = s;
    setSegments(copy);

    setSuggestions((prev) => {
      const cp = { ...prev };
      delete cp[index];
      return cp;
    });
  };

  const handleChangeSegment = (index, value) => {
    const copy = [...segments];
    copy[index] = value;
    setSegments(copy);
  };

  const ajouterSegment = () => setSegments([...segments, `Nouveau segment ${segments.length + 1}`]);
  const supprimerSegment = (index) => setSegments(segments.filter((_, i) => i !== index));

  // ------------------- UI -------------------
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h1>📝 Éditeur IA Collaboratif</h1>

      {/* Texte global */}
      <textarea
        value={texte}
        onChange={handleChangeTexte}
        placeholder="Écrivez ici..."
        style={{ width: "100%", height: 150, marginBottom: 10 }}
      />

      {/* Boutons actions globales */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={segmenter} style={{ marginRight: 10 }}>📄 Segmenter</button>
        <button onClick={harmoniser} style={{ marginRight: 10 }}>🔄 Harmoniser</button>
        <button onClick={traduire}>🌐 Traduire</button>
      </div>

      {/* Segments */}
      <h2>Segments</h2>
      <button onClick={ajouterSegment} style={{ marginBottom: 10 }}>➕ Ajouter un segment</button>
      {segments.map((seg, i) => (
        <div key={i} style={{ marginBottom: 10, padding: 8, border: "1px solid #ddd", borderRadius: 6 }}>
          <input
            type="text"
            value={seg}
            onChange={(e) => handleChangeSegment(i, e.target.value)}
            style={{ width: "70%", marginRight: 10 }}
          />
          <button onClick={() => supprimerSegment(i)} style={{ marginRight: 10 }}>🗑️</button>
          <button onClick={() => demanderSuggestion(i)}>🧠 Suggestion</button>

          {suggestions[i] && (
            <div style={{ marginTop: 6, padding: 6, background: "#f0f0f0", borderRadius: 4 }}>
              <p style={{ margin: 0 }}>{suggestions[i]}</p>
              <button onClick={() => accepterSuggestion(i)} style={{ marginTop: 4, background: "green", color: "white", padding: "4px 6px", borderRadius: 4 }}>
                ✅ Accepter
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Traduction */}
      {traduction && (
        <>
          <h2>Traduction</h2>
          <p>{traduction}</p>
        </>
      )}
    </div>
  );
}
