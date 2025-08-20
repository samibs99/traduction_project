const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import des routes API
const authRoutes = require('./routes/auth');
const projetRoutes = require('./routes/projet');

const app = express();

// CORS pour le frontend React/Next.js (port 3001)
app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Middleware JSON
app.use(express.json());

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/projets', projetRoutes);

// Création du serveur HTTP pour Socket.io
const server = http.createServer(app);

// Configuration Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001", // URL frontend
    methods: ["GET", "POST"]
  }
});

// =======================
// Données partagées en mémoire
// (à remplacer plus tard par une DB)
// =======================
let texteGlobal = "";
let segmentsGlobal = [
  "Bonjour, ceci est le segment 1.",
  "Ceci est le segment 2.",
  "Et voici le segment 3."
];

// =======================
// WebSocket : Connexion en temps réel
// =======================
io.on("connection", (socket) => {
  console.log("✅ Un utilisateur connecté :", socket.id);

  // Envoi des données actuelles au nouvel utilisateur
  socket.emit("segments", segmentsGlobal);
  socket.emit("texte_update", texteGlobal);

  // Mise à jour globale du texte
  socket.on("texte_update", (nouveauTexte) => {
    texteGlobal = nouveauTexte;
    io.emit("texte_update", texteGlobal); // envoi à tous
  });

  // Mise à jour d’un seul segment
  socket.on("segment_update", ({ index, contenu }) => {
    if (segmentsGlobal[index] !== undefined) {
      segmentsGlobal[index] = contenu;
      io.emit("segments", segmentsGlobal); // envoi à tous
    }
  });

  // Mise à jour de toute la liste des segments (ajout/suppression)
  socket.on("segments_update", (nouvelleListe) => {
    segmentsGlobal = nouvelleListe;
    io.emit("segments", segmentsGlobal); // envoi à tous
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log("❌ Utilisateur déconnecté :", socket.id);
  });
});

// =======================
// Lancement serveur
// =======================
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur API + WebSocket lancé sur http://localhost:${PORT}`);
});
