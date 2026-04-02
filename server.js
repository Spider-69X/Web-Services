const express = require("express");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(express.json());

// Serve all files from the root folder
app.use(express.static(__dirname));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Database file
const DB_FILE = path.join(__dirname, "db.json");

// Load DB
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

// Save DB
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// -------------------
// User Login
// -------------------
app.post("/login", (req, res) => {
  const { username } = req.body;
  let db = loadDB();

  let user = db.users.find(u => u.username === username);
  if (!user) {
    user = { id: uuidv4(), username, hasServer: false };
    db.users.push(user);
    saveDB(db);
  }

  res.json(user);
});

// -------------------
// Get Available Servers
// -------------------
app.get("/servers", (req, res) => {
  let db = loadDB();
  const available = db.servers.filter(s => s.status === "available");
  res.json(available);
});

// -------------------
// Claim Server
// -------------------
app.post("/claim", (req, res) => {
  const { userId } = req.body;
  let db = loadDB();

  let user = db.users.find(u => u.id === userId);
  if (!user) return res.json({ error: "User not found" });
  if (user.hasServer) return res.json({ error: "You already claimed a server" });

  let server = db.servers.find(s => s.status === "available");
  if (!server) return res.json({ error: "No servers available" });

  server.status = "claimed";
  server.claimedBy = userId;
  user.hasServer = true;

  saveDB(db);

  res.json({
    panelUrl: server.panelUrl,
    username: server.username,
    password: server.password
  });
});

// -------------------
// Admin Add Server
// -------------------
app.post("/admin/add-server", (req, res) => {
  const { panelUrl, username, password, ram, cpu, type } = req.body;
  let db = loadDB();

  db.servers.push({
    id: uuidv4(),
    panelUrl,
    username,
    password,
    ram,
    cpu,
    type,
    status: "available",
    claimedBy: null
  });

  saveDB(db);
  res.json({ success: true });
});

// -------------------
// Admin Get All Servers
// -------------------
app.get("/admin/servers", (req, res) => {
  const db = loadDB();
  res.json(db.servers);
});

// -------------------
// Admin Reset Server
// -------------------
app.post("/admin/reset-server", (req, res) => {
  const { id } = req.body;
  const db = loadDB();
  const server = db.servers.find(s => s.id === id);
  if (!server) return res.json({ error: "Server not found" });

  server.status = "available";
  server.claimedBy = null;
  saveDB(db);

  res.json({ success: true });
});

// -------------------
// Catch-all 404
// -------------------
app.get("*", (req, res) => {
  res.status(404).send("Page not found");
});

// -------------------
// Start Server
// -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
