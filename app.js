// app.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
// Import des routes API existantes
const authRoutes = require("./routes/auth");
const projetRoutes = require("./routes/projet");
const utilisateurRoutes = require("./routes/utilisateur");

const PY_URL = process.env.PY_URL || null; // optional configured Microservice FastAPI
const PY_CANDIDATES = PY_URL ? [PY_URL] : ["http://127.0.0.1:8001", "http://127.0.0.1:8000"]; // try these if no env
const app = express();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// CORS: allow frontend origins in development
const devAllowedOrigins = ["http://localhost:3000", "http://localhost:3001"];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && devAllowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      // in production, you may want to restrict
      if (process.env.NODE_ENV === 'production') {
        // adjust the allowed origin in production as needed
        return callback(new Error('CORS not allowed'), false);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

// Simple request logger for debugging route issues
app.use((req, res, next) => {
  try {
    console.log(`[req] ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || '-'} - Auth: ${req.headers.authorization ? 'yes' : 'no'}`);
  } catch (e) {
    // ignore logging errors
  }
  next();
});

// Routes API existantes
app.use("/api/auth", authRoutes);
app.use("/api/projets", projetRoutes);
app.use("/api/utilisateurs", utilisateurRoutes);

// Debug: list mounted routes (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/__debug/routes', (req, res) => {
    try {
      const out = [];
      const stack = app._router && app._router.stack ? app._router.stack : [];
      stack.forEach((layer) => {
        if (layer.route && layer.route.path) {
          out.push({ type: 'route', path: layer.route.path, methods: Object.keys(layer.route.methods) });
        } else if (layer.name === 'router' && layer.regexp) {
          // router mounted via app.use; layer.regexp describes the mount path
          const mount = layer.regexp && layer.regexp.source ? layer.regexp.source : String(layer.regexp);
          // list child routes
          const children = [];
          const childStack = layer.handle && layer.handle.stack ? layer.handle.stack : [];
          childStack.forEach((ch) => {
            if (ch.route && ch.route.path) {
              children.push({ path: ch.route.path, methods: Object.keys(ch.route.methods) });
            }
          });
          out.push({ type: 'router', mount: mount, children });
        }
      });
      res.json({ routes: out });
    } catch (e) {
      res.status(500).json({ error: 'Impossible de lister les routes', details: String(e) });
    }
  });
}

// --------- Helpers HTTP vers Python ---------
async function callPython(path, payload) {
  let lastErr = null;
  for (const base of PY_CANDIDATES) {
    const url = `${base.replace(/\/$/, '')}${path}`;
    try {
      const { data } = await axios.post(url, payload, { timeout: 7000 });
      return data;
    } catch (e) {
      lastErr = e;
      console.warn(`callPython failed for ${url}:`, e.message || e);
      // try next
    }
  }
  // if all candidates failed, throw error
  throw lastErr || new Error('No Python endpoints configured');
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
    console.error('Error /api/ai/harmoniser:', e);
    const errMsg = e?.response?.data?.detail || e?.response?.data || e?.message || String(e);
    res.status(500).json({ message: "Erreur /harmoniser", detail: errMsg });
  }
});

app.post("/api/ai/suggest", async (req, res) => {
  try {
    const { contenu, consignes } = req.body;
    const data = await callPython("/suggest", { contenu, consignes });
    res.json(data);
  } catch (e) {
    console.error('Error /api/ai/suggest:', e);
    const errMsg = e?.response?.data?.detail || e?.response?.data || e?.message || String(e);
    res.status(500).json({ message: "Erreur /suggest", detail: errMsg });
  }
});

app.post("/api/ai/traduire", async (req, res) => {
  try {
    const { texte, langue_cible, langue_source, consignes } = req.body;
    const data = await callPython("/traduire", { texte, langue_cible, langue_source, consignes });
    res.json(data);
  } catch (e) {
    console.error('Error /api/ai/traduire:', e);
    const errMsg = e?.response?.data?.detail || e?.response?.data || e?.message || String(e);
    res.status(500).json({ message: "Erreur /traduire", detail: errMsg });
  }
});
// Évaluation automatique BLEU / COMET
app.post("/api/ai/evaluer", async (req, res) => {
  try {
    const { reference, hypothesis } = req.body;
    if (!reference || !hypothesis) {
      return res.status(400).json({ message: "Reference et hypothesis sont requis" });
    }
    const data = await callPython("/evaluer", { reference, hypothesis });
    res.json(data);
  } catch (e) {
    console.error("Erreur /evaluer:", e.message);
    res.status(500).json({ message: "Erreur lors de l'évaluation" });
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
const PORT = process.env.PORT || 3000;
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
server.listen(PORT, () => {
  console.log(`🚀 API + WebSocket: http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('Listen error:', err);
  process.exit(1);
});