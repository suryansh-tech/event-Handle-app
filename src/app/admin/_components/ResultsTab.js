'use client'

import { useState, useEffect, useMemo } from 'react'
import { gooeyToast as toast } from 'goey-toast'
import { getParticipants } from '@/lib/actions/participants'
import { getCriteriaForEvent } from '@/lib/actions/criteria'
import { getAllScoresForEvent } from '@/lib/actions/scores'

export default function ResultsTab({ activeEvent }) {
  const [participants, setParticipants] = useState([])
  const [roundsCriteria, setRoundsCriteria] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRound, setSelectedRound] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  if (!activeEvent) {
    return (
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(226,232,240,0.6)', padding: 48, textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', display: 'block', marginBottom: 16 }}>error_outline</span>
        <p style={{ color: '#64748b', fontWeight: 500, fontSize: 14 }}>No active event.</p>
      </div>
    )
  }

  useEffect(() => {
    if (activeEvent?.id) {
      loadData()
    }
  }, [activeEvent?.id])

  async function loadData() {
    setLoading(true)
    const [pRes, cRes, sRes] = await Promise.all([
      getParticipants(activeEvent.id),
      getCriteriaForEvent(activeEvent.id),
      getAllScoresForEvent(activeEvent.id),
    ])

    setParticipants(pRes.data || [])
    setRoundsCriteria(cRes.data || [])
    setScores(sRes.data || [])
    setLoading(false)
  }

  // Optimize expensive derived state computation with useMemo
  const { 
    scoredCount, maxTotal, allTotals, mergedResults, filteredResults, 
    paginatedResults, totalPages 
  } = useMemo(() => {
    // 1. Manually calculate leaderboard scores locally since DB RPC blocks unpublished event organizers
    let results = participants.map(p => {
      let grandTotal = 0;
      let round_scores = {};
      let hasScores = false;

      roundsCriteria.forEach(r => {
        let roundTotal = 0;
        let criteriaScores = {};

        r.criteria.forEach(c => {
          // Find all scores given to this participant for this criteria
          const cScores = scores.filter(s => s.participant_id === p.id && s.criteria_id === c.id);
          // Aggregate logic: we sum the judges' scores
          const sumScore = cScores.reduce((sum, s) => sum + (s.score || 0), 0);
          
          if (cScores.length > 0) hasScores = true;

          criteriaScores[c.name] = sumScore;
          roundTotal += sumScore;
        });

        round_scores[r.name] = {
          criteria_scores: criteriaScores,
          round_total: roundTotal
        };
        grandTotal += roundTotal;
      });

      return {
        participant_id: p.id,
        name: p.name,
        enrollment_no: p.enrollment_no,
        weighted_total: grandTotal,
        round_scores: round_scores,
        hasScores: hasScores
      }
    })

    // Compute UI Ranks based strictly on weighted_total descending
    results.sort((a, b) => b.weighted_total - a.weighted_total)
    
    // Assign consecutive 1-based ranks 
    let currentRank = 1;
    results.forEach((r) => {
      r.uiRank = currentRank++; 
    });

    const scoredCount = results.filter(l => l.weighted_total > 0).length
    const allTotals = results.map(l => l.weighted_total || 0).filter(t => t > 0)
    const maxTotal = allTotals.length > 0 ? Math.max(...allTotals) : 1

    // Filter by selected round (if not 'all', requires >0 score in that round or total)
    if (selectedRound !== 'all') {
      results = results.filter(entry => {
        const rs = entry.round_scores?.[selectedRound]?.round_total || 0;
        return rs > 0 || entry.weighted_total > 0;
      })
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      results = results.filter(entry => 
        (entry.name && entry.name.toLowerCase().includes(q)) ||
        (entry.enrollment_no && entry.enrollment_no.toLowerCase().includes(q))
      )
    }

    // Pagination
    const itemsPerPage = 10;
    const totalPages = Math.ceil(results.length / itemsPerPage) || 1;
    // ensure current page is within bounds ideally, but handled in render
    const safePage = Math.min(currentPage, totalPages);
    const paginatedResults = results.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

    return { 
      scoredCount, maxTotal, allTotals, mergedResults: results, 
      filteredResults: results, paginatedResults, totalPages 
    }
  }, [participants, scores, roundsCriteria, searchQuery, selectedRound, currentPage])

  // Reset pagination on search or filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedRound])

  function exportCSV() {
    if (mergedResults.length === 0) {
      toast.error('No data to export')
      return
    }
    const allCriteria = []
    roundsCriteria.forEach(r => { r.criteria.forEach(c => { allCriteria.push(`${r.name} - ${c.name}`) }) })
    const headers = ['Rank', 'Name', 'Enrollment No', 'Branch', 'Year', ...allCriteria, 'Weighted Total']
    const rows = mergedResults.map(entry => {
      const criteriaValues = []
      roundsCriteria.forEach(r => {
        const rScores = entry.round_scores?.[r.name]
        r.criteria.forEach(c => { criteriaValues.push(rScores?.criteria_scores?.[c.name] ?? '—') })
      })
      const participant = participants.find(p => p.id === entry.participant_id) || {}
      return [entry.uiRank, entry.name, entry.enrollment_no || '', participant.branch || '', participant.year || '', ...criteriaValues, entry.weighted_total]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeEvent.name}-results.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported.', { description: 'CSV file generated successfully.' })
  }

  if (loading) return (
    <div style={{ padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 32, animation: 'ad-pulse 1.2s linear infinite' }}>hourglass_top</span>
      <p style={{ fontSize: 14, fontWeight: 500, marginTop: 16 }}>Loading results...</p>
    </div>
  )

  const totalCount = participants.length
  const scoredPercent = totalCount > 0 ? Math.round((scoredCount / totalCount) * 100) : 0

  // Top performers based on memoized results (unpaginated)
  const topPerformers = [...mergedResults].slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Page Header */}
      <div className="rt-page-header">
        <div>
          <h1 className="rt-hero-title">
            Results & <span style={{ color: '#432DD7' }}>Leaderboard</span>
          </h1>
          <p className="rt-hero-desc">
            Real-time high-density scoring matrix for {activeEvent.name}. Monitor round distributions and weighted outcomes.
          </p>
        </div>
        <div className="rt-header-actions">
          <button className="rt-export-btn" onClick={exportCSV}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Quick Stats */}
      <div className="rt-filter-row">
        <div className="rt-filter-card">
          {/* Segment Controls */}
          <div className="rt-segment-wrap">
            <button 
              className={`rt-segment-btn ${selectedRound === 'all' ? 'rt-segment-active' : ''}`}
              onClick={() => setSelectedRound('all')}
            >All Rounds</button>
            {roundsCriteria.map(r => (
              <button
                key={r.id}
                className={`rt-segment-btn ${selectedRound === r.name ? 'rt-segment-active' : ''}`}
                onClick={() => setSelectedRound(r.name)}
              >{r.name}</button>
            ))}
          </div>
          <div className="rt-filter-divider"></div>
          {/* Search */}
          <div className="rt-search-wrap">
            <span className="material-symbols-outlined rt-search-icon">search</span>
            <input 
              className="rt-search-input"
              placeholder="Search by name or enrollment ID..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Stats Tonal Card */}
        <div className="rt-stats-card">
          <p className="rt-stats-label">Participation</p>
          <div className="rt-stats-value">
            <span className="rt-stats-big">{scoredCount}</span>
            <span className="rt-stats-total">/ {totalCount} Scored</span>
          </div>
          <div className="rt-stats-bar">
            <div className="rt-stats-bar-fill" style={{ width: `${scoredPercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* Data Matrix Table */}
      {participants.length === 0 ? (
        <div style={{ padding: 80, borderRadius: 16, border: '2px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
          No participants imported yet.
        </div>
      ) : (
        <div className="rt-table-wrap">
          <div style={{ overflowX: 'auto' }}>
            <table className="rt-table">
              <thead>
                <tr className="rt-thead-row">
                  <th className="rt-th">Rank</th>
                  <th className="rt-th">Participant Details</th>
                  <th className="rt-th">Status</th>
                  
                  {/* Round Columns instead of Judge Columns */}
                  {roundsCriteria.map(r => (
                    <th key={r.id} className="rt-th rt-th-center rt-th-score">{r.name}</th>
                  ))}
                  <th className="rt-th rt-th-center rt-th-weighted">Weighted Total</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map(entry => {
                  const wt = entry.weighted_total || 0
                  const isScored = wt > 0 || entry.hasScores
                  const initials = (entry.name || '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                  const rank = entry.uiRank

                  return (
                    <tr key={entry.participant_id} className="rt-row">
                      {/* Rank */}
                      <td className="rt-td">
                        <div className="rt-rank-cell">
                          {rank <= 3 && isScored && (
                            <span 
                              className="material-symbols-outlined" 
                              style={{ 
                                fontSize: 20, 
                                fontVariationSettings: "'FILL' 1",
                                color: rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : '#b45309' 
                              }}
                            >military_tech</span>
                          )}
                          <span className="rt-rank-num">{isScored ? String(rank).padStart(2, '0') : '—'}</span>
                        </div>
                      </td>

                      {/* Participant Details */}
                      <td className="rt-td">
                        <div className="rt-participant-cell">
                          <div className="rt-participant-avatar">{initials}</div>
                          <div>
                            <p className="rt-participant-name">{entry.name}</p>
                            <p className="rt-participant-id">{entry.enrollment_no || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="rt-td">
                        {isScored ? (
                          <span className="rt-status-badge rt-badge-scored">Scored</span>
                        ) : (
                          <span className="rt-status-badge rt-badge-pending">Pending</span>
                        )}
                      </td>

                      {/* Round Scores */}
                      {roundsCriteria.map(r => {
                        // Extract pre-computed round score from DB leaderboard
                        const rTotal = entry.round_scores?.[r.name]?.round_total
                        return (
                          <td key={r.id} className="rt-td rt-td-center rt-td-score">
                            {rTotal !== undefined && rTotal > 0 ? (
                              <span style={{ fontWeight: 500, color: '#334155' }}>{Number(rTotal).toFixed(1)}</span>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            )}
                          </td>
                        )
                      })}

                      {/* Weighted Total */}
                      <td className={`rt-td rt-td-center rt-td-weighted ${isScored ? 'rt-wt-green' : 'rt-wt-red'}`}>
                        {isScored ? wt.toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination & Footer */}
          <div className="rt-table-footer" style={{ borderTop: '1px solid rgba(171,179,183,0.1)', background: 'rgba(241,244,246,0.2)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 14, color: '#586064', margin: 0 }}>
              Showing {paginatedResults.length > 0 ? ((currentPage - 1) * 10) + 1 : 0} to {((currentPage - 1) * 10) + paginatedResults.length} of {filteredResults.length} entries
            </p>
            
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '8px 16px', borderRadius: 8, background: currentPage === 1 ? '#f1f5f9' : 'white', border: '1px solid #e2e8f0', color: currentPage === 1 ? '#94a3b8' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}
                >
                  Previous
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, fontSize: 14, fontWeight: 600, color: '#432DD7' }}>
                  {currentPage}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '8px 16px', borderRadius: 8, background: currentPage === totalPages ? '#f1f5f9' : 'white', border: '1px solid #e2e8f0', color: currentPage === totalPages ? '#94a3b8' : '#334155', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Widgets */}
      <div className="rt-widgets-grid">
        {/* Score Distribution */}
        <div className="rt-widget-card">
          <span className="material-symbols-outlined rt-widget-bg-icon" style={{ fontSize: 120 }}>bar_chart</span>
          <h3 className="rt-widget-title">Score Distribution</h3>
          <p className="rt-widget-desc">Overview of all weighted totals</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
            <div className="rt-chart-bars" style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
              {allTotals.filter(t => t > 0).length === 0 ? (
                <p style={{ fontSize: 13, color: '#94a3b8', width: '100%', textAlign: 'center' }}>No score data yet</p>
              ) : (
                (() => {
                  const BINS = 12
                  const activeTotals = allTotals.filter(t => t > 0)
                  const step = maxTotal / BINS
                  const buckets = Array.from({ length: BINS }).map((_, i) => {
                    const min = i * step
                    const max = (i + 1) * step
                    const count = activeTotals.filter(t => t > min && t <= max).length
                    return { min, max, count }
                  })
                  const maxCount = Math.max(...buckets.map(b => b.count), 1)

                  return buckets.map((bucket, i) => {
                    const hPercent = Math.max((bucket.count / maxCount) * 100, 2) // Min 2% height for visibility
                    return (
                      <div key={i} className="group relative" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10">
                          <div className="bg-[#1e293b] text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-xl">
                            <span className="font-bold">{bucket.count}</span> participant{bucket.count !== 1 && 's'}<br/>
                            <span className="text-[#94a3b8]">{bucket.min.toFixed(1)} - {bucket.max.toFixed(1)} pts</span>
                          </div>
                          <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-[#1e293b]"></div>
                        </div>

                        {/* Bar */}
                        <div style={{ 
                          width: '100%', 
                          backgroundColor: bucket.count > 0 ? '#432DD7' : '#e2e8f0', 
                          borderRadius: '4px 4px 0 0', 
                          height: `${hPercent}%`, 
                          transition: 'height 0.3s ease, background-color 0.2s',
                          opacity: bucket.count > 0 ? 1 : 0.5
                        }} className={bucket.count > 0 ? "hover:bg-[#321fba] cursor-pointer" : ""} />
                        
                        {/* X-Axis Tick */}
                        <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>
                          {i % 2 === 0 ? bucket.min.toFixed(0) : ''}
                        </span>
                      </div>
                    )
                  })
                })()
              )}
            </div>
            
            {/* Quick Metrics */}
            {allTotals.filter(t => t > 0).length > 0 && (() => {
               const valid = allTotals.filter(t => t > 0).sort((a,b) => a-b)
               const avg = (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)
               const highest = valid[valid.length - 1].toFixed(1)
               const median = (valid[Math.floor(valid.length / 2)]).toFixed(1)
               return (
                 <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 'auto' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Avg Score</p>
                      <p style={{ margin: 0, fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{avg}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Median</p>
                      <p style={{ margin: 0, fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{median}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Highest</p>
                      <p style={{ margin: 0, fontSize: 13, color: '#432DD7', fontWeight: 700 }}>{highest}</p>
                    </div>
                 </div>
               )
            })()}
          </div>
        </div>

        {/* Top Performers List */}
        <div className="rt-widget-card">
          <span className="material-symbols-outlined rt-widget-bg-icon" style={{ fontSize: 120 }}>workspace_premium</span>
          <h3 className="rt-widget-title">Top Performers</h3>
          <p className="rt-widget-desc">Highest ranking participants</p>
          
          <ul className="rt-top-list">
            {topPerformers.length === 0 || topPerformers.every(p => p.weighted_total === 0) ? (
              <p style={{ fontSize: 13, color: '#94a3b8' }}>Awaiting evaluations...</p>
            ) : (
              topPerformers.filter(p => p.weighted_total > 0).map((tp, idx) => (
                <li key={tp.participant_id} className="rt-top-item">
                  <div className="rt-top-avatar" style={{ 
                    backgroundColor: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : '#fff7ed',
                    color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : '#c2410c'
                  }}>
                    {idx + 1}
                  </div>
                  <div className="rt-top-name">{tp.name}</div>
                  <div className="rt-top-score">{Number(tp.weighted_total).toFixed(1)}</div>
                </li>
              ))
            )}
            {topPerformers.filter(p => p.weighted_total > 0).length < 3 && (
              <li className="rt-top-item" style={{ opacity: 0.4 }}>
                <div className="rt-top-avatar" style={{ background: '#e2e8f0', color: '#94a3b8' }}>?</div>
                <span className="rt-top-name" style={{ fontStyle: 'italic', color: '#94a3b8' }}>Computing...</span>
              </li>
            )}
          </ul>
        </div>

        {/* Live Status */}
        <div className="rt-live-card">
          <div>
            <h3 className="rt-live-title">Live Status</h3>
            <div className="rt-live-badge">
              <span className="rt-live-dot"></span>
              Broadcasting
            </div>
          </div>
          <div>
            <p className="rt-live-desc">Official leaderboard will be visible to participants once published.</p>
            <button className="rt-live-btn" onClick={exportCSV}>
              Review and Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
