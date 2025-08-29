// app.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
// Import des routes API existantes
const authRoutes = require("./routes/auth");
const projetRoutes = require("./routes/projet");

const PY_URL = "http://127.0.0.1:8000"; // Microservice FastAPI
const app = express();
app.use(
  cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// Routes API existantes
app.use("/api/auth", authRoutes);
app.use("/api/projets", projetRoutes);

// --------- Helpers HTTP vers Python ---------
async function callPython(path, payload) {
  const url = `${PY_URL}${path}`;
  const { data } = await axios.post(url, payload);
  return data;
}

// --------- Endpoints IA côté Node ---------
app.post("/api/ai/segmenter", async (req, res) => {
  try {
    const { texte } = req.body;
    const data = await callPython("/segmenter", { texte });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur /segmenter" });
  }
});

app.post("/api/ai/classifier", async (req, res) => {
  try {
    const { texte } = req.body;
    const data = await callPython("/classifier", { texte });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur /classifier" });
  }
});

app.post("/api/ai/harmoniser", async (req, res) => {
  try {
    const { segments } = req.body;
    const data = await callPython("/harmoniser", { contenu: segments.join("\n") });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur /harmoniser" });
  }
});

app.post("/api/ai/suggest", async (req, res) => {
  try {
    const { contenu, consignes } = req.body;
    const data = await callPython("/suggest", { contenu, consignes });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur /suggest" });
  }
});

app.post("/api/ai/traduire", async (req, res) => {
  try {
    const { texte, langue_cible, langue_source, consignes } = req.body;
    const data = await callPython("/traduire", { texte, langue_cible, langue_source, consignes });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur /traduire" });
  }
});

// --------- Socket.IO temps réel ---------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3001", methods: ["GET", "POST"] },
});

// Données en mémoire (à remplacer par DB)
let texteGlobal = "";
let segmentsGlobal = [
  "Bonjour, ceci est le segment 1.",
  "Ceci est le segment 2.",
  "Et voici le segment 3.",
];

io.on("connection", (socket) => {
  console.log("✅ Connecté :", socket.id);

  // Init client
  socket.emit("segments", segmentsGlobal);
  socket.emit("texte_update", texteGlobal);

  // Texte global
  socket.on("texte_update", (nouveauTexte) => {
    texteGlobal = nouveauTexte;
    io.emit("texte_update", texteGlobal);
  });

  // Edit d’un segment
  socket.on("segment_update", ({ index, contenu }) => {
    if (segmentsGlobal[index] !== undefined) {
      segmentsGlobal[index] = contenu;
      io.emit("segments", segmentsGlobal);
    }
  });

  // Ajouter / supprimer (on reçoit liste complète)
  socket.on("segments_update", (nouvelleListe) => {
    segmentsGlobal = nouvelleListe;
    io.emit("segments", segmentsGlobal);
  });

  // Suggestion IA
  socket.on("demander_suggestion", async ({ index }) => {
    try {
      const contenu = segmentsGlobal[index] ?? "";
      const resp = await callPython("/suggest", { contenu });
      socket.emit("suggestion_segment", { index, suggestion: resp.suggestion });
    } catch (e) {
      console.error("Erreur suggestion:", e.message);
      socket.emit("suggestion_segment", { index, suggestion: "" });
    }
  });

  // Harmonisation IA
  socket.on("demander_harmonisation", async () => {
    try {
      const { harmonisation } = await callPython("/harmoniser", {
        contenu: segmentsGlobal.join("\n"),
      });
      segmentsGlobal = harmonisation.split("\n").filter((s) => s.trim());
      io.emit("segments", segmentsGlobal); // broadcast à tous
      socket.emit("harmonisation_ok", { success: true });
    } catch (e) {
      console.error("Erreur harmonisation:", e.message);
      socket.emit("harmonisation_ok", { success: false });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Déconnecté :", socket.id);
  });
});

// Lancement
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 API + WebSocket: http://localhost:${PORT}`);
});
