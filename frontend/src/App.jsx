import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, api, friendlyJoinError } from "./api.js";

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
          <h2>Someone is waiting for you.</h2>
          <p className="small">No login. No OTP. No name needed. Just tap below — 8–10 min, free.</p>
          <button className="big" onClick={join}>Talk Now</button>
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

// ---------- listener desk ----------

function Listener() {
  const [listenerId, setListenerId] = useState("listener-1");
  const [info, setInfo] = useState("Queue: ? • Online: ?");
  const [sessionId, setSessionId] = useState(null);
  const [peer, setPeer] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");

  const refreshQueue = useCallback(async () => {
    try {
      const q = await api.queue();
      setInfo(`Queue: ${q.queue_len} waiting • Online: ${q.online_listeners.join(", ") || "—"}`);
      return q;
    } catch (e) {
      setErr(e.message);
      return null;
    }
  }, []);

  const goAvail = async () => {
    setErr("");
    try {
      await api.availability(listenerId || "listener-1");
      await refreshQueue();
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    const t = setInterval(refreshQueue, 5000);
    return () => clearInterval(t);
  }, [refreshQueue]);

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

  const acceptNext = async () => {
    setErr("");
    const q = await refreshQueue();
    if (!q) return;
    if (!q.cases?.length) {
      alert("Nobody waiting right now. Stay Available.");
      return;
    }
    try {
      const j = await api.accept({ case_id: q.cases[0].id, listener_id: listenerId || "listener-1" });
      setSessionId(j.session_id);
      setPeer(`Talking to ${j.alias} (${j.lang})`);
    } catch (e) {
      setErr(e.message);
    }
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
      alert("Session closed. Thanks for volunteering.");
      setSessionId(null);
      setMessages([]);
      setPeer("");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <h3>Volunteer desk (7–11pm)</h3>
        <p className="small">1. Go Available → 2. Accept next person → 3. Chat 8–10 min → 4. End.</p>
        <div className="row">
          <input value={listenerId} onChange={(e) => setListenerId(e.target.value)} placeholder="listener-1" />
          <button className="chip" onClick={goAvail}>Go Available</button>
        </div>
        <div className="small">{info}</div>
        <button className="big sm" onClick={acceptNext}>Accept next person</button>
        {peer && <div className="small">{peer}</div>}
      </div>
      <div className="card">
        <Chat messages={messages} input={draft} setInput={setDraft} onSend={send} role="listener" />
        <button className="ghost" onClick={end}>End session</button>
      </div>
    </div>
  );
}

// ---------- shell ----------

export default function App() {
  const deviceUuid = useDeviceId();
  const [tab, setTab] = useState("seeker");
  return (
    <div className="wrap">
      <div className="top">
        <div className="brand">PB <span>Wellness</span></div>
        <div className="hours">Talk Hours 7–11pm</div>
      </div>
      <div className="tabs">
        <button className={tab === "seeker" ? "on" : ""} onClick={() => setTab("seeker")}>Need Help</button>
        <button className={tab === "listener" ? "on" : ""} onClick={() => setTab("listener")}>I&apos;m a Listener</button>
      </div>
      {tab === "seeker" ? <Seeker deviceUuid={deviceUuid} /> : <Listener />}
      <div className="qcard">
        Phase 1 pilot • Free first chat only • No payments • Alias mode • Chats auto-delete in 48h • Backend: {API_BASE}
      </div>
    </div>
  );
}
