'use client'

import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, ArrowUpRight, Bell, CheckCircle2, Clock3, LayoutDashboard, MessageSquare, ShieldCheck, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { api, timeAgo, waitMinOf, type QueueCase } from '@/lib/api'

export default function AdminDashboard() {
  const [unlocked, setUnlocked] = useState(false)
  const [pass, setPass] = useState('')
  const [gateErr, setGateErr] = useState('')
  const [cases, setCases] = useState<QueueCase[]>([])
  const [queueLen, setQueueLen] = useState(0)
  const [online, setOnline] = useState<string[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    try {
      setUnlocked(localStorage.getItem('pb_admin_ok') === '1')
    } catch {
      /* private mode */
    }
  }, [])

  function unlock(e: React.FormEvent) {
    e.preventDefault()
    if (pass.trim() === 'admin-123') {
      localStorage.setItem('pb_admin_ok', '1')
      setUnlocked(true)
      setGateErr('')
    } else {
      setGateErr('Wrong passcode (demo: admin-123).')
    }
  }

  useEffect(() => {
    if (!unlocked) return
    let stop = false
    const tick = async () => {
      try {
        const q = await api.queue()
        if (stop) return
        const sorted = [...(q.cases || [])].sort(
          (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
        )
        setCases(sorted)
        setQueueLen(q.queue_len ?? sorted.length)
        setOnline(q.online_listeners || [])
        setErr('')
      } catch (e) {
        if (!stop) setErr((e as Error).message)
      }
    }
    tick()
    const t = setInterval(tick, 8000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [unlocked])

  const oldest = cases[0]?.created_at
  const attention = cases.slice(0, 8)
  const rowKind = (c: QueueCase) => {
    const high = (c.risk || '').toLowerCase() === 'high'
    const stuck = waitMinOf(c.created_at) > 15
    return {
      danger: high,
      issue: high
        ? 'High-risk flag · awaiting warm handoff'
        : stuck
          ? 'Queue wait above 15 minutes'
          : `Waiting for a listener · ${c.lang}`,
      status: high ? 'Needs attention' : stuck ? 'Stuck' : 'Monitor',
    }
  }

  if (!unlocked) {
    return <main className="admin-shell"><section className="admin-content"><div className="placeholder-page"><div className="placeholder-icon"><ShieldCheck /></div><h2>Coordinator login</h2><p>Internal only — no public link. Metadata only, never chat content.</p>{gateErr && <p className="seeker-error">{gateErr}</p>}<form className="gate-form" onSubmit={unlock}><input className="login-input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="passcode" aria-label="passcode" /><Button type="submit">Login →</Button></form><p><Link href="/login" style={{ color: '#a89cff', fontSize: 11 }}>← back to sign in</Link></p></div></section></main>
  }

  return <main className="admin-shell"><aside className="sidebar admin-sidebar"><Link href="/" className="brand-mark"><span>pb</span><div><strong>PB Wellness</strong><small>Coordinator console</small></div></Link><div className="admin-profile"><div className="avatar avatar-lilac">NS</div><div><strong>Nisha S.</strong><small>Coordinator</small></div></div><nav className="nav-list" aria-label="Admin navigation"><button className="nav-item nav-active"><LayoutDashboard /><span>Overview</span></button><button className="nav-item"><Users /><span>People & cases</span><b>{queueLen}</b></button><button className="nav-item"><MessageSquare /><span>Listener queue</span></button><button className="nav-item"><ShieldCheck /><span>Safety log</span></button></nav><div className="sidebar-spacer" /><Link href="/login" className="nav-item"><ArrowUpRight /><span>Switch role</span></Link></aside><section className="admin-content"><header className="topbar"><div className="breadcrumbs"><span>Coordinator console</span><strong>Overview</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notifications"><Bell /><i /></button><div className="top-avatar">NS</div></div></header><div className="page-heading"><div><p className="eyebrow">WEDNESDAY, OCTOBER 15 <span className="live-pill"><i /> LIVE</span></p><h1>Keep the care moving.</h1><p className="subheading">A calm view of the places that need a human touch.</p></div><Button variant="outline"><Activity data-icon="inline-start" /> Export pilot report</Button></div>{err && <p className="seeker-error">{err} — is the backend up at port 3000?</p>}<div className="admin-stats"><div className="stat-card"><div className="stat-icon purple"><Users /></div><div><span>Waiting now</span><strong>{queueLen}</strong><small>{online.length} listener(s) online</small></div></div><div className="stat-card"><div className="stat-icon green"><CheckCircle2 /></div><div><span>Listeners online</span><strong>{online.length}</strong><small>{online.slice(0, 3).join(', ') || 'none yet'}</small></div></div><div className="stat-card"><div className="stat-icon gold"><Clock3 /></div><div><span>Oldest wait</span><strong>{oldest ? timeAgo(oldest) : '—'}</strong><small>{queueLen === 0 ? 'Queue empty' : 'stuck after 15 min'}</small></div></div></div><div className="admin-grid"><section className="queue-card attention-card"><div className="card-heading"><div><div className="title-with-live"><h2>Human attention needed</h2><span className="tiny-live"><i /> {attention.length} OPEN</span></div><p>Only anonymized details are shown until a safety escalation is logged.</p></div><button className="text-button">View all <ArrowUpRight /></button></div><div className="attention-list">{attention.length === 0 && <div className="empty-queue" style={{ padding: 20, color: '#858b9d', fontSize: 11 }}>Queue empty. Nothing stuck.</div>}{attention.map((item) => { const k = rowKind(item); return <article className="attention-row" key={item.id}><div className={`attention-icon ${k.danger ? 'danger' : ''}`}>{k.danger ? <AlertTriangle /> : <Clock3 />}</div><div><strong>{item.nickname}</strong><p>{k.issue}</p></div><div className="attention-meta"><span>{timeAgo(item.created_at)}</span><small>{k.status}</small></div></article> })}</div></section><aside className="admin-side-card"><div className="card-heading"><div><h2>Listener coverage</h2><p>Tonight · 7–11 PM IST</p></div><span className="status-dot" /></div><div className="coverage-number"><strong>{online.length}</strong><span>online now</span></div><div className="coverage-bar"><span style={{ width: `${Math.min(100, online.length * 20)}%` }} /></div><div className="coverage-row"><span>Waiting</span><strong>{queueLen}</strong></div><div className="coverage-row"><span>Oldest wait</span><strong>{oldest ? timeAgo(oldest) : '—'}</strong></div><div className="coverage-row"><span>Online</span><strong>{online.length}</strong></div><Button className="full-width-button">Open listener desk</Button></aside></div><div className="admin-note"><ShieldCheck /><div><strong>Privacy guardrail active</strong><p>Chat content stays private. This console shows routing, safety flags, and queue health only.</p></div><CheckCircle2 /></div></section></main>
}
