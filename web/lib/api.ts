// Typed client for the Phase 1 psycBridge API (see docs/API.md).
// Base URL is baked in at build time via NEXT_PUBLIC_API_URL.
// Defaults to the local backend: http://localhost:3000/api/v1

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(
      (body as { message?: string }).message || `Request failed (${r.status})`,
    ) as Error & { status: number; code?: string; body: unknown };
    err.status = r.status;
    err.code = (body as { code?: string }).code;
    err.body = body;
    throw err;
  }
  return body as T;
}

export interface JoinRes {
  case_id: string;
  nickname: string;
  position: number;
  online_count: number;
  eta_min: number;
  hours_open: boolean;
  next_slot?: string;
}

export interface StatusRes {
  case_id: string;
  status: 'queued' | 'in_talk' | 'post_help';
  position: number;
  online_count: number;
  eta_min: number;
  hours_open: boolean;
  next_slot?: string;
  risk?: string;
  session_id?: string | null;
  sos?: { name: string; phone: string }[];
}

export interface TriageRes {
  action: 'sos' | 'queue';
  helplines?: { name: string; phone: string }[];
  auto_page?: boolean;
}

export interface AcceptRes {
  session_id: string;
  alias: string;
  lang: string;
  risk: string;
  wrap_at_min: number;
  close_at_min: number;
}

export interface QueueCase {
  id: string;
  nickname: string;
  lang: string;
  risk: string;
  status: string;
  created_at: string;
  session_id?: string | null;
}

export interface QueueRes {
  queue_len: number;
  online_listeners: string[];
  cases: QueueCase[];
}

export interface ChatMsg {
  id: string;
  sender: string;
  body: string;
  created_at: string;
  expires_at?: string;
}

export const api = {
  join: (p: { device_uuid: string; nickname?: string; lang: string }) =>
    req<JoinRes>('/talk-now/join', { method: 'POST', body: JSON.stringify(p) }),
  status: (case_id: string) =>
    req<StatusRes>(`/talk-now/status?case_id=${encodeURIComponent(case_id)}`),
  triage: (p: { case_id: string; unsafe_self: 'yes' | 'no' | 'skip' }) =>
    req<TriageRes>('/talk-now/triage', { method: 'POST', body: JSON.stringify(p) }),
  // NOTE path quirk: mounted on the session router but keeps /talk-now/… path
  accept: (p: { case_id: string; listener_id: string }) =>
    req<AcceptRes>('/talk-now/accept', { method: 'POST', body: JSON.stringify(p) }),
  availability: (listener_id: string) =>
    req<{ online_count: number; queue_len: number }>('/availability', {
      method: 'POST',
      body: JSON.stringify({ listener_id }),
    }),
  getMessages: (session_id: string) =>
    req<{ session_id: string; messages: ChatMsg[] }>(`/session/${session_id}/messages`),
  // NOTE singular /session for messages, plural /sessions for end
  postMessage: (p: { session_id: string; sender: 'seeker' | 'listener'; body: string }) =>
    req<unknown>(`/session/${p.session_id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ sender: p.sender, body: p.body }),
    }),
  endSession: (p: { session_id: string; helped_vote?: boolean }) =>
    req<{ session_id: string; duration_sec: number }>(`/sessions/${p.session_id}/end`, {
      method: 'POST',
      body: JSON.stringify(p.helped_vote === undefined ? {} : { helped_vote: p.helped_vote }),
    }),
  queue: () => req<QueueRes>('/coordinator/queue'),
};

export function friendlyJoinError(err: { code?: string; body?: unknown; message: string }) {
  if (err.code === 'FREE_LIMIT') {
    const secs = (err.body as { retry_after_sec?: number } | undefined)?.retry_after_sec;
    const hrs = secs ? Math.ceil(secs / 3600) : 24;
    return `One free chat per day. Try again in ~${hrs}h (or test with a fresh browser profile).`;
  }
  return err.message;
}

/** Stable per-browser id for the 24h free-chat guard. */
export function getDeviceUuid(): string {
  if (typeof window === 'undefined') return 'ssr';
  let v = localStorage.getItem('pb_device_uuid');
  if (!v) {
    v = 'browser-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('pb_device_uuid', v);
  }
  return v;
}

export function waitMinOf(created_at?: string): number {
  if (!created_at) return 0;
  return (Date.now() - new Date(created_at).getTime()) / 60000;
}

export function timeAgo(iso?: string): string {
  if (!iso) return '?';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}
