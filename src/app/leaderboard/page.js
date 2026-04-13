'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLeaderboard } from '@/lib/actions/scores'
import { getCriteriaForEvent } from '@/lib/actions/criteria'

export default function LeaderboardPage() {
  const [event, setEvent] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [roundsCriteria, setRoundsCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  // Update "seconds ago" ticker
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  // Polling for score changes (every 30 seconds)
  useEffect(() => {
    if (!event?.id) return

    const interval = setInterval(() => {
      refetchLeaderboard()
    }, 30000)

    return () => clearInterval(interval)
  }, [event?.id])

  async function loadData() {
    setLoading(true)

    const { data: eventData } = await supabase
      .from('events')
      .select('id, name, description, is_active, is_published, result_mode, created_at')
      .eq('is_active', true)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!eventData) {
      setLoading(false)
      return
    }

    setEvent(eventData)

    // Fetch criteria and leaderboard in parallel (independent calls)
    const [criteriaResult, lbResult] = await Promise.all([
      getCriteriaForEvent(eventData.id),
      getLeaderboard(eventData.id),
    ])

    setRoundsCriteria(criteriaResult.data || [])
    setLeaderboard(lbResult.data || [])
    setLastUpdated(Date.now())
    setLoading(false)
  }

  async function refetchLeaderboard() {
    if (!event?.id) return
    const { data: lb } = await getLeaderboard(event.id)
    setLeaderboard(lb || [])
    setLastUpdated(Date.now())
    setSecondsAgo(0)
  }

  const maxWeightedTotal = leaderboard.length > 0
    ? Math.max(...leaderboard.map(e => e.weighted_total || 0), 1)
    : 1

  const avgScore = leaderboard.length > 0
    ? (leaderboard.reduce((sum, e) => sum + (e.weighted_total || 0), 0) / leaderboard.length).toFixed(1)
    : "0.0"

  const allCriteria = roundsCriteria.flatMap(r => r.criteria)

  if (loading) {
    return (
      <div className="bg-[#0a1327] min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(circle at center, #0F172B 0%, #000000 100%)' }}>
        <span className="material-symbols-outlined animate-spin text-[#d2bbff]" style={{ fontSize: 48 }}>progress_activity</span>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="bg-[#0a1327] text-[#dae2fe] min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'radial-gradient(circle at center, #0F172B 0%, #000000 100%)' }}>
        <span className="material-symbols-outlined text-[#958da1]" style={{ fontSize: 64 }}>visibility_off</span>
        <h2 className="text-2xl font-bold font-headline">No Live Event</h2>
        <p className="text-[#ccc3d8]">There is no published event right now. Check back later!</p>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body {
            background: radial-gradient(circle at center, #0F172B 0%, #000000 100%) !important;
        }
        .glass-row {
            backdrop-filter: blur(12px) !important;
        }
        
        /* Shadcn variable overrides for this layout to prevent color clashing */
        .arena-wrapper {
          --primary: #d2bbff;
          --secondary: #4edea3;
          --tertiary: #ffb95f;
          --background: #0a1327;
          --foreground: #dae2fe;
          --error: #ffb4ab;
        }
      `}} />
      <div className="arena-wrapper bg-[#0a1327] text-[#dae2fe] font-body min-h-screen relative dark">
        
        {/* TopAppBar */}
        <header className="fixed top-0 w-full flex justify-between items-center px-6 py-4 bg-gradient-to-b from-slate-950 to-transparent z-50 bg-slate-950/40 backdrop-blur-xl shadow-[0_4px_30px_rgba(124,58,237,0.1)]">
          <div className="flex items-center gap-2 text-purple-400 font-black tracking-tighter italic">
            <span className="material-symbols-outlined text-2xl" data-icon="bolt">bolt</span>
            <span className="text-2xl font-extrabold tracking-tighter font-headline">ARENA LIVE</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-purple-400 border-b-2 border-purple-500 pb-1 font-semibold uppercase text-xs">Leaderboard</a>
            <a href="#" className="text-slate-400 hover:text-slate-200 transition-colors font-semibold uppercase text-xs"><br/></a>
            <a href="#" className="text-slate-400 hover:text-slate-200 transition-colors font-semibold uppercase text-xs"><br/></a>
          </nav>
          <div className="flex items-center gap-4">
            <span 
              className="material-symbols-outlined text-slate-400 cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all" 
              title="Refresh Leaderboard"
              onClick={refetchLeaderboard}
            >
              history
            </span>
            <button className="bg-[#7c3aed] text-[#ede0ff] px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider scale-95 active:scale-90 transition-transform hidden sm:block">
              {event.name}
            </button>
          </div>
        </header>

        {/* Main Content Canvas */}
        <main className="pt-28 pb-12 px-6 md:px-12 max-w-7xl mx-auto">
          
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2 bg-[#4edea3]/10 text-[#4edea3] px-3 py-1 rounded-full text-xs font-bold tracking-widest border border-[#4edea3]/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4edea3]"></span>
                  </span>
                  ● LIVE
                </div>
              <span className="text-[#ccc3d8] text-xs font-medium font-body flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">schedule</span>
                Last updated: {secondsAgo}s ago
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold font-headline tracking-tighter text-[#dae2fe]">{event.name}</h1>
            <p className="text-[#ccc3d8] mt-2 text-lg max-w-2xl">The elite innovators battling for the ultimate trophy in the Digital Coliseum.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-[#22293e] px-6 py-3 rounded-lg text-center">
              <p className="text-[10px] uppercase tracking-widest text-[#d2bbff] font-bold">Total Participants</p>
              <p className="text-2xl font-black font-headline">{leaderboard.length}</p>
            </div>
            <div className="bg-[#22293e] px-6 py-3 rounded-lg text-center">
              <p className="text-[10px] uppercase tracking-widest text-[#4edea3] font-bold">Avg. Score</p>
              <p className="text-2xl font-black font-headline">{avgScore}</p>
            </div>
          </div>
        </div>

        {/* Leaderboard Empty State */}
        {leaderboard.length === 0 && (
          <div className="glass-row bg-[#22293e]/40 border border-white/5 rounded-2xl p-12 text-center text-[#ccc3d8]">
            <span className="material-symbols-outlined mb-4" style={{ fontSize: 48 }}>emoji_events</span>
            <p className="text-lg">No scores have been processed yet.</p>
            <p className="text-sm">The Arena awaits the first challenger.</p>
          </div>
        )}

        {/* Leaderboard Table List */}
        {leaderboard.length > 0 && (
          <div className="space-y-4">
            {/* Table Header Row (Hidden on Mobile) */}
            <div className="grid grid-cols-12 px-8 py-4 text-[#ccc3d8] text-[10px] font-bold uppercase tracking-[0.2em] hidden md:grid">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Participant Details</div>
              {allCriteria.map(c => (
                <div key={c.id} className="col-span-2 text-center truncate px-1" title={c.name}>{c.name}</div>
              ))}
              <div className="col-span-3 text-right">Weighted Total</div>
            </div>

            {/* Individual Competitor Rows */}
            {leaderboard.map((entry, idx) => {
              const rank = Number(entry.rank);
              const enrollNo = entry.enrollment_no || `#ENR-${entry.participant_id.substring(0, 5)}`;
              
              // Dynamic rank styling exact replication
              let rowClasses = "grid grid-cols-1 md:grid-cols-12 items-center bg-[#131b2f]/40 glass-row px-6 md:px-8 py-5 rounded-xl border border-white/5";
              let medalDisplay = <div className="col-span-1 flex items-center text-xl font-bold font-headline text-[#ccc3d8]/40 mb-4 md:mb-0">#{rank}</div>;
              let titleClasses = "text-lg font-bold font-headline text-[#dae2fe] leading-tight";
              let detailsClasses = "flex gap-3 text-[10px] text-[#ccc3d8] mt-1 uppercase font-semibold";
              let leftGlow = null;
              let scoreColor = "text-[#d2bbff] tracking-tighter";
              let barGradient = "bg-[#d2bbff]/40";
              let barHeight = "h-1";
              let scoreTextClass = "text-xs font-bold text-[#dae2fe]";
              let totalValClass = "text-xl font-black font-headline text-[#d2bbff] tracking-tighter";

              let totalRightHtml = null;

              if (rank === 1) {
                rowClasses = "grid grid-cols-1 md:grid-cols-12 items-center bg-[#31394e]/40 glass-row px-6 md:px-8 py-6 rounded-xl relative overflow-hidden group";
                medalDisplay = <div className="col-span-1 flex items-center text-4xl font-black font-headline text-[#ffb95f] mb-4 md:mb-0">🥇</div>;
                leftGlow = <div className="absolute left-0 top-0 w-1 h-full bg-[#ffb95f] shadow-[0_0_15px_rgba(255,185,95,0.5)]"></div>;
                titleClasses = "text-xl font-bold font-headline text-[#dae2fe] leading-tight";
                detailsClasses = "flex gap-3 text-xs text-[#ccc3d8] mt-1";
                scoreTextClass = "text-sm font-bold text-[#dae2fe]";
                barHeight = "h-1.5";
                barGradient = "bg-gradient-to-r from-[#905b00] to-[#ffb95f]";
                totalRightHtml = (
                  <div className="inline-block text-right">
                    <p className="text-3xl font-black font-headline text-[#ffb95f] tracking-tighter">{entry.weighted_total}</p>
                    <p className="text-[10px] text-[#ffb95f]/60 uppercase font-bold tracking-widest">Mastery Level</p>
                  </div>
                );
              } else if (rank === 2) {
                rowClasses = "grid grid-cols-1 md:grid-cols-12 items-center bg-[#2d344a]/40 glass-row px-6 md:px-8 py-6 rounded-xl relative overflow-hidden";
                medalDisplay = <div className="col-span-1 flex items-center text-4xl font-black font-headline text-[#958da1] mb-4 md:mb-0">🥈</div>;
                titleClasses = "text-xl font-bold font-headline text-[#dae2fe] leading-tight";
                detailsClasses = "flex gap-3 text-xs text-[#ccc3d8] mt-1";
                scoreTextClass = "text-sm font-bold text-[#dae2fe]";
                barHeight = "h-1.5";
                barGradient = "bg-gradient-to-r from-[#4a4455] to-[#958da1]";
                totalRightHtml = (
                  <div className="inline-block text-right">
                    <p className="text-3xl font-black font-headline text-[#958da1] tracking-tighter">{entry.weighted_total}</p>
                    <p className="text-[10px] text-[#958da1]/60 uppercase font-bold tracking-widest">Elite Tier</p>
                  </div>
                );
              } else if (rank === 3) {
                rowClasses = "grid grid-cols-1 md:grid-cols-12 items-center bg-[#2d344a]/40 glass-row px-6 md:px-8 py-6 rounded-xl relative overflow-hidden";
                medalDisplay = <div className="col-span-1 flex items-center text-4xl font-black font-headline text-orange-400 mb-4 md:mb-0">🥉</div>;
                titleClasses = "text-xl font-bold font-headline text-[#dae2fe] leading-tight";
                detailsClasses = "flex gap-3 text-xs text-[#ccc3d8] mt-1";
                scoreTextClass = "text-sm font-bold text-[#dae2fe]";
                barHeight = "h-1.5";
                barGradient = "bg-gradient-to-r from-orange-800 to-orange-400";
                totalRightHtml = (
                  <div className="inline-block text-right">
                    <p className="text-3xl font-black font-headline text-orange-400 tracking-tighter">{entry.weighted_total}</p>
                    <p className="text-[10px] text-orange-400/60 uppercase font-bold tracking-widest">Vanguard</p>
                  </div>
                );
              } else {
                // Rank 4+ standard
                const progressPct = Math.min(((entry.weighted_total || 0) / maxWeightedTotal) * 100, 100);
                totalRightHtml = (
                  <div className="inline-block text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <p className="text-xl font-black font-headline text-[#d2bbff] tracking-tighter">{entry.weighted_total}</p>
                    </div>
                    <div className="w-full h-0.5 bg-[#060d21] mt-1">
                      <div className="h-full bg-[#d2bbff]/20" style={{ width: `${progressPct}%` }}></div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={entry.participant_id} className={rowClasses}>
                  {leftGlow}
                  
                  {medalDisplay}
                  
                  <div className="col-span-4 mb-4 md:mb-0">
                    <h3 className={titleClasses}>{entry.name}</h3>
                    <div className={detailsClasses}>
                      <span>{enrollNo}</span>
                      {entry.branch && <span>{entry.branch}</span>}
                    </div>
                  </div>

                  {allCriteria.map((c, i) => {
                    let scoreVal = null;
                    for (const r of roundsCriteria) {
                      const val = entry.round_scores?.[r.name]?.criteria_scores?.[c.name]
                      if (val !== undefined && val !== null) {
                        scoreVal = val;
                        break;
                      }
                    }
                    
                    const displayVal = scoreVal !== null ? Math.round(scoreVal * 10) / 10 : '-';
                    const progressPercent = scoreVal !== null ? (scoreVal / Math.max(c.max_points || 10, 10)) * 100 : 0;
                    
                    // To strictly match HTML, we use flex col inside col-span-2. If there are > 2 criteria, the grid layout might break 12cols limits, but we honor the exact col-span logic the user provided.
                    return (
                      <div key={c.id} className="col-span-2 flex flex-col items-center justify-center gap-1">
                        <span className={scoreTextClass}>{displayVal}</span>
                        <div className={`w-24 ${barHeight} bg-[#060d21] rounded-full overflow-hidden`}>
                          <div className={`h-full ${barGradient}`} style={{ width: `${progressPercent}%` }}></div>
                        </div>
                      </div>
                    )
                  })}

                  <div className="col-span-3 text-right mt-4 md:mt-0">
                    {totalRightHtml}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Load More Button (Decorative) */}
        {leaderboard.length > 0 && (
          <div className="mt-12 flex justify-center pb-[80px] md:pb-0">
            <button 
              className="bg-[#22293e]est hover:bg-[#31394e] text-[#dae2fe] px-8 py-3 rounded-md font-bold text-xs uppercase tracking-widest transition-all border border-white/5 flex items-center gap-3"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to Top
              <span className="material-symbols-outlined text-sm">expand_less</span>
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur-xl border-t border-white/10 flex justify-around items-center py-4 z-50 pb-safe">
        <div className="flex flex-col items-center gap-1 text-purple-400">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>leaderboard</span>
          <span className="text-[10px] font-bold uppercase">Arena</span>
        </div>
      </nav>

    </div>
    </>
  )
}
