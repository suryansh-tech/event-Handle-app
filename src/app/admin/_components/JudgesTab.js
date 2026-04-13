'use client'

import { useState, useEffect } from 'react'
import { gooeyToast as toast } from 'goey-toast'
import { inviteJudge, getJudgesForEvent, removeJudge, resetJudgePassword } from '@/lib/actions/judges'

export default function JudgesTab({ activeEvent }) {
  const [judges, setJudges] = useState([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [resetCredentials, setResetCredentials] = useState(null)

  if (!activeEvent) {
    return (
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(226,232,240,0.6)', padding: 48, textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', display: 'block', marginBottom: 16 }}>error_outline</span>
        <p style={{ color: '#64748b', fontWeight: 500, fontSize: 14 }}>No active event. Go to Events tab and set one as active first.</p>
      </div>
    )
  }

  useEffect(() => { loadJudges() }, [activeEvent?.id])

  async function loadJudges() {
    setLoading(true)
    const { data, error } = await getJudgesForEvent(activeEvent.id)
    if (error) toast.error(error)
    else setJudges(data || [])
    setLoading(false)
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    const tid = toast('Sending invite...')
    const result = await inviteJudge(activeEvent.id, email.trim())
    toast.dismiss(tid)
    if (result.error) {
      toast.error(result.error)
    } else {
      const inviteUrl = `${window.location.origin}/invite/${result.token}`
      toast.success('Added.', {
        description: result.credentials ? 'Temporary password generated.' : 'Existing judge added to event.'
      })
      if (result.credentials) {
        setResetCredentials(result.credentials)
      } else {
        try { await navigator.clipboard.writeText(inviteUrl) } catch { }
      }
      setEmail('')
      await loadJudges()
    }
    setInviting(false)
  }

  function copyInviteLink(token) {
    const inviteUrl = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(inviteUrl)
    toast.success('Copied.', { description: 'Invite link copied to clipboard.' })
  }

  async function performRemove(judgeId) {
    const tid = toast('Removing...')
    const { error } = await removeJudge(activeEvent.id, judgeId)
    toast.dismiss(tid)
    if (error) toast.error(error)
    else {
      toast.warning('Removed.', { description: 'Judge access revoked.' })
      await loadJudges()
    }
  }

  function handleRemove(judgeId) {
    toast.error('Delete Judge?', {
      description: 'Remove this judge from the active event?',
      action: {
        label: 'Yes, Delete',
        onClick: () => performRemove(judgeId)
      }
    })
  }

  async function performReset(judgeId, judgeEmail) {
    const tid = toast('Resetting password...')
    const result = await resetJudgePassword(judgeId, judgeEmail)
    toast.dismiss(tid)
    if (result.error) {
      toast.error(result.error)
    } else {
      setResetCredentials(result.credentials)
      toast.success('Reset.', { description: `Password reset for ${judgeEmail}.` })
    }
  }

  function handleResetPassword(judgeId, judgeEmail) {
    toast.warning('Reset password?', {
      description: `Generates a new password for ${judgeEmail}.`,
      action: {
        label: 'Confirm',
        onClick: () => performReset(judgeId, judgeEmail)
      }
    })
  }

  // Stats
  const activeCount = judges.filter(j => j.inviteUsed).length
  const pendingCount = judges.filter(j => j.inviteToken && !j.inviteUsed && !j.inviteExpired).length
  const avgProgress = judges.length > 0
    ? Math.round(judges.reduce((sum, j) => sum + (j.total > 0 ? (j.scored / j.total) * 100 : 0), 0) / judges.length)
    : 0
  const verifiedCount = judges.filter(j => j.inviteUsed).length

  // Filtered judges for table
  const filteredJudges = judges.filter(j => {
    if (!searchFilter) return true
    const q = searchFilter.toLowerCase()
    return (j.name && j.name.toLowerCase().includes(q)) || j.email.toLowerCase().includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Page Header */}
      <div className="jt-page-header">
        <div>
          <h2 className="jt-title">Judges Management</h2>
          <p className="jt-subtitle">Configure scoring panels and monitor evaluation progress in real-time.</p>
        </div>
        <div className="jt-status-pills">
          <span className="jt-pill">
            <span className="jt-pill-dot jt-dot-green"></span>
            {activeCount} ACTIVE
          </span>
          <span className="jt-pill">
            <span className="jt-pill-dot jt-dot-amber"></span>
            {pendingCount} PENDING
          </span>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="jt-bento-grid">
        {/* Invite Judges Card */}
        <section className="jt-invite-card">
          <div className="jt-invite-header">
            <div className="jt-invite-icon">
              <span className="material-symbols-outlined" style={{ color: '#432DD7' }}>mail</span>
            </div>
            <h3 className="jt-card-title">Invite Judges</h3>
          </div>
          <form onSubmit={handleInvite} className="jt-invite-form">
            <div>
              <label className="jt-label">Email Address</label>
              <input
                className="jt-input"
                type="email"
                placeholder="judge@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="jt-invite-btn" disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
            <p className="jt-invite-hint">Invited judges will receive an email to activate their account and access the scoring dashboard.</p>
          </form>
        </section>

        {/* Stats Overview (2-column) */}
        <section className="jt-stats-grid">
          {/* Average Scoring Progress — dark card */}
          <div className="jt-stat-dark">
            <div className="jt-stat-dark-content">
              <span className="jt-stat-label-light">Average Scoring Progress</span>
              <div className="jt-stat-big">{avgProgress}%</div>
              <div className="jt-stat-bar-dark">
                <div className="jt-stat-bar-fill-purple" style={{ width: `${avgProgress}%` }}></div>
              </div>
            </div>
            <div className="jt-stat-dark-bg">
              <span className="material-symbols-outlined" style={{ fontSize: 128 }}>analytics</span>
            </div>
          </div>

          {/* Verification Rate — light card */}
          <div className="jt-stat-light">
            <span className="jt-stat-label-dark">Verification Rate</span>
            <div className="jt-stat-big-dark">{verifiedCount} / {judges.length}</div>
            <p className="jt-stat-change">
              {pendingCount > 0 ? `${pendingCount} pending activation` : 'All judges activated'}
            </p>
            <div className="jt-avatar-stack">
              {judges.slice(0, 3).map((j, i) => (
                <div key={i} className="jt-avatar-circle">
                  {(j.name || j.email).charAt(0).toUpperCase()}
                </div>
              ))}
              {judges.length > 3 && (
                <div className="jt-avatar-circle jt-avatar-more">+{judges.length - 3}</div>
              )}
            </div>
          </div>
        </section>

        {/* Invite Tracking Table */}
        <section className="jt-table-card">
          <div className="jt-table-header">
            <h3 className="jt-card-title">Invite Tracking &amp; Progress</h3>
            <div className="jt-table-search-wrap">
              <span className="material-symbols-outlined jt-table-search-icon">search</span>
              <input
                className="jt-table-search"
                placeholder="Filter judges..."
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, animation: 'ad-pulse 1.2s linear infinite' }}>hourglass_top</span>
            </div>
          ) : filteredJudges.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              {judges.length === 0 ? 'No judges invited yet.' : 'No judges match your filter.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="jt-table">
                <thead>
                  <tr>
                    <th className="jt-th">Judge Details</th>
                    <th className="jt-th">Status</th>
                    <th className="jt-th">Invite Link</th>
                    <th className="jt-th">Scoring Progress</th>
                    <th className="jt-th jt-th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJudges.map(judge => {
                    const progress = judge.total > 0 ? Math.round((judge.scored / judge.total) * 100) : 0
                    const hasValidInvite = judge.inviteToken && !judge.inviteUsed && !judge.inviteExpired
                    const isActivated = judge.inviteUsed
                    const isExpired = judge.inviteExpired
                    const initials = (judge.name || judge.email).charAt(0).toUpperCase()

                    return (
                      <tr key={judge.id} className={`jt-row ${isExpired && !isActivated ? 'jt-row-expired' : ''}`}>
                        {/* Judge Details */}
                        <td className="jt-td">
                          <div className="jt-judge-cell">
                            <div style={{ position: 'relative' }}>
                              <div className={`jt-judge-avatar ${isActivated ? 'jt-avatar-active' : 'jt-avatar-inactive'}`}>
                                {initials}
                              </div>
                              {isActivated && progress === 100 && (
                                <div className="jt-verified-badge">
                                  <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1", color: '#432DD7' }}>verified</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="jt-judge-name">{judge.name || judge.email.split('@')[0]}</div>
                              <div className="jt-judge-email">{judge.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="jt-td">
                          {isActivated ? (
                            <span className="jt-badge jt-badge-green">ACTIVATED</span>
                          ) : isExpired ? (
                            <span className="jt-badge jt-badge-slate">EXPIRED</span>
                          ) : (
                            <span className="jt-badge jt-badge-amber">PENDING</span>
                          )}
                        </td>

                        {/* Invite Link */}
                        <td className="jt-td">
                          {judge.inviteToken ? (
                            <div className="jt-link-cell">
                              <code className="jt-link-code">
                                {isExpired && !isActivated ? 'expired' : `…/${judge.inviteToken.slice(0, 6)}`}
                              </code>
                              {hasValidInvite && (
                                <button className="jt-copy-btn" onClick={() => copyInviteLink(judge.inviteToken)}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* Scoring Progress */}
                        <td className="jt-td">
                          <div className="jt-progress-cell">
                            <div className="jt-progress-track">
                              <div
                                className={`jt-progress-fill ${progress === 100 ? 'jt-fill-green' : 'jt-fill-purple'}`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className="jt-progress-text">{progress}%</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="jt-td jt-td-right">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <button
                              className="jt-reset-btn"
                              title="Reset Password"
                              onClick={() => handleResetPassword(judge.id, judge.email)}
                              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock_reset</span>
                            </button>
                            <button className="jt-delete-btn" title="Remove Judge" onClick={() => handleRemove(judge.id)}>
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="jt-table-footer">
            <span>Showing {filteredJudges.length} of {judges.length} judges</span>
          </div>
        </section>

        {/* Password Reset Credentials Modal */}
        {resetCredentials && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setResetCredentials(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 16, padding: 32,
                maxWidth: 400, width: '90%',
                boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
                border: '1px solid rgba(226,232,240,0.6)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#d97706' }}>key</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: '#2b3437' }}>New Credentials</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#586064' }}>Share these with the judge securely</p>
                </div>
              </div>

              <div style={{
                background: '#f8fafc', borderRadius: 12, padding: 16,
                border: '1px solid #e2e8f0', marginBottom: 20,
                display: 'flex', flexDirection: 'column', gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>Email</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{resetCredentials.email}</span>
                </div>
                <div style={{ height: 1, background: '#e2e8f0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>Temporary Password</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{resetCredentials.password}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Email: ${resetCredentials.email}\nPassword: ${resetCredentials.password}`)
                    toast.success('Credentials copied to clipboard!')
                  }}
                  className="ad-btn-primary"
                  style={{ flex: 1, padding: '10px 16px', fontSize: 13 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                  Copy Credentials
                </button>
                <button
                  onClick={() => setResetCredentials(null)}
                  className="ad-btn-secondary"
                  style={{ padding: '10px 16px', fontSize: 13 }}
                >
                  Close
                </button>
              </div>

              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>
                ⚠️ This password will not be shown again. Please note it down.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
