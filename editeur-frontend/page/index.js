"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3000");

export default function Home() {
  const [texte, setTexte] = useState("");
  const [segments, setSegments] = useState([]);

  useEffect(() => {
    socket.on("segments", (data) => setSegments(data));
    socket.on("texte_update", (nouveauTexte) => setTexte(nouveauTexte));

    return () => {
      socket.off("segments");
      socket.off("texte_update");
    };
  }, []);

  const handleChangeTexte = (e) => {
    const nouveauTexte = e.target.value;
    setTexte(nouveauTexte);
    socket.emit("texte_update", nouveauTexte);
  };

  const handleChangeSegment = (index, value) => {
    const newSegments = [...segments];
    newSegments[index] = value;
    setSegments(newSegments);
    socket.emit("segment_update", { index, contenu: value });
  };

  const ajouterSegment = () => {
    const nouveau = `Nouveau segment ${segments.length + 1}`;
    const newSegments = [...segments, nouveau];
    setSegments(newSegments);
    socket.emit("segments", newSegments);
  };

  const supprimerSegment = (index) => {
    const newSegments = segments.filter((_, i) => i !== index);
    setSegments(newSegments);
    socket.emit("segments", newSegments);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📝 <b>Éditeur collaboratif</b></h1>

      {/* Texte global */}
      <textarea
        value={texte}
        onChange={handleChangeTexte}
        placeholder="Tape ton texte ici..."
        style={{
          width: "100%",
          height: "150px",
          marginBottom: "20px",
          border: "1px solid black",
        }}
      />

      {/* Segments */}
      <h2>📄 Segments reçus :</h2>
      {segments.map((seg, index) => (
        <div key={index} style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={seg}
            onChange={(e) => handleChangeSegment(index, e.target.value)}
            style={{ width: "70%", marginRight: "10px" }}
          />
          <button
            onClick={() => supprimerSegment(index)}
            style={{ background: "red", color: "white", padding: "5px 10px" }}
          >
            ❌ Supprimer
          </button>
        </div>
      ))}

      {/* Bouton ajouter */}
      <button
        onClick={ajouterSegment}
        style={{
          marginTop: "10px",
          background: "green",
          color: "white",
          padding: "10px 15px",
        }}
      >
        ➕ Ajouter un segment
      </button>
    </div>
  );
}
