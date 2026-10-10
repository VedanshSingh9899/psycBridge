// Session service: listener accept + chat + end. Polling in Phase 1 (no sockets yet).
const { v4: uuid } = require("uuid");
const config = require("../../config");
const store = require("../../common/store");

function heartbeat(listener_id) {
  store.listenersOnline.set(listener_id, Date.now());
  // prune >90s stale
  for (const [id, t] of store.listenersOnline) {
    if (Date.now() - t > 90000) store.listenersOnline.delete(id);
  }
  return { online_count: store.listenersOnline.size, queue_len: store.queue.length };
}

function accept({ case_id, listener_id = "listener-1", channel = "chat" }) {
  const c = store.cases.get(case_id);
  if (!c) { const e = new Error("case not found"); e.status = 404; throw e; }
  if (c.risk === "high") { const e = new Error("high-risk: use SOS flow, not queue accept"); e.status = 409; throw e; }
  heartbeat(listener_id);
  const i = store.queue.indexOf(case_id);
  if (i >= 0) store.queue.splice(i, 1);
  c.status = "in_talk"; c.updated_at = store.nowIso();

  const session_id = uuid();
  store.sessions.set(session_id, {
    id: session_id, case_id, listener_id, channel,
    started_at: store.nowIso(), ended_at: null, duration_sec: null, helped_vote: null,
  });
  store.messages.set(session_id, []);
  c.session_id = session_id;
  return { session_id, alias: c.nickname, lang: c.lang, risk: c.risk, wrap_at_min: config.sessionWrapMin, close_at_min: config.sessionMaxMin };
}

function sendMessage(session_id, { sender, body }) {
  if (!store.sessions.has(session_id)) { const e = new Error("session not found"); e.status = 404; throw e; }
  if (!["seeker", "listener"].includes(sender)) { const e = new Error("sender must be seeker|listener"); e.status = 400; throw e; }
  if (!body || !String(body).trim()) { const e = new Error("empty body"); e.status = 400; throw e; }
  return store.pushMessage(session_id, sender, body);
}

function endSession(session_id, { helped_vote = null } = {}) {
  const s = store.sessions.get(session_id);
  if (!s) { const e = new Error("session not found"); e.status = 404; throw e; }
  s.ended_at = store.nowIso();
  s.duration_sec = Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 1000);
  if (helped_vote !== null) s.helped_vote = !!helped_vote;
  const c = store.cases.get(s.case_id);
  if (c) { c.status = "post_help"; c.updated_at = store.nowIso(); }
  // Phase 1 post-help offers (optional, never forced): reminder / account / rebook — client shows cards.
  return { session_id, duration_sec: s.duration_sec, helped_vote: s.helped_vote, next: ["reminder_optional", "create_account_optional", "book_again_optional"] };
}

module.exports = { heartbeat, accept, sendMessage, endSession };
