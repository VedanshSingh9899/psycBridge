// In-memory store for Phase 1. Mirrors Postgres tables 1:1 so swap is mechanical.
// Tables: devices, cases, sessions, messages (+ listenersOnline presence).
// Redis mapping: free:device -> devices.last_free_at, queue:talk-now -> queue[], listener:online -> listenersOnline.

const { v4: uuid } = require("uuid");

const devices = new Map();   // device_uuid -> { device_uuid, nickname, lang, gender_pref, last_free_at, created_at }
const cases = new Map();     // case_id -> { id, anon_device_uuid, nickname, lang, gender_pref, risk, status, position, created_at, updated_at, session_id }
const sessions = new Map();  // session_id -> { id, case_id, listener_id, channel, started_at, ended_at, duration_sec, helped_vote }
const messages = new Map();  // session_id -> [{ id, sender, body, created_at, expires_at }]
const queue = [];            // FIFO of case_ids (mirrors Redis LIST queue:talk-now)
const listenersOnline = new Map(); // listener_id -> lastHeartbeat (mirrors Redis listener:{id}:online)

function nowIso() { return new Date().toISOString(); }

function randomNickname() {
  const adj = ["Quiet", "Calm", "Soft", "Brave", "Kind", "Still"];
  const animal = ["Fox", "Deer", "Owl", "Finch", "Turtle", "Moth"];
  const n = Math.floor(Math.random() * 90 + 10);
  return adj[Math.floor(Math.random() * adj.length)] + animal[Math.floor(Math.random() * animal.length)] + n;
}

function pushMessage(session_id, sender, body) {
  const msg = {
    id: uuid(),
    sender,
    body: String(body).slice(0, 2000),
    created_at: nowIso(),
    expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
  };
  if (!messages.has(session_id)) messages.set(session_id, []);
  messages.get(session_id).push(msg);
  return msg;
}

function getMessages(session_id) {
  const now = Date.now();
  const list = (messages.get(session_id) || []).filter((m) => new Date(m.expires_at).getTime() > now);
  return list;
}

// Hourly sweeper: burn expired messages (mirrors burn_expired() in DesignER Sec 4).
setInterval(() => {
  for (const [sid, list] of messages) {
    const kept = list.filter((m) => new Date(m.expires_at).getTime() > Date.now());
    if (kept.length) messages.set(sid, kept);
    else messages.delete(sid);
  }
}, 3600 * 1000).unref();

module.exports = {
  devices, cases, sessions, messages, queue, listenersOnline,
  nowIso, randomNickname, pushMessage, getMessages,
};
