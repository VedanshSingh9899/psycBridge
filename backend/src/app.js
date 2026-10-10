const express = require("express");
const talkNow = require("./modules/talk-now/routes");
const session = require("./modules/session/routes");

const app = express();
app.use(express.json({ limit: "32kb" }));

// CORS open for Phase 1 local dev (frontend/index.html -> localhost:3001)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/api/v1/health", (req, res) => res.json({ ok: true, phase: 1, scope: "talk-now", time: new Date().toISOString() }));

app.use("/api/v1/talk-now", talkNow);
app.use("/api/v1", session); // mounts /talk-now/accept, /session/:id/messages, /sessions/:id/end

// Minimal coordinator peek for Phase 1 testing (no auth yet)
app.get("/api/v1/coordinator/queue", (req, res) => {
  const store = require("./common/store");
  res.json({ queue_len: store.queue.length, online_listeners: [...store.listenersOnline.keys()], cases: store.queue.map((id) => store.cases.get(id)) });
});

// 404
app.use((req, res) => res.status(404).json({ code: "NOT_FOUND", message: req.path }));

module.exports = app;
