'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  HeartHandshake,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Phone,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api, timeAgo, waitMinOf, type ChatMsg, type QueueCase } from '@/lib/api'

const LISTENER_ID = 'listener-1'

function lsGet<T>(k: string, fb: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? 'null')
    return v ?? fb
  } catch {
    return fb
  }
}

function RiskBadge({ risk }: { risk: string }) {
  const r = (risk || 'low').toLowerCase()
  const label = r === 'high' ? 'High' : r === 'medium' ? 'Medium' : 'Low'
  return <span className={`risk risk-${r === 'high' ? 'high' : r === 'medium' ? 'medium' : 'low'}`}>{label}</span>
}

interface Session {
  session_id: string
  alias: string
  lang: string
  risk: string
  kind: string
}

interface Client {
  alias: string
  lang: string
  risk: string
  time: string
  hop: string
}

export function ListenerDesk() {
  const [availability, setAvailability] = useState<'Available' | 'Paused' | 'Full'>('Available')
  const [activeQueue, setActiveQueue] = useState<QueueCase[]>([])
  const [queueLen, setQueueLen] = useState(0)
  const [onlineCount, setOnlineCount] = useState(0)
  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [draft, setDraft] = useState('')
  const [activeNav, setActiveNav] = useState('Desk')
  const [note, setNote] = useState('')
  const [ended, setEnded] = useState(false)
  const [err, setErr] = useState('')
  const [seen, setSeen] = useState<string[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [helped, setHelped] = useState(0)

  const online = availability === 'Available'

  const queueLabel = useMemo(
    () => (availability === 'Available' ? 'You are visible in the queue' : 'New cases are paused'),
    [availability],
  )

  // load local state once
  useEffect(() => {
    setSeen(lsGet<string[]>(`pb_seen_${LISTENER_ID}`, []))
    setClients(lsGet<Client[]>(`pb_clients_${LISTENER_ID}`, []))
    setHelped(Number(localStorage.getItem('pb_listener_total') || 0))
  }, [])

  const refreshQueue = useCallback(async () => {
    try {
      const q = await api.queue()
      // priority auto-sort: high-risk first, then stuck (>15m), then oldest
      const cases = [...(q.cases || [])].sort((a, b) => {
        const rank = (c: QueueCase) =>
          (c.risk || '').toLowerCase() === 'high' ? 0 : waitMinOf(c.created_at) > 15 ? 1 : 2
        return rank(a) - rank(b) || +new Date(a.created_at) - +new Date(b.created_at)
      })
      setActiveQueue(cases)
      setQueueLen(q.queue_len ?? cases.length)
      setOnlineCount(q.online_listeners?.length ?? 0)
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [])

  // heartbeat while Available (backend prunes >90s) + queue poll
  useEffect(() => {
    if (!online) return
    api.availability(LISTENER_ID).catch(() => {})
    refreshQueue()
    const hb = setInterval(() => api.availability(LISTENER_ID).catch(() => {}), 30000)
    const q = setInterval(refreshQueue, 5000)
    return () => {
      clearInterval(hb)
      clearInterval(q)
    }
  }, [online, refreshQueue])

  // poll queue (no heartbeat) while Paused/Full so counts stay fresh
  useEffect(() => {
    if (online) return
    refreshQueue()
    const q = setInterval(refreshQueue, 8000)
    return () => clearInterval(q)
  }, [online, refreshQueue])

  // chat polling
  useEffect(() => {
    if (!session || ended) return
    let stop = false
    const tick = async () => {
      try {
        const j = await api.getMessages(session.session_id)
        if (!stop) setMessages(j.messages || [])
      } catch {
        /* ignore transient poll errors */
      }
    }
    tick()
    const t = setInterval(tick, 2000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [session, ended])

  async function acceptCase(caseId: string) {
    setErr('')
    if (!online) {
      setErr('Go Available first — Full means hidden from routing.')
      return
    }
    try {
      const j = await api.accept({ case_id: caseId, listener_id: LISTENER_ID })
      const returning = lsGet<string[]>(`pb_seen_${LISTENER_ID}`, []).includes(j.alias)
      setSession({
        session_id: j.session_id,
        alias: j.alias,
        lang: j.lang,
        risk: j.risk,
        kind: returning ? 'Returning' : 'First time',
      })
      setMessages([])
      setEnded(false)
      setNote('')
      setStartedAt(Date.now())
      // own the client (alias + lang + risk, local only in Phase 1)
      const now = new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
      const cls = lsGet<Client[]>(`pb_clients_${LISTENER_ID}`, [])
      if (!cls.some((c) => c.alias === j.alias)) {
        const next = [{ alias: j.alias, lang: j.lang, risk: j.risk, time: now, hop: 'You' }, ...cls].slice(0, 30)
        localStorage.setItem(`pb_clients_${LISTENER_ID}`, JSON.stringify(next))
        setClients(next)
      }
      const s = [...lsGet<string[]>(`pb_seen_${LISTENER_ID}`, []), j.alias]
      localStorage.setItem(`pb_seen_${LISTENER_ID}`, JSON.stringify(s))
      setSeen(s)
      refreshQueue()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  function acceptNext() {
    const next = activeQueue[0]
    if (!next) return
    acceptCase(next.id)
  }

  async function send() {
    const body = draft.trim()
    if (!body || !session || ended) return
    setDraft('')
    try {
      await api.postMessage({ session_id: session.session_id, sender: 'listener', body })
      const j = await api.getMessages(session.session_id)
      setMessages(j.messages || [])
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function endSession() {
    if (!session) return
    try {
      await api.endSession({ session_id: session.session_id })
      const n = helped + 1
      setHelped(n)
      localStorage.setItem('pb_listener_total', String(n))
      setEnded(true)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  function closeSession() {
    if (note.trim() && session) {
      const key = `pb_notes_${LISTENER_ID}`
      const prev = lsGet<{ at: string; alias: string; text: string }[]>(key, [])
      prev.push({ at: new Date().toISOString(), alias: session.alias, text: note.trim() })
      localStorage.setItem(key, JSON.stringify(prev))
    }
    setSession(null)
    setMessages([])
    setNote('')
  }

  // session clock (10-min session, wrap nudge at 8)
  useEffect(() => {
    if (!session || ended) return
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [session, ended])

  const minsLeft = startedAt
    ? Math.max(0, 10 - (now - startedAt) / 60000)
    : 10

  const kindOf = (nickname: string) => (seen.includes(nickname) ? 'Returning' : 'First time')

  return (
    <main className="listener-shell">
      <aside className="sidebar">
        <div className="brand-mark"><span>pb</span><div><strong>PB Wellness</strong><small>Listener desk</small></div></div>
        <div className="profile-card"><div className="avatar avatar-lilac">AR</div><div><strong>Aarav R.</strong><small>Supervised listener</small></div><span className="online-dot" /></div>
        <nav className="nav-list" aria-label="Main navigation">
          {[['Desk', LayoutDashboard], ['My clients', Users], ['Schedule', Clock3], ['Briefs', BookOpen]].map(([label, Icon]) => (
            <button className={`nav-item ${activeNav === label ? 'nav-active' : ''}`} key={label as string} onClick={() => setActiveNav(label as string)}><Icon /><span>{label as string}</span>{label === 'Briefs' && <b>2</b>}</button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="supervision-card"><div className="mini-icon"><ShieldCheck /></div><div><strong>Supervision is on</strong><p>Ask for help anytime.</p></div><ChevronRight /></div>
        <button className="nav-item"><Settings2 /><span>Settings</span></button>
        <div className="sidebar-footer"><span className="status-dot" /> All systems calm <span>v1 pilot</span></div>
      </aside>

      <section className="desk-content">
        <header className="topbar"><div className="mobile-brand">PB Wellness</div><div className="breadcrumbs"><span>Listener desk</span><ChevronRight /><strong>{activeNav}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Search"><Search /></button><button className="icon-button notification" aria-label="Notifications"><Bell /><i /></button><div className="top-avatar">AR</div></div></header>

        {activeNav === 'Desk' ? <>
          <div className="page-heading"><div><p className="eyebrow">WEDNESDAY, OCTOBER 15 <span className="live-pill"><i /> LIVE</span></p><h1>Your desk, at your pace.</h1><p className="subheading">A calm place to help someone feel a little less alone.</p></div><button className="help-button"><CircleHelp /> Need help?</button></div>

          <section className="availability-panel"><div className="availability-copy"><div className="pulse-icon"><Activity /></div><div><p className="eyebrow">YOUR STATUS</p><h2>{availability}</h2><span>{queueLabel}</span></div></div><div className="availability-options">{(['Available', 'Paused', 'Full'] as const).map((status) => <button key={status} className={availability === status ? `availability-option selected ${status.toLowerCase()}` : 'availability-option'} onClick={() => setAvailability(status)}>{status === 'Available' ? <span className="status-dot" /> : status === 'Paused' ? <Pause /> : <X />}{status}</button>)}</div></section>
          {err && <p className="seeker-error">{err}</p>}

          <div className="stats-row"><div className="stat-card"><div className="stat-icon purple"><Users /></div><div><span>Waiting now</span><strong>{queueLen}</strong><small>{onlineCount} listener(s) online</small></div></div><div className="stat-card"><div className="stat-icon green"><HeartHandshake /></div><div><span>Helped tonight</span><strong>{helped}</strong><small>alias-only, always</small></div></div><div className="stat-card"><div className="stat-icon gold"><Zap /></div><div><span>Your energy</span><strong>Good</strong><small>take a breather when needed</small></div></div></div>

          <div className="content-grid"><section className="queue-card"><div className="card-heading"><div><div className="title-with-live"><h2>People waiting</h2><span className="tiny-live"><i /> LIVE</span></div><p>Priority is sorted for you. No manual picking.</p></div><button className="more-button" aria-label="More options"><MoreHorizontal /></button></div><div className="queue-list">{activeQueue.length === 0 && <div className="empty-queue" style={{ padding: 20 }}>Nobody waiting. Stay Available — humanity cue keeps hope alive.</div>}{activeQueue.map((person, index) => <article className={`queue-item ${index === 0 ? 'priority-item' : ''}`} key={person.id}><div className="queue-number">{String(index + 1).padStart(2, '0')}</div><div className="queue-main"><div className="queue-title"><strong>{person.nickname}</strong><RiskBadge risk={person.risk} /><span className="kind-label">{kindOf(person.nickname)}</span></div><p>Greet in {person.lang === 'hi' ? 'Hindi' : 'English'} · waiting {timeAgo(person.created_at)}</p><div className="queue-meta"><span><Clock3 /> {timeAgo(person.created_at)} waiting</span><span><MessageCircle /> {person.lang}</span></div></div><button className="queue-accept" onClick={() => acceptCase(person.id)}>Accept <ChevronRight className="queue-chevron" /></button></article>)}</div><div className="queue-footer"><span><span className="status-dot" /> Queue updates automatically</span><button onClick={refreshQueue}>Refresh list</button></div></section>

            <aside className="right-column"><section className="accept-card"><div className="accept-glow" /><div className="card-heading"><div><p className="eyebrow">NEXT UP</p><h2>{activeQueue[0]?.nickname ?? 'No one waiting'}</h2></div><span className="priority-label">Priority</span></div>{activeQueue[0] ? <><div className="greet-box"><Sparkles /><div><strong>Before you accept</strong><p>{kindOf(activeQueue[0].nickname)} · {activeQueue[0].lang} · {timeAgo(activeQueue[0].created_at)} wait</p></div></div><Button className="accept-button" onClick={acceptNext} disabled={!online}><HeartHandshake data-icon="inline-start" /> {online ? 'Accept next' : 'Go Available to accept'} <span>↵</span></Button><p className="accept-note">High-risk cases go to SOS flow — accept will refuse them by design.</p></> : <div className="empty-queue">You are all caught up.<br />Take a breather.</div>}</section><section className="clients-card"><div className="card-heading"><div><h2>My clients</h2><p>Your owned cases, kept private.</p></div><button className="text-button">View all <ChevronRight /></button></div><div className="client-list">{clients.length === 0 && <div className="empty-queue" style={{ padding: 14 }}>Nobody yet — people you accept land here.</div>}{clients.map((client) => <div className="client-row" key={client.alias}><div className="avatar avatar-small">{client.alias.slice(0, 2)}</div><div className="client-info"><strong>{client.alias}</strong><span>{client.lang} · {client.time}</span></div><div className="client-risk"><RiskBadge risk={client.risk} /><small>{client.hop}</small></div></div>)}</div></section></aside>
          </div>
          <div className="bottom-note"><ShieldCheck /> <span><strong>Listener, not doctor.</strong> No diagnosis or medication advice here.</span><button>Read boundaries</button></div>
        </> : <div className="placeholder-page"><div className="placeholder-icon"><BookOpen /></div><h2>{activeNav}</h2><p>This part of the desk is ready for the next pilot step.</p><Button variant="outline" onClick={() => setActiveNav('Desk')}>Back to desk</Button></div>}
      </section>

      {session && <div className="session-overlay" role="dialog" aria-modal="true" aria-label="Active listening session"><div className="session-panel"><div className="session-top"><button className="close-session" onClick={closeSession} aria-label="Close session"><X /></button><div className="session-state"><span className="status-dot" /> Session live</div><span className="session-timer">{minsLeft <= 2 ? 'Wrapping up…' : `${minsLeft.toFixed(0)}`} <small>{minsLeft <= 2 ? `${minsLeft.toFixed(0)} left` : 'min left'}</small></span></div><div className="session-person"><div className="avatar avatar-large">{session.alias.slice(0, 2)}</div><div><p className="eyebrow">ANONYMOUS SESSION</p><h2>{session.alias}</h2><p>{session.lang} · {session.kind} · <RiskBadge risk={session.risk} /></p></div></div><div className="session-safety"><ShieldCheck /><span>Private by default. No names, photos, or phone numbers.</span></div><div className="chat-area"><div className="chat-time">Live · poll every 2s</div>{minsLeft <= 2 && !ended && <div className="chat-time">Wrap: “We have 2 min left. One small step for tomorrow?”</div>}{messages.length === 0 && <div className="chat-time">No messages yet — greet gently.</div>}{messages.map((m) => <div key={m.id} className={`bubble ${m.sender === 'listener' ? 'bubble-me' : 'bubble-them'}`}>{m.body}</div>)}{ended && <div className="ended-note"><Check /> Session ended. Add a private note below.</div>}</div>{ended ? <div className="wrap-area"><label htmlFor="private-note">Private end-note <span>Only visible to you</span></label><textarea id="private-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What would be useful to remember?" /><div className="wrap-actions"><Button variant="outline" onClick={closeSession}>Close case</Button><Button onClick={closeSession}>Save & close</Button></div></div> : <form className="composer" onSubmit={(e) => { e.preventDefault(); send() }}><button type="button" aria-label="Voice message"><Phone /></button><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a gentle reply..." maxLength={2000} /><button className="send-button" type="submit" aria-label="Send"><ChevronRight /></button></form>}<div className="session-footer"><span><ShieldCheck /> Listener, not doctor</span>{!ended && <Button variant="outline" onClick={endSession}>End session</Button>}</div></div></div>}
    </main>
  )
}

export default ListenerDesk
