const express = require("express");
const svc = require("./service");
const router = express.Router();

// POST /api/v1/talk-now/join
router.post("/join", (req, res) => {
  try {
    res.json(svc.join(req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ code: e.code || "ERR", message: e.message, retry_after_sec: e.retry_after_sec });
  }
});

// GET /api/v1/talk-now/status?case_id=
router.get("/status", (req, res) => {
  try {
    res.json(svc.status(req.query.case_id));
  } catch (e) {
    res.status(e.status || 500).json({ code: "ERR", message: e.message });
  }
});

// POST /api/v1/talk-now/triage
router.post("/triage", (req, res) => {
  try {
    res.json(svc.triage(req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ code: "ERR", message: e.message });
  }
});

module.exports = router;
