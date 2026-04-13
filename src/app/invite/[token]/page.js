'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Zap, KeyRound, Lock, CheckCircle, XCircle } from 'lucide-react'
import { validateInviteToken, activateJudgeAccount } from '@/lib/actions/judges'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token

  const [status, setStatus] = useState('loading') // loading, valid, expired, done
  const [invite, setInvite] = useState(null)
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    checkToken()
  }, [token])

  async function checkToken() {
    const result = await validateInviteToken(token)
    if (result.error) {
      setStatus('expired')
      toast.error(result.error)
    } else {
      setInvite(result.data)
      setStatus('valid')
    }
  }

  function handlePinChange(index, value) {
    if (value.length > 1) return // Prevent paste of multiple chars
    if (value && !/^\d$/.test(value)) return // Only digits

    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)

    // Auto-focus next input
    if (value && index < 5) {
      const next = document.getElementById(`pin-${index + 1}`)
      next?.focus()
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prev = document.getElementById(`pin-${index - 1}`)
      prev?.focus()
    }
  }

  async function handleActivate(e) {
    e.preventDefault()
    const fullPin = pin.join('')
    if (fullPin.length !== 6) {
      toast.error('Please enter all 6 digits')
      return
    }

    setActivating(true)
    const result = await activateJudgeAccount(token, fullPin)
    if (result.error) {
      toast.error(result.error)
      setActivating(false)
      return
    }

    setStatus('done')
    toast.success('Account activated! Redirecting to login...')
    setTimeout(() => router.push(`/login?email=${encodeURIComponent(result.email)}`), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a0f 60%)',
      padding: '20px',
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            marginBottom: '16px',
          }}>
            <Zap size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>EventRank</h1>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Verifying invite link...</p>
          </div>
        )}

        {/* Expired */}
        {status === 'expired' && (
          <div style={{ textAlign: 'center' }}>
            <XCircle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Link Expired</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              This invite link is invalid or has expired. Please ask the admin for a new invite.
            </p>
          </div>
        )}

        {/* Valid - PIN Entry */}
        {status === 'valid' && invite && (
          <div style={{ textAlign: 'center' }}>
            <KeyRound size={32} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              Welcome, Judge!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
              You&apos;ve been invited as a judge for the event.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              {invite.email}
            </p>

            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
              Set a 6-digit PIN to access your account:
            </p>

            <form onSubmit={handleActivate}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    id={`pin-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="input-field"
                    style={{
                      width: '48px',
                      height: '56px',
                      textAlign: 'center',
                      fontSize: '20px',
                      fontWeight: '800',
                      letterSpacing: '2px',
                    }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={activating || pin.join('').length !== 6}
                style={{ width: '100%', padding: '12px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {activating ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <Lock size={18} />
                    Activate Account
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Done */}
        {status === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              Account Activated!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Redirecting to login page...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
