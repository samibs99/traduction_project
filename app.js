const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const { deepseekChat } = require("./deepseek-node"); // ✅ Intégration DeepSeek

// Import des routes API existantes
const authRoutes = require("./routes/auth");
const projetRoutes = require("./routes/projet");

const PY_URL = "http://127.0.0.1:8000"; // Microservice FastAPI
const USE_DEEPSEEK = true; // 👉 Mets false si tu veux tester avec Python seulement

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

// --------- Endpoints IA côté Node (pour tests Postman ou Frontend) ---------
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
    const data = await callPython("/harmoniser", { segments });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur /harmoniser" });
  }
});

app.post("/api/ai/suggest", async (req, res) => {
  try {
    const { contenu, contexte } = req.body;
    const data = await callPython("/suggest", { contenu, contexte });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur /suggest" });
  }
});
app.post('/api/ai/traduire', async (req, res) => {
  try {
    const { texte, langue_cible, langue_source, consignes } = req.body;
    const data = await callPython('/traduire', { texte, langue_cible, langue_source, consignes });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur /traduire' });
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

  // 🔥 Suggestion IA (DeepSeek ou Python)
  socket.on("demander_suggestion", async ({ index }) => {
    try {
      const contenu = segmentsGlobal[index] ?? "";
      let suggestion = "";
      let contexte = "general";

      if (USE_DEEPSEEK) {
        suggestion = await deepseekChat([
          { role: "system", content: "Tu es un assistant de suggestion de traduction." },
          { role: "user", content: `Améliore ce segment : "${contenu}"` },
        ]);
        contexte = "deepseek";
      } else {
        const resp = await callPython("/suggest", { contenu });
        suggestion = resp.suggestion;
        contexte = resp.contexte;
      }

      socket.emit("suggestion_segment", { index, suggestion, contexte });
    } catch (e) {
      console.error("Erreur suggestion:", e.message);
      socket.emit("suggestion_segment", {
        index,
        suggestion: "",
        contexte: "erreur",
      });
    }
  });

  // 🔥 Harmonisation IA (DeepSeek ou Python)
  socket.on("demander_harmonisation", async () => {
    try {
      if (USE_DEEPSEEK) {
        const texteConcat = segmentsGlobal.join("\n");
        const reponse = await deepseekChat([
          { role: "system", content: "Tu es un assistant qui harmonise le style de traduction." },
          { role: "user", content: `Harmonise ce texte en segments clairs:\n${texteConcat}` },
        ]);
        segmentsGlobal = reponse.split("\n").filter((s) => s.trim());
      } else {
        const { segments } = await callPython("/harmoniser", {
          segments: segmentsGlobal,
        });
        segmentsGlobal = segments;
      }

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
