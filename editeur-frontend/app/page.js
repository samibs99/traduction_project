"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
const socket = io("http://localhost:3000");

export default function Home() {
  const [texte, setTexte] = useState("");
  const [segments, setSegments] = useState([]);
  const [suggestions, setSuggestions] = useState({}); // {index: {texte, contexte}}

  useEffect(() => {
    // Réception des données temps réel
    socket.on("segments", (data) => setSegments(data));
    socket.on("texte_update", (t) => setTexte(t));
    socket.on("suggestion_segment", ({ index, suggestion, contexte }) => {
      setSuggestions((prev) => ({
        ...prev,
        [index]: { texte: suggestion, contexte },
      }));
    });
    socket.on("harmonisation_ok", ({ success }) => {
      if (success) alert("✅ Harmonisation terminée !");
      else alert("❌ Erreur harmonisation");
    });

    return () => {
      socket.off("segments");
      socket.off("texte_update");
      socket.off("suggestion_segment");
      socket.off("harmonisation_ok");
    };
  }, []);

  // Texte global
  const handleChangeTexte = (e) => {
    const t = e.target.value;
    setTexte(t);
    socket.emit("texte_update", t);
  };

  // Edition segment
  const handleChangeSegment = (index, value) => {
    const copy = [...segments];
    copy[index] = value;
    setSegments(copy);
    socket.emit("segment_update", { index, contenu: value });
  };

  // Ajouter / supprimer
  const ajouterSegment = () => {
    const copy = [...segments, `Nouveau segment ${segments.length + 1}`];
    setSegments(copy);
    socket.emit("segments_update", copy);
  };

  const supprimerSegment = (index) => {
    const copy = segments.filter((_, i) => i !== index);
    setSegments(copy);
    socket.emit("segments_update", copy);
  };

  // Suggestions IA
  const demanderSuggestion = (index) => {
    socket.emit("demander_suggestion", { index });
  };

  const accepterSuggestion = (index) => {
    const s = suggestions[index]?.texte;
    if (!s) return;
    handleChangeSegment(index, s);
    setSuggestions((prev) => {
      const cp = { ...prev };
      delete cp[index];
      return cp;
    });
  };

  // Harmonisation IA
  const harmoniserProjet = () => {
    socket.emit("demander_harmonisation");
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1>📝 <b>Éditeur collaboratif</b></h1>

      {/* Texte global */}
      <textarea
        value={texte}
        onChange={handleChangeTexte}
        placeholder="Écrivez ici..."
        style={{
          width: "100%",
          height: 160,
          border: "1px solid #333",
          marginBottom: 20,
        }}
      />

      {/* Bouton harmonisation */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={harmoniserProjet}
          style={{
            padding: "8px 12px",
            background: "blue",
            color: "white",
            borderRadius: 6,
          }}
        >
          🔄 Harmoniser tout le projet
        </button>
      </div>

      {/* Gestion segments */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <h2 style={{ margin: 0 }}>📄 Segments</h2>
        <button onClick={ajouterSegment} style={{ padding: "6px 10px" }}>
          ➕ Ajouter
        </button>
      </div>

      {/* Liste segments */}
      {segments.map((seg, i) => (
        <div
          key={i}
          style={{
            marginBottom: 14,
            border: "1px solid #ddd",
            padding: 10,
            borderRadius: 8,
          }}
        >
          <input
            type="text"
            value={seg}
            onChange={(e) => handleChangeSegment(i, e.target.value)}
            style={{ width: "70%", marginRight: 10 }}
          />
          <button onClick={() => supprimerSegment(i)} style={{ marginRight: 8 }}>
            🗑️ Supprimer
          </button>
          <button onClick={() => demanderSuggestion(i)}>🧠 Suggérer</button>

          {/* Suggestion affichée */}
          {suggestions[i]?.texte && (
            <div
              style={{
                marginTop: 10,
                background:
                  suggestions[i].contexte === "deepseek" ? "#e0f7fa" : "#f0f0f0",
                padding: 8,
                borderRadius: 6,
              }}
            >
              <p style={{ margin: 0 }}>
                <b>
                  Suggestion IA{" "}
                  {suggestions[i].contexte === "deepseek"
                    ? "(DeepSeek 🤖)"
                    : "(Règles Python ⚙️)"}
                  :
                </b>
                <br />
                {suggestions[i].texte}
              </p>
              <button
                onClick={() => accepterSuggestion(i)}
                style={{
                  marginTop: 6,
                  background: "green",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: 4,
                }}
              >
                ✅ Accepter la suggestion
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
