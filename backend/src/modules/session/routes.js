const express = require("express");
const svc = require("./service");
const store = require("../../common/store");
const router = express.Router();

// Listener presence heartbeat (Phase 1, no auth yet — Phase 2 adds OTP JWT)
router.post("/availability", (req, res) => {
  res.json(svc.heartbeat(req.body?.listener_id || "listener-1"));
});

// POST /api/v1/talk-now/accept  (kept under talk-now path for spec compat, handled here)
router.post("/talk-now/accept", (req, res) => {
  try {
    res.json(svc.accept(req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ code: "ERR", message: e.message });
  }
});

router.get("/session/:id/messages", (req, res) => {
  res.json({ session_id: req.params.id, messages: store.getMessages(req.params.id) });
});

router.post("/session/:id/messages", (req, res) => {
  try {
    res.json(svc.sendMessage(req.params.id, req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ code: "ERR", message: e.message });
  }
});

router.post("/sessions/:id/end", (req, res) => {
  try {
    res.json(svc.endSession(req.params.id, req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ code: "ERR", message: e.message });
  }
});

module.exports = router;
