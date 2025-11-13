// test_with_routes.js - Express + routes test
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(express.json());

// Test route
app.get("/api/projets", (req, res) => {
  res.json([{ id: 1, nomProjet: "Test" }]);
});

app.post("/api/projets", (req, res) => {
  res.json({ projet: { id: 2, nomProjet: req.body.nomProjet }, segments: [] });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3001", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
});
