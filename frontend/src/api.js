// Tiny wrapper over the Phase 1 REST API (see docs/API.md).
// Base defaults to localhost:3000 (backend/src/config.js). Override with:
//   VITE_API_URL=http://localhost:3001/api/v1 npm run dev

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

async function req(path, opts = {}) {
  const r = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(body.message || `Request failed (${r.status})`);
    err.status = r.status;
    err.code = body.code;
    err.body = body;
    throw err;
  }
  return body;
}

export const api = {
  health: () => req("/health"),
  join: ({ device_uuid, nickname, lang }) =>
    req("/talk-now/join", {
      method: "POST",
      body: JSON.stringify({ device_uuid, nickname, lang }),
    }),
  status: (case_id) =>
    req(`/talk-now/status?case_id=${encodeURIComponent(case_id)}`),
  triage: ({ case_id, unsafe_self }) =>
    req("/talk-now/triage", {
      method: "POST",
      body: JSON.stringify({ case_id, unsafe_self }),
    }),
  // NOTE path quirk: mounted on session router but keeps /talk-now/… path
  accept: ({ case_id, listener_id }) =>
    req("/talk-now/accept", {
      method: "POST",
      body: JSON.stringify({ case_id, listener_id }),
    }),
  availability: (listener_id) =>
    req("/availability", {
      method: "POST",
      body: JSON.stringify({ listener_id }),
    }),
  getMessages: (session_id) => req(`/session/${session_id}/messages`),
  // NOTE singular /session for messages, plural /sessions for end
  postMessage: ({ session_id, sender, body }) =>
    req(`/session/${session_id}/messages`, {
      method: "POST",
      body: JSON.stringify({ sender, body }),
    }),
  endSession: ({ session_id, helped_vote }) =>
    req(`/sessions/${session_id}/end`, {
      method: "POST",
      body: JSON.stringify(
        helped_vote === undefined ? {} : { helped_vote }
      ),
    }),
  queue: () => req("/coordinator/queue"),
};

export function friendlyJoinError(err) {
  if (err.code === "FREE_LIMIT") {
    const hrs = err.body?.retry_after_sec
      ? Math.ceil(err.body.retry_after_sec / 3600)
      : 24;
    return `One free chat per day. Try again in ~${hrs}h (or test with a fresh browser profile).`;
  }
  return err.message;
}
