// TalkNow service: join + status + triage. Pure rules, no Express here (testable).
const { v4: uuid } = require("uuid");
const config = require("../../config");
const store = require("../../common/store");

function isTalkHours(date = new Date()) {
  // Compare in IST (UTC+5:30)
  const ist = new Date(date.getTime() + (5.5 * 60 + date.getTimezoneOffset()) * 60000);
  const h = ist.getHours();
  return h >= config.talkHours.start && h < config.talkHours.end;
}

function nextSlotIso() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000);
  ist.setHours(config.talkHours.start, 0, 0, 0);
  if (ist <= now) ist.setDate(ist.getDate() + 1);
  return ist.toISOString();
}

function join({ device_uuid, nickname, lang = "hi", gender_pref = null }) {
  if (!device_uuid) { const e = new Error("device_uuid required"); e.status = 400; throw e; }
  if (!["hi", "en"].includes(lang)) { const e = new Error("lang must be hi|en"); e.status = 400; throw e; }

  let dev = store.devices.get(device_uuid);
  if (!dev) {
    dev = { device_uuid, nickname: nickname || store.randomNickname(), lang, gender_pref, last_free_at: null, created_at: store.nowIso() };
    store.devices.set(device_uuid, dev);
  }
  // 1 free / 24h guard (mirrors Redis free:device:{uuid})
  if (dev.last_free_at) {
    const elapsed = (Date.now() - new Date(dev.last_free_at).getTime()) / 1000;
    if (elapsed < config.freeWindowSec) {
      const e = new Error("free limit");
      e.status = 429; e.code = "FREE_LIMIT";
      e.retry_after_sec = Math.ceil(config.freeWindowSec - elapsed);
      throw e;
    }
  }
  if (store.queue.length >= config.queueCap) {
    const e = new Error("queue full"); e.status = 429; e.code = "QUEUE_FULL"; throw e;
  }

  dev.nickname = nickname || dev.nickname || store.randomNickname();
  dev.lang = lang; dev.gender_pref = gender_pref;
  dev.last_free_at = store.nowIso();

  const case_id = uuid();
  const c = {
    id: case_id, anon_device_uuid: device_uuid, nickname: dev.nickname,
    lang, gender_pref, risk: "low", status: "queued",
    created_at: store.nowIso(), updated_at: store.nowIso(), session_id: null,
  };
  store.cases.set(case_id, c);
  store.queue.push(case_id);

  const online_count = store.listenersOnline.size || 1; // show 1 in dev so UI feels alive
  const position = store.queue.indexOf(case_id) + 1;
  const eta_min = Math.max(1, Math.ceil((position * 9) / online_count)); // avg 9m handle
  return { case_id, nickname: dev.nickname, position, online_count, eta_min, hours_open: isTalkHours(), next_slot: isTalkHours() ? null : nextSlotIso() };
}

function status(case_id) {
  const c = store.cases.get(case_id);
  if (!c) { const e = new Error("case not found"); e.status = 404; throw e; }
  const online_count = store.listenersOnline.size || 1;
  const position = store.queue.includes(case_id) ? store.queue.indexOf(case_id) + 1 : 0;
  const eta_min = position ? Math.max(1, Math.ceil((position * 9) / online_count)) : 0;
  return {
    case_id, status: c.status, position, online_count, eta_min,
    hours_open: isTalkHours(), next_slot: isTalkHours() ? null : nextSlotIso(),
    risk: c.risk, session_id: c.session_id,
    sos: [{ name: "Partner Helpline", phone: "1800-XXX-XXXX" }],
  };
}

// Triage: skippable, never blocks. high -> SOS path, no queue match.
function triage({ case_id, unsafe_self = "skip" }) {
  const c = store.cases.get(case_id);
  if (!c) { const e = new Error("case not found"); e.status = 404; throw e; }
  if (unsafe_self === "yes") {
    c.risk = "high"; c.updated_at = store.nowIso();
    // remove from queue: high-risk bypasses Uber-match
    const i = store.queue.indexOf(case_id);
    if (i >= 0) store.queue.splice(i, 1);
    return { action: "sos", helplines: [{ name: "Partner Helpline", phone: "1800-XXX-XXXX" }], auto_page: true };
  }
  c.risk = unsafe_self === "no" ? "low" : c.risk;
  c.updated_at = store.nowIso();
  return { action: "queue" };
}

module.exports = { join, status, triage, isTalkHours, nextSlotIso };
