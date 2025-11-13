// test_simple_server.js - minimal Express + Socket.io server
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3001", methods: ["GET", "POST"] },
});

console.log('Setting up socket.io...');
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

console.log('Starting server...');
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✓ Server listening on port ${PORT}`);
});

setTimeout(() => {
  console.log('Server is running. Press Ctrl+C to stop.');
}, 100);
