const express = require("express");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const DB_FILE = "./db.json";

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// LOGIN
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

// GET AVAILABLE SERVERS
app.get("/servers", (req, res) => {
  let db = loadDB();
  const available = db.servers.filter(s => s.status === "available");
  res.json(available);
});

// CLAIM SERVER
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

// ADMIN ADD SERVER
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

// ADMIN GET ALL SERVERS
app.get("/admin/servers", (req, res) => {
  const db = loadDB();
  res.json(db.servers);
});

// ADMIN RESET SERVER
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));