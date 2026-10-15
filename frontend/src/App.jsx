import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, api, friendlyJoinError } from "./api.js";
import Navbar from "./components/Navbar.jsx";

function uid(prefix) {
  return `${prefix}-` + Math.random().toString(36).slice(2, 9);
}

function useDeviceId() {
  const ref = useRef(null);
  if (!ref.current) ref.current = uid("browser");
  return ref.current;
}

// ---------- shared bits ----------

function Chat({ messages, input, setInput, onSend, role }) {
  const boxRef = useRef(null);
  useEffect(() => {
    boxRef.current?.scrollTo(0, boxRef.current.scrollHeight);
  }, [messages]);
  return (
    <>
      <div className="chatbox" ref={boxRef}>
        {(messages || []).length === 0 && (
          <div className="small dim">No messages yet. Say hi — take your time.</div>
        )}
        {(messages || []).map((m) => (
          <div
            key={m.id ?? `${m.sender}-${m.created_at}-${m.body}`}
            className={`bubble ${m.sender === role ? "me" : "them"}`}
          >
            {m.body}
          </div>
        ))}
      </div>
      <form
        className="chatrow"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type here…"
          maxLength={2000}
        />
        <button type="submit" aria-label="send">➤</button>
      </form>
    </>
  );
}

// ---------- seeker flow ----------

function Seeker({ deviceUuid }) {
  const [step, setStep] = useState("join"); // join|triage|queue|sos|chat|done
  const [nick, setNick] = useState("");
  const [lang, setLang] = useState("hi");
  const [err, setErr] = useState("");
  const [caseId, setCaseId] = useState(null);
  const [queue, setQueue] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [voteMsg, setVoteMsg] = useState("");

  const join = async () => {
    setErr("");
    try {
      const j = await api.join({
        device_uuid: deviceUuid,
        nickname: nick.trim() || undefined,
        lang,
      });
      setCaseId(j.case_id);
      setStep("triage");
    } catch (e) {
      setErr(friendlyJoinError(e));
    }
  };

  const triage = async (v) => {
    setErr("");
    try {
      const j = await api.triage({ case_id: caseId, unsafe_self: v });
      if (j.action === "sos") setStep("sos");
      else setStep("queue");
    } catch (e) {
      setErr(e.message);
    }
  };

  // poll queue → wait for session_id
  useEffect(() => {
    if (step !== "queue" || !caseId) return;
    let stop = false;
    const tick = async () => {
      try {
        const s = await api.status(caseId);
        if (stop) return;
        setQueue(s);
        if (s.session_id) {
          setSessionId(s.session_id);
          setStartedAt(Date.now());
          setStep("chat");
        }
      } catch (e) {
        if (!stop) setErr(e.message);
      }
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [step, caseId]);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const j = await api.getMessages(sessionId);
      setMessages(j.messages || []);
    } catch {
      /* polling — ignore transient errors */
    }
  }, [sessionId]);

  useEffect(() => {
    if (step !== "chat") return;
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [step, refresh]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !sessionId) return;
    setDraft("");
    try {
      await api.postMessage({ session_id: sessionId, sender: "seeker", body });
      refresh();
    } catch (e) {
      setErr(e.message);
    }
  };

  const end = async (helped_vote) => {
    try {
      await api.endSession({ session_id: sessionId, helped_vote });
      if (helped_vote !== undefined) {
        setVoteMsg(
          helped_vote
            ? "Glad it helped a little. Come back anytime 7–11pm."
            : "Thanks for telling us. Try a follow-up chat tomorrow."
        );
      }
      setStep("done");
    } catch (e) {
      setErr(e.message);
    }
  };

  const minsLeft = startedAt
    ? Math.max(0, 10 - (Date.now() - startedAt) / 60000)
    : 10;

  return (
    <div>
      {err && <div className="err">{err}</div>}

      {step === "join" && (
        <div className="card">
          <div className="eyebrow">Seeker · /seeker</div>
          <h2>Someone is waiting for you.</h2>
          <p className="small">No login. No OTP. No name needed. Just tap below — 8–10 min, free. Hindi / English.</p>
          <button className="big" onClick={join}>Talk Now · Free 8 min</button>
          <div className="row">
            <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Nickname (auto)" />
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="hi">हिंदी</option>
              <option value="en">English</option>
            </select>
          </div>
          <p className="small">Alias only, in-app chat, nothing on call log.{" "}
            <button className="link" onClick={() => setStep("sos")}>Emergency? SOS</button>
          </p>
        </div>
      )}

      {step === "triage" && (
        <div className="card">
          <h3>Quick check (you can skip)</h3>
          <p className="small">Are you feeling unsafe with yourself right now?</p>
          <button className="chip danger" onClick={() => triage("yes")}>Yes</button>
          <button className="chip" onClick={() => triage("no")}>No</button>
          <button className="chip" onClick={() => triage("skip")}>Skip →</button>
        </div>
      )}

      {step === "queue" && (
        <div className="card center">
          <div className="bign">💬</div>
          <div className="human">
            {queue
              ? `${queue.online_count} listener(s) online • ~${queue.eta_min} min wait`
              : "Finding someone…"}
          </div>
          <div className="small">
            {queue?.position ? `You are #${queue.position} in line. Stay here, we will connect you.` : "Connecting…"}
            {queue?.hours_open === false && " (Outside 7–11pm, next slot soon)"}
          </div>
          <button className="ghost" onClick={() => alert("Noted. Reminder at 7pm tomorrow (demo).")}>
            Book for later instead
          </button>
        </div>
      )}

      {step === "sos" && (
        <div className="sos">
          <b>You matter. Get human help now:</b>
          <p>📞 Partner Helpline: <b>1800-XXX-XXXX</b> (24×7)<br />A supervised listener has been paged. Stay on this screen.</p>
          <button className="ghost" onClick={() => { setStep("join"); setErr(""); }}>Back to Talk Now</button>
        </div>
      )}

      {step === "chat" && (
        <div className="card">
          <div className="timer">
            {minsLeft <= 2 ? `Wrapping up… ${minsLeft.toFixed(0)} min left` : `${minsLeft.toFixed(0)} min left`}
          </div>
          <Chat messages={messages} input={draft} setInput={setDraft} onSend={send} role="seeker" />
          <button className="ghost" onClick={() => end(undefined)}>End chat</button>
        </div>
      )}

      {step === "done" && (
        <div className="card">
          <h3>Did this help a little?</h3>
          {voteMsg && <p className="small">{voteMsg}</p>}
          <div className="vote">
            <button className="yes" onClick={() => end(true)}>👍 Yes</button>
            <button className="no" onClick={() => end(false)}>👎 Not really</button>
          </div>
          <button className="opt" onClick={() => alert("Reminder set (demo). Real SMS comes in Phase 2.)")}>⏰ Remind me tomorrow 7pm (optional)</button>
          <button className="opt" onClick={() => alert("Account save comes after pilot.")}>💾 Save this chat (optional)</button>
          <button className="opt" onClick={() => window.location.reload()}>🔄 Talk again / new session</button>
        </div>
      )}
    </div>
  );
}

// ---------- listener desk (V1 per docs/frontend/listener.md) ----------

function timeAgo(iso) {
  if (!iso) return "?";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// local-only helpers (Phase 1: backend has no clients/schedule/followup endpoints yet)
function lsGet(k, fb) {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? fb;
  } catch {
    return fb;
  }
}
function lsSet(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
}
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function waitMinOf(c) {
  return (Date.now() - new Date(c.created_at).getTime()) / 60000;
}

function Listener({ section = "desk" }) {
  const [listenerId, setListenerId] = useState(
    () => localStorage.getItem("pb_listener_id") || ""
  );
  const [loggedIn, setLoggedIn] = useState(
    () => !!localStorage.getItem("pb_listener_id")
  );
  // availability: "available" | "full" | "paused"
  const [avail, setAvail] = useState("full");
  const [queue, setQueue] = useState({ queue_len: 0, online_listeners: [], cases: [] });
  const [sessionId, setSessionId] = useState(null);
  const [peer, setPeer] = useState(null); // {alias, lang, risk}
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  // after-session + wellbeing (local-only in Phase 1)
  const [showAfter, setShowAfter] = useState(false);
  const [notes, setNotes] = useState("");
  const [streak, setStreak] = useState(
    () => Number(localStorage.getItem("pb_listener_streak") || 0)
  );
  const [total, setTotal] = useState(
    () => Number(localStorage.getItem("pb_listener_total") || 0)
  );
  const [breatherUntil, setBreatherUntil] = useState(null);
  // P0-2 my clients (owned, alias-only) · P0-4 schedule · P0-7 seen aliases
  const [clients, setClients] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [space, setSpace] = useState(5);
  const [seen, setSeen] = useState([]);
  const [skipped, setSkipped] = useState({}); // caseId -> snoozeUntil (skip = aside, never dropped)
  const [supPingAt, setSupPingAt] = useState(null);
  const [recap, setRecap] = useState({ chats: 0, followups: 0, sos: 0 });

  const lid = () => listenerId || "listener-1";
  // OTP login (per docs: OTP once, stay logged in; demo code + name-only bypass)
  const DEMO_OTP = "123456";
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const sendOtp = () => {
    if (phone.replace(/\D/g, "").length < 10) {
      setErr("Enter a valid 10-digit phone number.");
      return;
    }
    setErr("");
    setOtpSent(true);
  };
  const verifyOtp = () => {
    if (otp.trim() === DEMO_OTP) {
      const id = listenerId.trim() || "listener-1";
      localStorage.setItem("pb_listener_id", id);
      localStorage.setItem("pb_listener_phone", phone);
      setListenerId(id);
      setLoggedIn(true);
      setAvail("available");
      setErr("");
    } else {
      setErr("Wrong code. Demo code is 123456.");
    }
  };
  const demoBypass = () => {
    localStorage.setItem("pb_listener_id", "listener-1");
    setListenerId("listener-1");
    setLoggedIn(true);
    setAvail("available");
    setErr("");
  };

  // load per-listener local state on login
  useEffect(() => {
    if (!loggedIn) return;
    const id = lid();
    setClients(lsGet(`pb_clients_${id}`, []));
    setFollowups(lsGet(`pb_followups_${id}`, []));
    setSpace(lsGet(`pb_space_${id}`, 5));
    setSeen(lsGet(`pb_seen_${id}`, []));
    setRecap(lsGet(`pb_recap_${id}_${todayKey()}`, { chats: 0, followups: 0, sos: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const online = avail === "available";

  const logout = () => {
    localStorage.removeItem("pb_listener_id");
    setLoggedIn(false);
    setAvail("full");
    setSessionId(null);
    setOtpSent(false);
    setOtp("");
  };

  const refreshQueue = useCallback(async () => {
    try {
      const q = await api.queue();
      // P0-3 priority auto-sort: high-risk first, then stuck (>15m wait),
      // then longest waiting. No manual sorting.
      const cases = [...(q.cases || [])].sort((a, b) => {
        const rank = (c) => (c.risk === "high" ? 0 : waitMinOf(c) > 15 ? 1 : 2);
        return rank(a) - rank(b) || new Date(a.created_at) - new Date(b.created_at);
      });
      setQueue({ ...q, cases });
      return { ...q, cases };
    } catch (e) {
      setErr(e.message);
      return null;
    }
  }, []);

  // heartbeat while Available (backend prunes >90s, so stopping = going Full)
  useEffect(() => {
    if (!loggedIn || !online) return;
    const id = listenerId || "listener-1";
    api.availability(id).catch(() => {});
    const t = setInterval(() => {
      api.availability(id).catch(() => {});
      refreshQueue();
    }, 30000);
    refreshQueue();
    const q = setInterval(refreshQueue, 5000);
    return () => {
      clearInterval(t);
      clearInterval(q);
    };
  }, [loggedIn, online, listenerId, refreshQueue]);

  // also poll queue when Full/Paused so counts stay fresh (no heartbeat)
  useEffect(() => {
    if (!loggedIn || online) return;
    refreshQueue();
    const q = setInterval(refreshQueue, 8000);
    return () => clearInterval(q);
  }, [loggedIn, online, refreshQueue]);

  // chat polling
  const refreshChat = useCallback(async () => {
    if (!sessionId) return;
    try {
      const j = await api.getMessages(sessionId);
      setMessages(j.messages || []);
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    refreshChat();
    const t = setInterval(refreshChat, 2000);
    return () => clearInterval(t);
  }, [sessionId, refreshChat]);

  // timer tick
  useEffect(() => {
    if (!sessionId) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sessionId]);

  const acceptCase = async (caseId) => {
    setErr("");
    if (!online) {
      setErr("Go Available first — Full means hidden from routing.");
      return;
    }
    if (breatherUntil && Date.now() < breatherUntil) {
      setErr("Auto-breather: paused. Take a breath.");
      return;
    }
    try {
      const j = await api.accept({
        case_id: caseId,
        listener_id: listenerId || "listener-1",
      });
      setSessionId(j.session_id);
      setPeer({ alias: j.alias, lang: j.lang, risk: j.risk });
      setMessages([]);
      setStartedAt(Date.now());
      setShowAfter(false);
      setNotes("");
      setSupPingAt(null);
      // P0-2 own the client (alias + lang + risk + last contact, hop 0 in Phase 1)
      const id = lid();
      const nowIso = new Date().toISOString();
      const cls = lsGet(`pb_clients_${id}`, []);
      const i = cls.findIndex((c) => c.alias === j.alias);
      if (i >= 0) cls[i] = { ...cls[i], lang: j.lang, risk: j.risk, lastContact: nowIso };
      else cls.unshift({ alias: j.alias, lang: j.lang, risk: j.risk, lastContact: nowIso, hops: 0 });
      lsSet(`pb_clients_${id}`, cls.slice(0, 30));
      setClients(cls.slice(0, 30));
      // P0-7 returning detection
      if (!lsGet(`pb_seen_${id}`, []).includes(j.alias)) {
        const s = [...lsGet(`pb_seen_${id}`, []), j.alias];
        lsSet(`pb_seen_${id}`, s);
        setSeen(s);
      }
    } catch (e) {
      setErr(e.message);
    }
  };

  // Skip = aside for 60s, back to head after. Never dropped (backend untouched).
  const skipCase = (caseId) => {
    setSkipped((s) => ({ ...s, [caseId]: Date.now() + 60000 }));
  };

  const visibleCases = (queue.cases || []).sort((a, b) => {
    const sa = (skipped[a.id] || 0) > Date.now() ? 1 : 0;
    const sb = (skipped[b.id] || 0) > Date.now() ? 1 : 0;
    return sa - sb;
  });

  const acceptNext = async () => {
    const q = await refreshQueue();
    const next = (q?.cases || []).find((c) => (skipped[c.id] || 0) <= Date.now());
    if (!next) {
      alert("Nobody waiting right now. Stay Available.");
      return;
    }
    acceptCase(next.id);
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !sessionId) return;
    setDraft("");
    try {
      await api.postMessage({ session_id: sessionId, sender: "listener", body });
      refreshChat();
    } catch (e) {
      setErr(e.message);
    }
  };

  const end = async () => {
    if (!sessionId) return;
    try {
      await api.endSession({ session_id: sessionId });
      const id = lid();
      const n = total + 1;
      const s = streak + 1;
      setTotal(n);
      setStreak(s);
      localStorage.setItem("pb_listener_total", String(n));
      localStorage.setItem("pb_listener_streak", String(s));
      // last contact + daily recap (side quest: night recap reads this)
      const nowIso = new Date().toISOString();
      const cls = lsGet(`pb_clients_${id}`, []).map((c) =>
        c.alias === peer?.alias ? { ...c, lastContact: nowIso } : c
      );
      lsSet(`pb_clients_${id}`, cls);
      setClients(cls);
      const rk = `pb_recap_${id}_${todayKey()}`;
      const rc = { ...lsGet(rk, { chats: 0, followups: 0, sos: 0 }), chats: lsGet(rk, { chats: 0, followups: 0, sos: 0 }).chats + 1 };
      if (peer?.risk === "high") rc.sos += 1;
      lsSet(rk, rc);
      setRecap(rc);
      setShowAfter(true);
      setSessionId(null);
      setMessages([]);
      // auto-breather after 3 in a row
      if (s >= 3) {
        setAvail("paused");
        setBreatherUntil(Date.now() + 10 * 60 * 1000);
        setStreak(0);
        localStorage.setItem("pb_listener_streak", "0");
      }
    } catch (e) {
      setErr(e.message);
    }
  };

  // P0-6 offer follow-up → real booking (local in Phase 1, feeds Schedule)
  const offerFollowup = () => {
    const id = lid();
    const f = lsGet(`pb_followups_${id}`, []);
    f.unshift({ alias: peer?.alias || "seeker", slot: "tomorrow 7pm", at: new Date().toISOString(), done: false });
    lsSet(`pb_followups_${id}`, f.slice(0, 20));
    setFollowups(f.slice(0, 20));
    const rk = `pb_recap_${id}_${todayKey()}`;
    const rc = { ...lsGet(rk, { chats: 0, followups: 0, sos: 0 }) };
    rc.followups += 1;
    lsSet(rk, rc);
    setRecap(rc);
    setShowAfter(false);
  };

  const pingSupervisor = () => {
    const id = lid();
    setSupPingAt(Date.now());
    const rk = `pb_recap_${id}_${todayKey()}`;
    const rc = { ...lsGet(rk, { chats: 0, followups: 0, sos: 0 }) };
    rc.sos += 1;
    lsSet(rk, rc);
    setRecap(rc);
  };

  const saveNotes = () => {
    // private end-notes: local only, never sent to seeker/backend in Phase 1
    const key = `pb_notes_${listenerId || "listener-1"}`;
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    prev.push({ at: new Date().toISOString(), alias: peer?.alias, text: notes });
    localStorage.setItem(key, JSON.stringify(prev));
    setNotes("");
    alert("Saved privately (only you see this).");
  };

  if (!loggedIn) {
    return (
      <div className="card">
        <div className="eyebrow">Pro login · /login</div>
        <h3>Listener login</h3>
        <p className="small">OTP once, stay logged in. Supervised volunteers only · Alias always · Talk Hours 7–11pm.</p>
        {err && <div className="err">{err}</div>}
        {!otpSent ? (
          <>
            <div className="row">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (10-digit)"
                inputMode="numeric"
                maxLength={13}
              />
            </div>
            <div className="row">
              <input
                value={listenerId}
                onChange={(e) => setListenerId(e.target.value)}
                placeholder="Display name (e.g. listener-1)"
              />
            </div>
            <button className="big sm" onClick={sendOtp}>Send OTP →</button>
            <button className="link" onClick={demoBypass}>
              demo: skip OTP, continue as listener-1
            </button>
          </>
        ) : (
          <>
            <p className="small">Code sent to {phone} (demo code: <b>{DEMO_OTP}</b>).</p>
            <div className="row">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                maxLength={6}
                onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
              />
              <button className="chip primary" onClick={verifyOtp}>Verify →</button>
            </div>
            <button className="link" onClick={() => { setOtpSent(false); setOtp(""); }}>
              ← wrong number? go back
            </button>
          </>
        )}
        <p className="small">Talk Hours 7–11pm • No name/photo/phone ever shown to seekers.</p>
      </div>
    );
  }

  const minsLeft = startedAt
    ? Math.max(0, 10 - (now - startedAt) / 60000)
    : 10;
  const wrapping = sessionId && minsLeft <= 2;
  // active session / after-screen always takes over, whatever page the nav shows
  const focus = sessionId || showAfter ? "desk" : section;

  return (
    <div>
      {err && <div className="err">{err}</div>}

      {/* 1. availability switch */}
      <div className="card">
        <div className="deskhead">
          <div>
            <h3>Hi, {listenerId} 👋</h3>
            <div className="small">Volunteer desk • Talk Hours 7–11pm</div>
          </div>
          <button className="link" onClick={logout}>logout</button>
        </div>
        <div className="availrow">
          {["available", "paused", "full"].map((v) => (
            <button
              key={v}
              className={`avail ${avail === v ? "on " + v : ""}`}
              onClick={() => {
                setAvail(v);
                if (v === "available") {
                  setBreatherUntil(null);
                  api.availability(listenerId || "listener-1").catch(() => {});
                }
              }}
            >
              {v === "available" ? "🟢 Available" : v === "paused" ? "⏸ Paused" : "🔴 Full"}
            </button>
          ))}
        </div>
        {avail === "full" && (
          <div className="small">Full = hidden from routing. Rest, you earned it.</div>
        )}
        {avail === "paused" && (
          <div className="small">
            Paused — queue can see you but no auto-assign.
            {breatherUntil && Date.now() < breatherUntil &&
              ` Back in ${Math.ceil((breatherUntil - Date.now()) / 60000)} min.`}
          </div>
        )}
        <div className="impact">
          🫶 {total} chats • {followups.filter((f) => !f.done).length} follow-ups due • streak {streak}/3 {streak >= 2 && "— breather soon"}
        </div>
        <div className="small dim">👍 seeker-vote rate arrives in Phase 2 (votes aren't shared with listeners yet).</div>
      </div>

      {/* desk: availability + queue */}
      {focus === "desk" && !sessionId && !showAfter && (
        <div className="card">
          <div className="human">
            Queue: {queue.queue_len} waiting • Online: {queue.online_listeners.join(", ") || "—"}
          </div>
          <button className="big sm" onClick={acceptNext} disabled={!online}>
            {online ? "Accept next person" : "Go Available to accept"}
          </button>
          {followups.filter((f) => !f.done).length > 0 && (
            <div className="followdue">
              📌 {followups.filter((f) => !f.done).length} follow-up(s) due:{" "}
              {followups.filter((f) => !f.done).slice(0, 3).map((f) => f.alias).join(", ")}
            </div>
          )}
          <div className="qlist">
            {visibleCases.length === 0 && (
              <div className="small dim">Nobody waiting. Stay Available — humanity cue keeps hope alive.</div>
            )}
            {visibleCases.map((c) => {
              const snoozed = (skipped[c.id] || 0) > Date.now();
              const returning = seen.includes(c.nickname);
              const stuck = waitMinOf(c) > 15;
              return (
                <div key={c.id} className={`qitem ${c.risk === "high" || stuck ? "stuck" : ""}`}>
                  <div>
                    <b>{c.nickname}</b> <span className="lang">{c.lang}</span>{" "}
                    {returning ? <span className="ret">returning</span> : <span className="ret new">first-time</span>}{" "}
                    {c.risk === "high" ? <span className="risk">triage HIGH</span> : <span className="risk low">triage ok</span>}
                    {stuck && <span className="risk">STUCK</span>}
                    {snoozed && <span className="ret">skipped</span>}
                    <div className="small">waiting {timeAgo(c.created_at)} • greet in {c.lang === "hi" ? "Hindi" : "English"}</div>
                  </div>
                  <div className="row" style={{ marginTop: 0 }}>
                    {!snoozed && <button className="chip" onClick={() => skipCase(c.id)}>Skip</button>}
                    <button className="chip primary" onClick={() => acceptCase(c.id)}>Accept</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. session */}
      {sessionId && (
        <div className="card">
          <div className="timer">
            {minsLeft <= 2 ? `Wrapping up… ${minsLeft.toFixed(0)} min left` : `${minsLeft.toFixed(0)} min left`}
          </div>
          {peer && (
            <div className="peer">
              Talking to <b>{peer.alias}</b> ({peer.lang}){" "}
              {peer.risk === "high" && <span className="risk">supervised SOS • helpline 1800-XXX-XXXX</span>}
            </div>
          )}
          <div className="bound">Listener, not doctor — no diagnosis / meds. 🤝</div>
          <Chat messages={messages} input={draft} setInput={setDraft} onSend={send} role="listener" />
          {(() => {
            const last = messages[messages.length - 1];
            const quietSec = last ? (Date.now() - new Date(last.created_at).getTime()) / 1000 : 0;
            return last && quietSec > 120 && (
              <div className="nudge">
                Quiet {Math.floor(quietSec / 60)} min —{" "}
                <button className="chip" onClick={() => setDraft("still there? take your time 🌱")}>
                  nudge: “still there?”
                </button>
              </div>
            );
          })()}
          {wrapping && (
            <div className="wrapbox">
              <b>Wrap script (copy-paste):</b>
              <div className="small">“We have 2 min left. One small step for tomorrow: one walk / one call / sleep by 11. Want a reminder 7pm?”</div>
            </div>
          )}
          {supPingAt && (
            <div className="small">🆘 Supervisor pinged {new Date(supPingAt).toLocaleTimeString()} — helpline 1800-XXX-XXXX. They join if free.</div>
          )}
          <div className="row">
            <button className="ghost" onClick={pingSupervisor}>
              🆘 Ask supervisor
            </button>
            <button className="ghost danger" onClick={end}>End session</button>
          </div>
          <button
            className="link"
            onClick={() => {
              if (!confirm(`Report ${peer?.alias} for spam/abuse? Goes to coordinator.`)) return;
              const reps = lsGet("pb_reports", []);
              reps.unshift({ alias: peer?.alias, by: lid(), at: new Date().toISOString() });
              lsSet("pb_reports", reps.slice(0, 50));
              alert("Reported. Coordinator sees it on the admin desk.");
            }}
          >
            Report / block spam or abuse
          </button>
        </div>
      )}

      {/* schedule page */}
      {focus === "schedule" && !sessionId && (
        <div className="card">
          <h3>Schedule</h3>
          {(() => {
            const ist = istNow();
            const open = ist.getHours() >= 19 && ist.getHours() < 23;
            return (
              <div className="small">
                Talk Hours 7–11pm IST: <b>{open ? "OPEN now" : "closed"}</b> ({String(ist.getHours()).padStart(2, "0")}:{String(ist.getMinutes()).padStart(2, "0")} IST)
              </div>
            );
          })()}
          <div className="row">
            <div className="small">Space for {space} more today</div>
            <button className="chip" onClick={() => { const v = Math.max(0, space - 1); setSpace(v); lsSet(`pb_space_${lid()}`, v); }}>−</button>
            <button className="chip" onClick={() => { const v = Math.min(10, space + 1); setSpace(v); lsSet(`pb_space_${lid()}`, v); }}>+</button>
            {space === 0 && <button className="chip danger" onClick={() => setAvail("paused")}>Pause me</button>}
          </div>
          {followups.length === 0 && <div className="small dim">No follow-up bookings yet.</div>}
          {followups.map((f, i) => (
            <div key={i} className="qitem">
              <div>
                <b>{f.alias}</b>
                <div className="small">{f.slot} • booked {timeAgo(f.at)} ago {f.done ? "• done" : ""}</div>
              </div>
              {!f.done && (
                <button
                  className="chip"
                  onClick={() => {
                    const id = lid();
                    const all = lsGet(`pb_followups_${id}`, []);
                    all[i] = { ...all[i], done: true };
                    lsSet(`pb_followups_${id}`, all);
                    setFollowups(all);
                  }}
                >
                  Done
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* clients page */}
      {focus === "clients" && !sessionId && (
        <div className="card">
          <h3>My Clients ({clients.length})</h3>
          <p className="small">Owned by you. Alias + lang + risk + last contact only — never name/phone/photo.</p>
          {clients.length === 0 && (
            <div className="small dim">Nobody yet — people you accept on the Desk land here.</div>
          )}
          {clients.map((c, i) => (
            <div key={i} className="qitem">
              <div>
                <b>{c.alias}</b> <span className="lang">{c.lang}</span>{" "}
                {c.risk === "high" ? <span className="risk">HIGH</span> : <span className="risk low">low</span>}
                <div className="small">owner: you • hop {c.hops} • last contact {timeAgo(c.lastContact)} ago</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* desk: today recap */}
      {focus === "desk" && !sessionId && (recap.chats > 0) && (
        <div className="card">
          <h3>Today</h3>
          <div className="small">today {recap.chats} chats, {recap.followups} follow-ups, {recap.sos} SOS — rest well 🌱</div>
        </div>
      )}

      {focus === "schedule" && !sessionId && (
        <div className="card dimcard">
          <div className="small dim">My Circle 5–10 · Briefs · Referrals — P2, slot reserved, not now.</div>
        </div>
      )}
      {showAfter && !sessionId && (
        <div className="card">
          <h3>After session</h3>
          <p className="small">Last talked to {peer?.alias || "seeker"} — alias only, no PII.</p>
          <div className="row">
            <button className="chip" onClick={offerFollowup}>
              Offer follow-up
            </button>
            <button className="chip" onClick={() => setShowAfter(false)}>Close</button>
            <button className="chip danger" onClick={() => { setAvail("full"); setShowAfter(false); }}>
              Mark Full — tired
            </button>
          </div>
          <div className="small" style={{ marginTop: 8 }}>Private end-notes (only you, feeds future Brief):</div>
          <div className="row">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. exam stress, sleeps late…" />
            <button className="chip" onClick={saveNotes}>Save</button>
          </div>
          <button className="ghost" onClick={() => { setShowAfter(false); }}>Back to queue</button>
        </div>
      )}
    </div>
  );
}

// ---------- admin / coordinator (V1 per docs/frontend/admin.md) ----------
// Hidden, dull, utilitarian. Metadata only — no chat body column ever.

function istNow() {
  return new Date(Date.now() + (5.5 * 60 + new Date().getTimezoneOffset()) * 60000);
}

function Admin({ section = "overview" }) {
  const [ok, setOk] = useState(() => !!localStorage.getItem("pb_admin_ok"));
  const [pass, setPass] = useState("");
  const [queue, setQueue] = useState({ queue_len: 0, online_listeners: [], cases: [] });
  const [err, setErr] = useState("");
  const [audit, setAudit] = useState(
    () => JSON.parse(localStorage.getItem("pb_audit") || "[]")
  );

  const login = () => {
    // Phase 1 demo gate. Real OTP/JWT in Phase 2.
    if (pass.trim() === "admin-123") {
      localStorage.setItem("pb_admin_ok", "1");
      setOk(true);
      setErr("");
    } else {
      setErr("Wrong passcode (demo: admin-123).");
    }
  };

  const refresh = useCallback(async () => {
    try {
      const q = await api.queue();
      const cases = [...(q.cases || [])].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setQueue({ ...q, cases });
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    if (!ok) return;
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [ok, refresh]);

  const log = (action, detail) => {
    const entry = { at: new Date().toISOString(), action, detail };
    const next = [entry, ...audit].slice(0, 50);
    setAudit(next);
    localStorage.setItem("pb_audit", JSON.stringify(next));
  };

  if (!ok) {
    return (
      <div className="card">
        <div className="eyebrow">Coordinator · /admin · internal only</div>
        <h3>Coordinator login</h3>
        <p className="small">Strict, separate from pro login. Internal only — no public link. Metadata only, never chat content.</p>
        {err && <div className="err">{err}</div>}
        <div className="row">
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="passcode"
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
          <button className="chip" onClick={login}>Login →</button>
        </div>
      </div>
    );
  }

  const ist = istNow();
  const open = ist.getHours() >= 19 && ist.getHours() < 23;

  return (
    <div>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <div className="deskhead">
          <div>
            <h3>Health</h3>
            <div className="small">
              {queue.online_listeners.length} listener(s) online • {queue.queue_len} waiting • Talk Hours 7–11pm IST: {open ? "OPEN" : "closed"} ({String(ist.getHours()).padStart(2, "0")}:{String(ist.getMinutes()).padStart(2, "0")} IST)
            </div>
          </div>
          <button className="link" onClick={() => { localStorage.removeItem("pb_admin_ok"); setOk(false); }}>logout</button>
        </div>
        <button className="ghost" onClick={refresh}>Refresh now</button>
      </div>

      {section === "queue" && (
      <div className="card">
        <h3>Stuck table</h3>
        <p className="small">Age, risk, owner, wait. No chat content — break-glass only, with reason + log.</p>
        {(queue.cases || []).length === 0 && (
          <div className="small dim">Queue empty. Nothing stuck.</div>
        )}
        {(queue.cases || []).map((c) => {
          const ageMin = Math.round((Date.now() - new Date(c.created_at).getTime()) / 60000);
          const stuck = c.risk === "high" || ageMin > 15;
          return (
            <div key={c.id} className={`qitem ${stuck ? "stuck" : ""}`}>
              <div>
                <b>{c.nickname}</b> <span className="lang">{c.lang}</span>{" "}
                {c.risk === "high" && <span className="risk">HIGH</span>}
                {stuck && <span className="risk">STUCK</span>}
                <div className="small">
                  age {ageMin}m • status {c.status} • owner {c.session_id ? "in talk" : "—"} • hops —
                </div>
              </div>
              <div className="row" style={{ marginTop: 0 }}>
                <button className="chip" onClick={() => { const d = prompt("Warm assign: doctor + slot (e.g. Dr B, 7:30pm)"); if (d) log("warm-assign", `${c.nickname} → ${d}`); }}>
                  Warm assign
                </button>
                <button className="chip" onClick={() => log("ping-patient", `${c.nickname}: "Reminder 7pm tomorrow"`)}>Ping patient</button>
              </div>
            </div>
          );
        })}
        <div className="row">
          <button className="ghost" onClick={() => { const d = prompt("Ping doctor (neutral only):"); if (d) log("ping-doctor", d); }}>
            Ping doctor
          </button>
        </div>
      </div>
      )}

      {section === "reports" && (
      <div className="card">
        <h3>Reports</h3>
        {lsGet("pb_reports", []).length === 0 && (
          <div className="small dim">No spam/abuse reports from listeners.</div>
        )}
        {lsGet("pb_reports", []).map((r, i) => (
          <div key={i} className="small">• {r.alias} — reported by {r.by} at {r.at.slice(11, 19)}</div>
        ))}
      </div>
      )}

      {section === "audit" && (
      <div className="card">
        <h3>Audit log</h3>
        {audit.length === 0 && <div className="small dim">No actions yet. Every action is logged.</div>}
        {audit.map((a, i) => (
          <div key={i} className="small">• [{a.at.slice(11, 19)}] <b>{a.action}</b> — {a.detail}</div>
        ))}
      </div>
      )}
    </div>
  );
}

// ---------- seeker static pages (Home / How it works / SOS) ----------

function SeekerHome({ onTalk }) {
  return (
    <div>
      <div className="card hero">
        <div className="pill">● Live nightly · Talk Hours 7–11pm IST</div>
        <div className="bign">🌙</div>
        <h2>Someone is waiting for you.</h2>
        <p className="small hero-sub">No login. No OTP. No name needed. One tap, a human in minutes — free, private, in Hindi or English.</p>
        <button className="big" onClick={onTalk}>Talk Now · Free 8 min</button>
        <div className="trust">
          <span>🕵️ Alias only</span>
          <span>💚 Free first chat</span>
          <span>🕖 7–11pm</span>
        </div>
        <div className="stats">
          <div><b>~3 min</b><i>median wait</i></div>
          <div><b>8–10 min</b><i>free session</i></div>
          <div><b>48h</b><i>auto-delete</i></div>
        </div>
      </div>
      <div className="card">
        <div className="eyebrow">How it works</div>
        <h3>Private help, perfect fit</h3>
        <p className="small">You stay with one anchor listener. If someone else fits better, your brief slides doctor-to-doctor — you never repeat your story.</p>
        <div className="steps-mini">
          <div><b>1</b><span>Tap Talk Now</span></div>
          <div><b>2</b><span>Chat 8 min</span></div>
          <div><b>3</b><span>You decide</span></div>
        </div>
        <button className="ghost" onClick={onTalk}>Start →</button>
      </div>
      <div className="card dimcard">
        <div className="small">🔒 Alias always · in-app chat only · neutral “PB Wellness” billing · one-tap wipe. SOS → helpline <b>1800-XXX-XXXX</b> (24×7).</div>
      </div>
    </div>
  );
}

function SeekerHow({ onTalk }) {
  const steps = [
    ["1️⃣", "Tap Talk Now", "Nickname is auto-made. Pick Hindi or English. No forms, no OTP."],
    ["2️⃣", "8-minute chat", "A supervised listener listens. Wrap-up nudge at 8 min, close at 10."],
    ["3️⃣", "You decide", "Vote 👍/👎. Reminders, saved chats, follow-ups — all optional, never forced."],
  ];
  return (
    <div>
      {steps.map(([e, t, d]) => (
        <div key={t} className="card">
          <h3>{e} {t}</h3>
          <p className="small">{d}</p>
        </div>
      ))}
      <div className="card">
        <p className="small">Alias always • in-app chat only • chats auto-delete in 48h • neutral “PB Wellness” name everywhere.</p>
        <button className="big sm" onClick={onTalk}>Talk Now →</button>
      </div>
    </div>
  );
}

function SeekerSos({ onBack }) {
  return (
    <div className="sos">
      <b>You matter. Get human help now:</b>
      <p>📞 Partner Helpline: <b>1800-XXX-XXXX</b> (24×7)<br />A supervised listener has been paged. Stay on this screen.</p>
      <button className="ghost" onClick={onBack}>Back to Home</button>
    </div>
  );
}

// ---------- shell: 3 links, 1 codebase ----------
// prod:  psycbridge.in → seeker | pro.psycbridge.in → listener | admin.psycbridge.in → admin
// demo:  localhost:5173 → seeker | pro.localhost:5173 → listener | admin.localhost:5173 → admin
// vercel/screenshot paths (SPA): / → seeker home | /seeker → seeker talk
//   /login | /pro | /listener → listener desk | /admin → coordinator
// override anytime: ?app=seeker|pro|admin

function getInitialRoute() {
  const q = new URLSearchParams(window.location.search).get("app");
  if (q === "seeker" || q === "pro" || q === "admin")
    return { mode: q, page: SITES[q].start };
  const h = window.location.hostname.toLowerCase();
  if (h.startsWith("admin.")) return { mode: "admin", page: "overview" };
  if (h.startsWith("pro.")) return { mode: "pro", page: "desk" };
  const p = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/index.html") return { mode: "seeker", page: "home" };
  if (p === "/seeker" || p === "/talk") return { mode: "seeker", page: "talk" };
  if (p === "/how") return { mode: "seeker", page: "how" };
  if (p === "/sos") return { mode: "seeker", page: "sos" };
  if (p === "/login" || p === "/pro" || p === "/listener" || p === "/desk")
    return { mode: "pro", page: "desk" };
  if (p === "/clients") return { mode: "pro", page: "clients" };
  if (p === "/schedule") return { mode: "pro", page: "schedule" };
  if (p.startsWith("/admin")) {
    if (p.includes("queue")) return { mode: "admin", page: "queue" };
    if (p.includes("report")) return { mode: "admin", page: "reports" };
    if (p.includes("audit")) return { mode: "admin", page: "audit" };
    return { mode: "admin", page: "overview" };
  }
  return { mode: "seeker", page: "home" };
}

function routePath(mode, page) {
  if (mode === "pro") {
    if (page === "clients") return "/clients";
    if (page === "schedule") return "/schedule";
    return "/login";
  }
  if (mode === "admin") {
    if (page === "queue") return "/admin/queue";
    if (page === "reports") return "/admin/reports";
    if (page === "audit") return "/admin/audit";
    return "/admin";
  }
  if (page === "talk") return "/seeker";
  if (page === "how") return "/how";
  if (page === "sos") return "/sos";
  return "/";
}

const SITES = {
  seeker: {
    brand: "Wellness", sub: "Talk Hours 7–11pm", start: "home",
    links: [
      { id: "home", label: "Home" },
      { id: "talk", label: "Talk Now" },
      { id: "how", label: "How it works" },
      { id: "sos", label: "SOS" },
    ],
  },
  pro: {
    brand: "Pro", sub: "Listener desk • 7–11pm", start: "desk",
    links: [
      { id: "desk", label: "Desk" },
      { id: "clients", label: "My Clients" },
      { id: "schedule", label: "Schedule" },
    ],
  },
  admin: {
    brand: "Admin", sub: "Coordinator • internal", start: "overview",
    links: [
      { id: "overview", label: "Overview" },
      { id: "queue", label: "Queue" },
      { id: "reports", label: "Reports" },
      { id: "audit", label: "Audit" },
    ],
  },
};

export default function App() {
  const deviceUuid = useDeviceId();
  const [route] = useState(getInitialRoute);
  const mode = route.mode;
  const site = SITES[mode] || SITES.seeker;
  const [page, setPage] = useState(route.page);
  const go = useCallback((next) => {
    setPage(next);
    try {
      const m = SITES[mode] ? mode : "seeker";
      window.history.replaceState(null, "", routePath(m, next));
    } catch { /* ignore */ }
    window.scrollTo(0, 0);
  }, [mode]);
  return (
    <div className="wrap">
      <Navbar brand={site.brand} sub={site.sub} links={site.links} active={page} onNav={go} />
      {mode === "seeker" ? (
        page === "home" ? <SeekerHome onTalk={() => go("talk")} />
        : page === "talk" ? <Seeker deviceUuid={deviceUuid} />
        : page === "how" ? <SeekerHow onTalk={() => go("talk")} />
        : <SeekerSos onBack={() => go("home")} />
      ) : mode === "pro" ? (
        <Listener section={page} />
      ) : (
        <Admin section={page} />
      )}
      <div className="qcard">
        Phase 1 pilot • Free first chat only • No payments • Alias mode • Chats auto-delete in 48h • Backend: {API_BASE}
      </div>
    </div>
  );
}
