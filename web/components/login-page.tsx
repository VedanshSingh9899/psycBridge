'use client'

import { ArrowRight, Headphones, LockKeyhole, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const DEMO_OTP = '123456'
const ADMIN_PASSCODE = 'admin-123'

export default function LoginPage() {
  const [role, setRole] = useState<'listener' | 'coordinator'>('listener')
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [passcode, setPasscode] = useState('')
  const [err, setErr] = useState('')

  function sendOtp() {
    if (phone.replace(/\D/g, '').length < 10) {
      setErr('Enter a valid 10-digit phone number.')
      return
    }
    setErr('')
    setOtpSent(true)
  }

  function verifyOtp() {
    if (otp.trim() === DEMO_OTP) {
      localStorage.setItem('pb_listener_id', 'listener-1')
      localStorage.setItem('pb_listener_phone', phone)
      window.location.href = '/'
    } else {
      setErr(`Wrong code. Demo code is ${DEMO_OTP}.`)
    }
  }

  function unlockAdmin() {
    if (passcode.trim() === ADMIN_PASSCODE) {
      localStorage.setItem('pb_admin_ok', '1')
      window.location.href = '/admin'
    } else {
      setErr(`Wrong passcode (demo: ${ADMIN_PASSCODE}).`)
    }
  }

  return (
    <main className="login-shell">
      <div className="login-visual">
        <Link href="/" className="brand-mark"><span>pb</span><div><strong>PB Wellness</strong><small>A calmer way forward</small></div></Link>
        <div className="login-quote"><p className="eyebrow">WELCOME BACK</p><h1>Care works better when no one carries it alone.</h1><p>Sign in to your private workspace. Seekers can always start a first talk without an account.</p></div>
        <div className="login-safety"><ShieldCheck /> Your workspace is private by default</div>
      </div>
      <section className="login-panel">
        <div className="login-panel-inner">
          <div className="mobile-login-brand"><Link href="/" className="brand-mark"><span>pb</span><div><strong>PB Wellness</strong><small>Private workspace</small></div></Link></div>
          <p className="eyebrow">PRIVATE WORKSPACE</p>
          <h2>Sign in to continue</h2>
          <p className="login-subtitle">For listeners and coordinators. Seekers can <Link href="/seeker">start a talk without signing in</Link>.</p>
          <div className="role-switch" role="tablist" aria-label="Workspace type">
            <button type="button" className={role === 'listener' ? 'role-selected' : ''} onClick={() => { setRole('listener'); setErr('') }}><Headphones /> Listener</button>
            <button type="button" className={role === 'coordinator' ? 'role-selected' : ''} onClick={() => { setRole('coordinator'); setErr('') }}>Coordinator</button>
          </div>
          {err && <p className="seeker-error">{err}</p>}
          {role === 'listener' ? (
            !otpSent ? (
              <form onSubmit={(e) => { e.preventDefault(); sendOtp() }} className="login-form">
                <label className="login-label" htmlFor="phone">Phone (10-digit)</label>
                <input className="login-input" id="phone" name="phone" type="tel" inputMode="numeric" maxLength={13} placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <div className="login-options"><label><input type="checkbox" /> Remember this device</label></div>
                <Button className="login-submit" type="submit">Send OTP <ArrowRight data-icon="inline-end" /></Button>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); verifyOtp() }} className="login-form">
                <p className="login-subtitle">Code sent to {phone} (demo code: <strong>{DEMO_OTP}</strong>).</p>
                <label className="login-label" htmlFor="otp">6-digit code</label>
                <input className="login-input" id="otp" name="otp" type="text" inputMode="numeric" maxLength={6} placeholder="••••••" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                <Button className="login-submit" type="submit">Verify <ArrowRight data-icon="inline-end" /></Button>
                <div className="login-options"><label> </label><button type="button" onClick={() => { setOtpSent(false); setOtp('') }}>← wrong number? go back</button></div>
              </form>
            )
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); unlockAdmin() }} className="login-form">
              <label className="login-label" htmlFor="passcode">Coordinator passcode</label>
              <input className="login-input" id="passcode" name="passcode" type="password" placeholder="Internal only" value={passcode} onChange={(e) => setPasscode(e.target.value)} required />
              <Button className="login-submit" type="submit">Unlock console <ArrowRight data-icon="inline-end" /></Button>
            </form>
          )}
          <div className="login-divider"><span>or</span></div>
          <Link href="/seeker" style={{ textDecoration: 'none' }}><Button variant="outline" className="guest-button"><LockKeyhole data-icon="inline-start" /> Continue as seeker</Button></Link>
          <p className="login-footer">By continuing, you agree to our privacy-first care guidelines.</p>
        </div>
      </section>
    </main>
  )
}
