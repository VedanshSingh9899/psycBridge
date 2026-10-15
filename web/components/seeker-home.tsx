'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Headphones, LockKeyhole, MessageCircle, ShieldCheck, Sparkles, Volume2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { api, friendlyJoinError, getDeviceUuid } from '@/lib/api'

type Step = 'idle' | 'joining' | 'triage' | 'queued' | 'sos' | 'chat' | 'done'

interface Msg {
  id?: string
  sender: string
  body: string
  created_at?: string
}

const SOS_PHONE = '1800-XXX-XXXX'

export default function SeekerHome() {
  const [step, setStep] = useState<Step>('idle')
  const [err, setErr] = useState('')
  const [caseId, setCaseId] = useState<string | null>(null)
  const [alias, setAlias] = useState('QuietPine27')
  const [position, setPosition] = useState(0)
  const [etaMin, setEtaMin] = useState(0)
  const [online, setOnline] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [voteMsg, setVoteMsg] = useState('')
  const [lang, setLang] = useState<'hi' | 'en'>('hi')
  const [helplines, setHelplines] = useState<{ name: string; phone: string }[]>([])
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [messages, step])

  // poll queue → wait for session_id
  useEffect(() => {
    if (step !== 'queued' || !caseId) return
    let stop = false
    const tick = async () => {
      try {
        const s = await api.status(caseId)
        if (stop) return
        setPosition(s.position ?? 0)
        setEtaMin(s.eta_min ?? 0)
        setOnline(s.online_count ?? 0)
        if (s.session_id) {
          setSessionId(s.session_id)
          setStartedAt(Date.now())
          setStep('chat')
        }
      } catch (e) {
        if (!stop) setErr((e as Error).message)
      }
    }
    tick()
    const t = setInterval(tick, 3000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [step, caseId])

  // session clock (8-min wrap nudge, 10-min close — matches backend config)
  useEffect(() => {
    if (step !== 'chat') return
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [step])
  useEffect(() => {
    if (step !== 'chat' || !sessionId) return
    let stop = false
    const tick = async () => {
      try {
        const j = await api.getMessages(sessionId)
        if (!stop) setMessages(j.messages || [])
      } catch {
        /* polling — ignore transient errors */
      }
    }
    tick()
    const t = setInterval(tick, 2000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [step, sessionId])

  async function talkNow() {
    setErr('')
    setStep('joining')
    try {
      const j = await api.join({ device_uuid: getDeviceUuid(), lang })
      setCaseId(j.case_id)
      if (j.nickname) setAlias(j.nickname)
      setPosition(j.position ?? 1)
      setEtaMin(j.eta_min ?? 0)
      setOnline(j.online_count ?? 0)
      setStep('triage')
    } catch (e) {
      setErr(friendlyJoinError(e as { code?: string; message: string }))
      setStep('idle')
    }
  }

  async function answerTriage(v: 'yes' | 'no' | 'skip') {
    if (!caseId) return
    setErr('')
    try {
      const j = await api.triage({ case_id: caseId, unsafe_self: v })
      if (j.action === 'sos') {
        setHelplines(j.helplines || [])
        setStep('sos')
      } else setStep('queued')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function send() {
    const body = draft.trim()
    if (!body || !sessionId) return
    setDraft('')
    try {
      await api.postMessage({ session_id: sessionId, sender: 'seeker', body })
      const j = await api.getMessages(sessionId)
      setMessages(j.messages || [])
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function endChat(helped_vote?: boolean) {
    if (!sessionId) return
    try {
      await api.endSession({ session_id: sessionId, helped_vote })
      if (helped_vote !== undefined) {
        setVoteMsg(
          helped_vote
            ? 'Glad it helped a little. Come back anytime 7–11pm.'
            : 'Thanks for telling us. Try a follow-up chat tomorrow.',
        )
      }
      setStep('done')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const minsLeft = startedAt
    ? Math.max(0, 10 - (now - startedAt) / 60000)
    : 10

  function leaveQueue() {
    setStep('idle')
    setCaseId(null)
  }

  return (
    <main className="seeker-shell">
      <header className="seeker-topbar"><Link href="/" className="brand-mark"><span>pb</span><div><strong>PB Wellness</strong><small>A quiet place to begin</small></div></Link><Link href="/login" className="seeker-login">Sign in <ArrowRight /></Link></header>
      <section className="seeker-hero">
        <div className="seeker-copy"><p className="eyebrow"><span className="live-dot" /> TALK HOURS · 7–11 PM IST</p><h1>You don&apos;t have to carry it alone.</h1><p className="seeker-lede">Talk to a trained listener who will meet you where you are. No name, number, or explanation needed to start.</p><div className="seeker-actions"><Button className="talk-now-button" onClick={talkNow} disabled={step !== 'idle'}><MessageCircle data-icon="inline-start" /> {step === 'idle' ? 'Talk now' : step === 'joining' ? 'Connecting…' : 'In progress…'}</Button><Link href="#how-it-works" className="quiet-link">How it works <ArrowRight /></Link></div><div className="privacy-line"><LockKeyhole /> Private by default · audio or chat · first talk is free</div>{step === 'idle' && <div className="triage-row" role="group" aria-label="Language"><Button variant={lang === 'hi' ? 'default' : 'outline'} onClick={() => setLang('hi')}>हिंदी</Button><Button variant={lang === 'en' ? 'default' : 'outline'} onClick={() => setLang('en')}>English</Button></div>}{err && <p className="seeker-error">{err}</p>}</div>
        <div className="seeker-card"><div className="orb"><Headphones /></div><p className="eyebrow">A HUMAN IS HERE</p>
          {step === 'triage' ? (
            <><h2>A quick check — you can skip.</h2><p>Are you feeling unsafe with yourself right now?</p><div className="triage-row"><Button variant="outline" onClick={() => answerTriage('yes')}>Yes</Button><Button variant="outline" onClick={() => answerTriage('no')}>No</Button><Button onClick={() => answerTriage('skip')}>Skip →</Button></div></>
          ) : step === 'sos' ? (
            <><h2>You matter. Get human help now.</h2>{(helplines.length > 0 ? helplines : [{ name: 'Partner Helpline', phone: SOS_PHONE }]).map((h) => <p key={h.phone}>📞 {h.name}: <strong>{h.phone}</strong> (24×7)</p>)}<p>A supervised listener has been paged. Stay on this screen.</p><div className="triage-row"><Button variant="outline" onClick={leaveQueue}>Back to start</Button></div></>
          ) : step === 'chat' ? (
            <><h2>Talking now — take your time.</h2><p className="eyebrow">{minsLeft <= 2 ? `Wrapping up… ${minsLeft.toFixed(0)} min left` : `${minsLeft.toFixed(0)} min left of your free chat`}</p><div className="chat-area seeker-chat" ref={chatRef}>{messages.length === 0 && <div className="chat-time">No messages yet. Say hi — take your time.</div>}{messages.map((m, i) => <div key={m.id ?? i} className={`bubble ${m.sender === 'seeker' ? 'bubble-me' : 'bubble-them'}`}>{m.body}</div>)}</div><form className="composer" onSubmit={(e) => { e.preventDefault(); send() }}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type here…" maxLength={2000} /><button className="send-button" type="submit" aria-label="Send"><ArrowRight /></button></form><div className="triage-row"><Button variant="outline" onClick={() => endChat(undefined)}>End chat</Button></div></>
          ) : step === 'done' ? (
            <><h2>Did this help a little?</h2><p>{voteMsg || 'Your chat has ended. Thank you for trusting us.'}</p><div className="triage-row"><Button onClick={() => endChat(true)}>👍 Yes</Button><Button variant="outline" onClick={() => endChat(false)}>👎 Not really</Button></div><div className="triage-row"><Button variant="outline" onClick={leaveQueue}>Talk again</Button></div></>
          ) : (
            <><h2>{step === 'idle' ? 'A few minutes can change the weight of a day.' : step === 'joining' ? 'Finding your quiet match…' : `You're #${position} in line · ~${etaMin} min`}</h2><p>{step === 'idle' ? 'No pressure to be positive. No pressure to have the right words.' : 'You can use an alias. We’ll keep your first step simple.'}</p>{step === 'idle' ? <div className="online-row"><span className="status-dot" /> {online > 0 ? `${online} listeners online` : '6 listeners online'} <span>~2 min wait</span></div> : <div className="alias-box"><Sparkles /><div><small>Your private alias</small><strong>{alias}</strong></div><span className="status-dot" /></div>}</>
          )}
        </div>
      </section>
      <section className="seeker-trust" id="how-it-works"><div><ShieldCheck /><strong>Private</strong><span>Use an alias. No call logs.</span></div><div><Volume2 /><strong>Audio-first</strong><span>Chat or talk, your choice.</span></div><div><Sparkles /><strong>Gentle</strong><span>No diagnosis. Just a place to begin.</span></div></section>
      {step === 'queued' && <div className="seeker-queue"><div className="queue-spinner"><span /><span /><span /></div><div><strong>You&apos;re in the queue{position > 0 ? ` · #${position}` : ''}.</strong><p>Keep this tab open. We&apos;ll be with you soon{etaMin > 0 ? ` (~${etaMin} min)` : ''}.</p></div><Button variant="outline" onClick={leaveQueue}>Leave queue</Button></div>}
    </main>
  )
}
