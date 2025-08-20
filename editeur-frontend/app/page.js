'use client';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Connexion au serveur backend Socket.IO sur port 3000
const socket = io("http://localhost:3000");

export default function Home() {
  const [texte, setTexte] = useState("");
  const [segments, setSegments] = useState([]);

  useEffect(() => {
    // Réception des segments
    socket.on("segments", (data) => {
      setSegments(data);
    });

    // Réception mise à jour texte
    socket.on("texte_update", (newTexte) => {
      setTexte(newTexte);
    });

    return () => {
      socket.off("segments");
      socket.off("texte_update");
    };
  }, []);

  // Envoi mise à jour texte
  const handleChange = (e) => {
    setTexte(e.target.value);
    socket.emit("texte_update", e.target.value);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📝 Éditeur collaboratif</h1>

      <textarea
        value={texte}
        onChange={handleChange}
        placeholder="Écrivez ici..."
        style={{ width: "100%", height: "200px" }}
      />

      <h2>📄 Segments reçus :</h2>
      <ul>
        {segments.map((seg, i) => (
          <li key={i}>{seg}</li>
        ))}
      </ul>
    </div>
  );
}
