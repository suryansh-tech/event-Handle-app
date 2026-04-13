'use client'

import './judge.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getActiveEvent } from '@/lib/actions/events'
import { getParticipants } from '@/lib/actions/participants'
import { getCriteriaForEvent } from '@/lib/actions/criteria'
import { upsertScoresBatch, getScoresForJudge, upsertPenalty, getPenaltiesForJudge, getOtherJudgesStatus } from '@/lib/actions/scores'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export default function JudgePage() {
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [roundsCriteria, setRoundsCriteria] = useState([])
  const [scores, setScores] = useState({})
  const [penalties, setPenalties] = useState({})
  const [otherJudgesMap, setOtherJudgesMap] = useState({})
  const [judgeNames, setJudgeNames] = useState({})
  const [judgeId, setJudgeId] = useState(null)
  const [judgeName, setJudgeName] = useState('')
  const channelRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedRound, setSelectedRound] = useState(null)
  const [savingCells, setSavingCells] = useState({})
  const [loggingOut, setLoggingOut] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const supabase = createClient()
  const router = useRouter()
  const { isOnline, syncStatus, pendingCount, syncPending, saveScoreOffline, savePenaltyOffline, refreshPendingCount } = useOnlineStatus()

  useEffect(() => {
    loadData()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setJudgeId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .single()
    setJudgeName(profile?.name || profile?.email?.split('@')[0] || 'Judge')

    const { data: eventData } = await getActiveEvent()
    if (!eventData) {
      setLoading(false)
      return
    }
    setEvent(eventData)

    const [pRes, cRes, sRes, penRes, ojRes] = await Promise.all([
      getParticipants(eventData.id),
      getCriteriaForEvent(eventData.id),
      getScoresForJudge(eventData.id, user.id),
      getPenaltiesForJudge(eventData.id, user.id),
      getOtherJudgesStatus(eventData.id, user.id),
    ])

    setParticipants(pRes.data || [])
    setRoundsCriteria(cRes.data || [])
    if (cRes.data?.length > 0) {
      setSelectedRound(cRes.data[0].id)
    }

    const scoresMap = {}
    ;(sRes.data || []).forEach(s => {
      scoresMap[`${s.participant_id}_${s.criteria_id}`] = s.score
    })
    setScores(scoresMap)

    const penaltiesMap = {}
    ;(penRes.data || []).forEach(p => {
      penaltiesMap[p.participant_id] = p.penalty
    })
    setPenalties(penaltiesMap)

    // Build initial otherJudgesMap
    setOtherJudgesMap(ojRes.data || {})

    // Build judge ID -> Name map for realtime updates
    const nameMap = {}
    const { data: eventJudges } = await supabase
      .from('event_judges')
      .select('judge_id, profiles(name, email)')
      .eq('event_id', eventData.id)
    
    ;(eventJudges || []).forEach(ej => {
      nameMap[ej.judge_id] = ej.profiles?.name || ej.profiles?.email?.split('@')[0] || 'Unknown Judge'
    })
    setJudgeNames(nameMap)

    setLoading(false)
  }

  // ===== Real-Time Judging Status Sync (Direct Broadcast — Zero DB Load) =====
  useEffect(() => {
    if (!event?.id || !judgeId) return

    const channel = supabase.channel(`event-scores-${event.id}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'score_update' }, (payload) => {
        const { participantId, senderName, senderId } = payload.payload
        if (senderId === judgeId) return

        setOtherJudgesMap(prev => {
          const current = prev[participantId] || { count: 0, names: [] }
          if (!current.names.includes(senderName)) {
            return {
              ...prev,
              [participantId]: {
                count: current.count + 1,
                names: [...current.names, senderName]
              }
            }
          }
          return prev
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event?.id, judgeId])

  // Global Debounced Batch Save for Scores (with offline support)
  const pendingSavesRef = useRef({})
  const globalSaveTimerRef = useRef(null)
  const debounceTimers = useRef({})

  const handleScoreChange = useCallback((participantId, criteriaId, value) => {
    const key = `${participantId}_${criteriaId}`
    setScores(prev => ({ ...prev, [key]: value }))

    setSavingCells(prev => ({ ...prev, [key]: true }))

    pendingSavesRef.current[key] = {
      participantId,
      criteriaId,
      judgeId,
      score: Number(value)
    }

    if (globalSaveTimerRef.current) {
      clearTimeout(globalSaveTimerRef.current)
    }

    globalSaveTimerRef.current = setTimeout(async () => {
      const batchToSave = Object.values(pendingSavesRef.current)
      const keysToClear = Object.keys(pendingSavesRef.current)
      pendingSavesRef.current = {}

      if (batchToSave.length > 0) {
        if (navigator.onLine) {
          // Online: save directly to Supabase
          const { error } = await upsertScoresBatch(batchToSave)
          if (error) {
            // If online save fails, queue offline
            for (const s of batchToSave) {
              await saveScoreOffline(s)
            }
            toast.error('Save failed — scores queued for sync')
          }
        } else {
          // Offline: queue all scores in IndexedDB
          for (const s of batchToSave) {
            await saveScoreOffline(s)
          }
        }

        setSavingCells(prev => {
          const next = { ...prev }
          keysToClear.forEach(k => { next[k] = false })
          return next
        })

        // Notify other judges via broadcast (Single message per batch save)
        if (channelRef.current) {
          // Get unique participants in this batch to avoid spam
          const uniqueParticipants = [...new Set(batchToSave.map(s => s.participantId))]
          uniqueParticipants.forEach(pId => {
            channelRef.current.send({
              type: 'broadcast',
              event: 'score_update',
              payload: { participantId: pId, senderName: judgeName, senderId: judgeId }
            })
          })
        }
      }
    }, 1500)
  }, [judgeId, saveScoreOffline])

  const handlePenaltyChange = useCallback((participantId, value) => {
    setPenalties(prev => ({ ...prev, [participantId]: value }))

    const timerKey = `pen_${participantId}`
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey])
    }

    debounceTimers.current[timerKey] = setTimeout(async () => {
      setSavingCells(prev => ({ ...prev, [timerKey]: true }))
      if (navigator.onLine) {
        const { error } = await upsertPenalty(event.id, participantId, judgeId, Number(value))
        if (error) {
          await savePenaltyOffline({ eventId: event.id, participantId, judgeId, penalty: Number(value) })
          toast.error('Penalty save failed — queued for sync')
        }
      } else {
        await savePenaltyOffline({ eventId: event.id, participantId, judgeId, penalty: Number(value) })
      }
      setSavingCells(prev => ({ ...prev, [timerKey]: false }))

      // Notify other judges via broadcast
      if (channelRef.current && navigator.onLine) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'score_update',
          payload: { participantId, senderName: judgeName, senderId: judgeId }
        })
      }
    }, 500)
  }, [judgeId, event?.id, savePenaltyOffline])

  const totalCriteria = roundsCriteria.find(r => r.id === selectedRound)?.criteria.length || 0

  function isFullyScored(participantId, roundId) {
    const round = roundsCriteria.find(r => r.id === roundId)
    if (!round || !round.criteria.length) return false

    let scored = 0
    round.criteria.forEach(c => {
      if (scores[`${participantId}_${c.id}`] !== undefined && scores[`${participantId}_${c.id}`] !== '') scored++
    })
    return scored >= round.criteria.length
  }

  function getScoredCount(participantId, roundId) {
    const round = roundsCriteria.find(r => r.id === roundId)
    if (!round) return 0

    let scored = 0
    round.criteria.forEach(c => {
      if (scores[`${participantId}_${c.id}`] !== undefined && scores[`${participantId}_${c.id}`] !== '') scored++
    })
    return scored
  }

  function getParticipantTotal(participantId, roundId) {
    const round = roundsCriteria.find(r => r.id === roundId)
    if (!round) return { total: 0, max: 0 }

    let total = 0
    let max = 0
    round.criteria.forEach(c => {
      const val = scores[`${participantId}_${c.id}`]
      if (val !== undefined && val !== '') total += Number(val)
      max += c.max_score
    })
    const penalty = Number(penalties[participantId] || 0)
    return { total: total - penalty, max }
  }

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filtered = participants.filter(p => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.enrollment_no && p.enrollment_no.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    if (filter === 'scored') return isFullyScored(p.id, selectedRound)
    if (filter === 'pending') return !isFullyScored(p.id, selectedRound)
    return true
  })

  const totalScored = participants.filter(p => isFullyScored(p.id, selectedRound)).length

  if (loading) {
    return (
      <div className="jw-page">
        <div className="jw-loading">
          <span className="material-symbols-outlined jw-loading-icon">hourglass_top</span>
          <p className="jw-loading-text">Initializing Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="jw-page">
        <div className="jw-loading">
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#abb3b7' }}>event_busy</span>
          <p className="jw-loading-text" style={{ marginTop: 16 }}>No active event found.</p>
          <p className="jw-loading-text" style={{ fontSize: 10, marginTop: 4 }}>Check back later or contact admin</p>
          <button onClick={() => router.push('/')} className="jw-btn-back">Return to Home</button>
        </div>
      </div>
    )
  }

  const currentRoundCriteria = roundsCriteria.find(r => r.id === selectedRound)
  const deadline = currentRoundCriteria?.deadline ? new Date(currentRoundCriteria.deadline) : null
  const isExpired = deadline && currentTime > deadline

  let timerDisplay = null
  if (deadline && !isExpired) {
    const diff = deadline - currentTime
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    const secs = Math.floor((diff % 60000) / 1000)

    if (hours > 0) {
      timerDisplay = `${hours}h ${mins}m ${secs.toString().padStart(2, '0')}s`
    } else {
      timerDisplay = `${mins}m ${secs.toString().padStart(2, '0')}s`
    }
  }

  const scoringProgressPercent = participants.length > 0 ? Math.round((totalScored / participants.length) * 100) : 0

  return (
    <div className="jw-shell">
      {/* ===== Connection Status Banner ===== */}
      <div className={`jw-conn-banner ${syncStatus === 'online' ? 'jw-conn-online' : syncStatus === 'syncing' ? 'jw-conn-syncing' : 'jw-conn-offline'}`}>
        <div className="jw-conn-left">
          <span className={`jw-conn-dot ${syncStatus === 'online' ? 'jw-dot-green' : syncStatus === 'syncing' ? 'jw-dot-amber' : 'jw-dot-red'}`}></span>
          <span className="jw-conn-text">
            {syncStatus === 'online' && '🟢 Connected — All scores synced'}
            {syncStatus === 'syncing' && '🟡 Syncing scores...'}
            {syncStatus === 'offline' && (
              <>
                🔴 Offline — {pendingCount > 0 ? `${pendingCount} score${pendingCount !== 1 ? 's' : ''} pending` : 'scores are not being saved'}
              </>
            )}
          </span>
        </div>
        {syncStatus === 'offline' && pendingCount > 0 && isOnline && (
          <button className="jw-conn-sync-btn" onClick={syncPending}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync</span>
            Retry Sync
          </button>
        )}
        {syncStatus === 'offline' && !isOnline && (
          <span className="jw-conn-badge">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>wifi_off</span>
            Offline Mode Active
          </span>
        )}
      </div>

      {/* ===== TopAppBar ===== */}
      <header className="jw-header">
        <div className="jw-header-left">
          <span className="jw-brand">Judicial Workspace</span>
          <div className="jw-header-divider"></div>
          <div className="jw-header-event">
            <span className="jw-header-event-label">ACTIVE EVENT</span>
            <span className="jw-header-event-name">{event.name}</span>
          </div>
        </div>
        <div className="jw-header-right">
          <div className="jw-progress-chip">
            <div className="jw-progress-chip-inner">
              <span className="jw-progress-chip-label">Scoring Progress</span>
              <span className="jw-progress-chip-value">{totalScored} / {participants.length} <span className="jw-progress-chip-unit">Participants</span></span>
            </div>
            <div className="jw-progress-bar-mini">
              <div className="jw-progress-bar-fill" style={{ width: `${scoringProgressPercent}%` }}></div>
            </div>
          </div>

          {/* Compact sync indicator in header */}
          <div className={`jw-sync-chip ${syncStatus === 'online' ? 'jw-sync-green' : syncStatus === 'syncing' ? 'jw-sync-amber' : 'jw-sync-red'}`}
            title={syncStatus === 'online' ? 'All scores synced' : syncStatus === 'syncing' ? 'Syncing...' : `${pendingCount} pending`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {syncStatus === 'online' ? 'cloud_done' : syncStatus === 'syncing' ? 'sync' : 'cloud_off'}
            </span>
            {pendingCount > 0 && (
              <span className="jw-sync-count">{pendingCount}</span>
            )}
          </div>

          <div className="jw-header-user">
            <div className="jw-header-user-info">
              <p className="jw-header-user-name">{judgeName}</p>
              <p className="jw-header-user-role">Judge</p>
            </div>
            <button className="jw-icon-btn" title="Gavel">
              <span className="material-symbols-outlined">gavel</span>
            </button>
            {/* 
            <button className="jw-icon-btn jw-icon-btn-notif" title="Notifications" style={{ position: 'relative' }}>
              <span className="material-symbols-outlined">notifications</span>
              <span className="jw-notif-dot"></span>
            </button>
            */}
            <button onClick={handleLogout} disabled={loggingOut} className="jw-icon-btn" title="Logout">
              <span className="material-symbols-outlined">{loggingOut ? 'sync' : 'logout'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="jw-body">
        {/* ===== SideNavBar ===== */}
        <aside className="jw-sidebar">
          <div className="jw-sidebar-head">
            <h2 className="jw-sidebar-title">Scoring Board</h2>
            <p className="jw-sidebar-subtitle">{event.name}</p>
          </div>
          <nav className="jw-sidebar-nav">
            <a className="jw-sidebar-link jw-sidebar-link-active" href="#">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
              <span>Scoring</span>
            </a>
          </nav>
        </aside>

        {/* ===== Main Content ===== */}
        <main className="jw-main">
          {/* Deadline Banner */}
          {deadline && (
            <div className={`jw-deadline-banner ${isExpired ? 'jw-deadline-expired' : ''}`}>
              <div className="jw-deadline-left">
                <span className={`material-symbols-outlined jw-deadline-icon ${!isExpired ? 'jw-pulse' : ''}`}>
                  {isExpired ? 'timer_off' : 'timer'}
                </span>
                <p className="jw-deadline-text">
                  {isExpired ? (
                    <span className="jw-deadline-label">Scoring phase has ended.</span>
                  ) : (
                    <>
                      Round Deadline Approaching: <span className="jw-deadline-time">{timerDisplay}</span> remaining for current scoring phase.
                    </>
                  )}
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <button className="jw-deadline-action" onClick={() => setShowSchedule(!showSchedule)}>
                  View Schedule
                </button>
                {showSchedule && deadline && (
                  <div className="jw-schedule-card">
                    <div className="jw-calendar-icon">
                      <span className="jw-cal-month">{deadline.toLocaleString('default', { month: 'short' })}</span>
                      <span className="jw-cal-date">{deadline.getDate()}</span>
                    </div>
                    <div className="jw-schedule-details">
                      <p className="jw-schedule-title">Round Ends</p>
                      <p className={`jw-schedule-countdown ${isExpired ? 'jw-expired-text' : ''}`}>
                        {isExpired ? 'Scoring Closed' : timerDisplay}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="jw-content">
            <div className="jw-content-inner">
              {/* Navigation & Filter Bar */}
              <div className="jw-filters-bar">
                {/* Left side: Search and Status Filters */}
                <div className="jw-filters-left">
                  <div className="jw-search-wrap">
                    <span className="material-symbols-outlined jw-search-icon">search</span>
                    <input
                      className="jw-search-input"
                      placeholder="Search participant..."
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="jw-segmented-control jw-segmented-alt">
                    {['all', 'pending', 'scored'].map(f => (
                      <button
                        key={f}
                        className={filter === f ? 'active' : ''}
                        onClick={() => setFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right side: Round Tabs */}
                {roundsCriteria.length > 0 && (
                  <div className="jw-segmented-control">
                    {roundsCriteria.map((r, idx) => (
                      <button
                        key={r.id}
                        className={selectedRound === r.id ? 'active' : ''}
                        onClick={() => setSelectedRound(r.id)}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* High-Density Data Table */}
              <div className="jw-table-card">
                <div className="jw-table-scroll">
                  <table className="jw-table">
                    <thead>
                      <tr>
                        <th className="jw-th jw-th-name">Participant Name</th>
                        {currentRoundCriteria?.criteria.map(c => (
                          <th key={c.id} className="jw-th jw-th-center">{c.name} ({c.max_score})</th>
                        ))}
                        {event.result_mode?.includes('_penalty') && (
                          <th className="jw-th jw-th-center jw-th-penalty">Penalty</th>
                        )}
                        <th className="jw-th jw-th-right">Total Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(participant => {
                        const fullyScored = isFullyScored(participant.id, selectedRound)
                        const { total, max } = getParticipantTotal(participant.id, selectedRound)
                        const initials = participant.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??'

                        return (
                          <tr key={participant.id} className={fullyScored ? 'jw-row-scored' : 'jw-row-pending'}>
                            <td className="jw-td">
                              <div className="jw-participant-cell">
                                <div className="jw-participant-avatar-wrap">
                                  {fullyScored ? (
                                    <div className="jw-participant-avatar jw-avatar-scored">
                                      {initials}
                                      <span className="jw-check-badge">
                                        <span className="material-symbols-outlined jw-check-icon">check</span>
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="jw-participant-avatar jw-avatar-pending">{initials}</div>
                                  )}
                                </div>
                                <div>
                                  <p className="jw-participant-name">{participant.name}</p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <p className="jw-participant-id">{participant.enrollment_no || '—'}</p>
                                    {otherJudgesMap[participant.id] && (
                                      <div className="jw-other-status" title={otherJudgesMap[participant.id].names.join(', ')}>
                                        <span className="jw-other-scored-badge">
                                          Scored by {otherJudgesMap[participant.id].count} {otherJudgesMap[participant.id].count === 1 ? 'judge' : 'judges'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {currentRoundCriteria?.criteria.map(criteria => {
                              const key = `${participant.id}_${criteria.id}`
                              const currentScore = scores[key]
                              const isSaving = savingCells[key]
                              return (
                                <td key={criteria.id} className="jw-td">
                                  <input
                                    className={`jw-score-input ${fullyScored ? 'jw-score-filled' : 'jw-score-empty'}`}
                                    type="number"
                                    min="0"
                                    max={criteria.max_score}
                                    step="0.5"
                                    value={currentScore ?? ''}
                                    onChange={(e) => handleScoreChange(participant.id, criteria.id, e.target.value)}
                                    placeholder="--"
                                    disabled={isExpired}
                                  />
                                </td>
                              )
                            })}
                            {event.result_mode?.includes('_penalty') && (
                              <td className="jw-td jw-td-center">
                                <input
                                  className="jw-penalty-input"
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={penalties[participant.id] ?? ''}
                                  onChange={(e) => handlePenaltyChange(participant.id, e.target.value)}
                                  placeholder="0"
                                  disabled={isExpired}
                                />
                              </td>
                            )}
                            <td className="jw-td jw-td-right">
                              {fullyScored ? (
                                <span className="jw-total-score">{total}/{max}</span>
                              ) : (
                                <span className="jw-total-pending">--/{max}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}

                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={100} className="jw-td" style={{ textAlign: 'center', padding: '48px 24px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#abb3b7', display: 'block', marginBottom: 8 }}>search_off</span>
                            <p style={{ fontSize: 11, fontWeight: 800, color: '#586064', textTransform: 'uppercase', letterSpacing: '0.1em' }}>No participants matched your search</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>


    </div>
  )
}
