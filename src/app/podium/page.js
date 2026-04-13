'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLeaderboard } from '@/lib/actions/scores'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Award } from 'lucide-react'

const CyberText = ({ text, delayMs = 0 }) => {
  const [displayText, setDisplayText] = useState(text.replace(/[a-zA-Z]/g, '0'));
  
  useEffect(() => {
    let timeoutId;
    let intervalId;
    
    timeoutId = setTimeout(() => {
      let iteration = 0;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>";
      intervalId = setInterval(() => {
        setDisplayText(text.split("").map((letter, index) => {
          if(index < iteration) return text[index];
          if(letter === ' ') return ' ';
          return chars[Math.floor(Math.random() * chars.length)];
        }).join(''));
        
        if(iteration >= text.length){
          clearInterval(intervalId);
        }
        iteration += 1 / 3;
      }, 40);
    }, delayMs);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    }
  }, [text, delayMs]);

  return <>{displayText}</>;
}

export default function PodiumPage() {
  const [event, setEvent] = useState(null)
  const [top3, setTop3] = useState([])
  const [runnersUp, setRunnersUp] = useState([])
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState({
    topText: 'NIET GREATER NOIDA • CLOUD SHASTRA • 18 MAR 2026',
    mainTitle: 'AI BUILDER ARENA',
    subtitle: 'CLOUD SHASTRA PRESENTS',
    championSubtitle: 'WHERE IDEAS MET ARTIFICIAL INTELLIGENCE',
    footerText: 'CLOUD SHASTRA • ITC • NIET GREATER NOIDA',
    bottomText: 'CONGRATULATIONS TO ALL PARTICIPANTS'
  })

  const supabase = createClient()

  useEffect(() => {
    loadData()
    const saved = localStorage.getItem('podium_settings')
    if (saved) {
      try { setBanner(JSON.parse(saved)) } catch(e) {}
    }
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: eventData } = await supabase
      .from('events')
      .select('*')
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

    const { data: lb } = await getLeaderboard(eventData.id)
    if (lb && lb.length > 0) {
      // Ensure sorted by rank
      const sortedLb = [...lb].sort((a, b) => Number(a.rank) - Number(b.rank))
      
      // We need exactly 3 for the top 3, pad with null if needed
      const t3 = [
        sortedLb[0] || null,
        sortedLb[1] || null,
        sortedLb[2] || null
      ]
      setTop3(t3)
      setRunnersUp(sortedLb.slice(3, 10))
    }
    
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020815]">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!event || top3.length === 0 || !top3[0]) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020815] text-cyan-400 font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border border-cyan-500/30 flex items-center justify-center relative">
            <Trophy className="opacity-50" />
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500" />
          </div>
          <p className="tracking-widest uppercase text-sm">NO RESULTS FOUND</p>
        </div>
      </div>
    )
  }

  // Theme support from Admin Side-Sheet
  const themeStyles = {
    dark: {
      bg: 'bg-[#01040a]',
      text: 'text-slate-300',
      orb: 'bg-cyan-900/20',
      card: 'bg-[#020b18]/90 border-cyan-900/30 shadow-[0_0_50px_rgba(8,145,178,0.15)]',
      corner: 'border-cyan-400',
      heading: 'text-white'
    },
    light: {
      bg: 'bg-slate-50',
      text: 'text-slate-800',
      orb: 'bg-blue-200/50',
      card: 'bg-white border-slate-200 shadow-2xl',
      corner: 'border-blue-500',
      heading: 'text-slate-900'
    },
    blue: {
      bg: 'bg-[#0f172a]',  // slate-900
      text: 'text-blue-100',
      orb: 'bg-blue-600/20',
      card: 'bg-[#1e293b]/90 border-blue-500/30 shadow-[0_0_60px_rgba(37,99,235,0.2)]',
      corner: 'border-blue-400',
      heading: 'text-white'
    }
  }
  const th = themeStyles[banner.theme] || themeStyles.dark;

  const CornerBrackets = ({ colorClass = th.corner }) => (
    <>
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${colorClass} pointer-events-none`} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${colorClass} pointer-events-none`} />
    </>
  )

  const podiumBoxes = [
    { 
      rank: 2, 
      data: top3[1], 
      label: '2ND POSITION',
      num: '02',
      color: 'border-slate-400',
      textGrad: 'from-slate-300 to-slate-500',
      bgGrad: 'from-slate-900 to-[#020815]',
      icon: <Medal size={48} className="text-slate-300 drop-shadow-[0_0_15px_rgba(148,163,184,0.5)]" />,
      delay: 0.6,
      heightClass: 'h-[280px]'
    },
    { 
      rank: 1, 
      data: top3[0], 
      label: '1ST POSITION',
      num: '01',
      color: 'border-yellow-400',
      textGrad: 'from-yellow-300 to-yellow-600',
      bgGrad: 'from-yellow-900/40 to-[#020815]',
      icon: <Trophy size={64} className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />,
      delay: 0.3,
      heightClass: 'h-[320px]'
    },
    { 
      rank: 3, 
      data: top3[2], 
      label: '3RD POSITION',
      num: '03',
      color: 'border-orange-500',
      textGrad: 'from-orange-400 to-orange-700',
      bgGrad: 'from-orange-900/30 to-[#020815]',
      icon: <Medal size={40} className="text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />,
      delay: 0.9,
      heightClass: 'h-[260px]'
    }
  ]

  // Formatted date
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ').toUpperCase()

  return (
    <div className={`min-h-screen ${th.bg} relative overflow-x-hidden font-sans ${th.text} flex flex-col items-center py-10 selection:bg-cyan-900 selection:text-cyan-100`}>
      
      {/* Grid Background */}
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none" 
        style={{ 
          backgroundImage: 'linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)', 
          backgroundSize: '40px 40px',
          backgroundPosition: 'center center'
        }} 
      />
      
      {/* Glowing orbs in background */}
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] ${th.orb} blur-[150px] rounded-full pointer-events-none z-0`} />

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.85, rotateX: 5, y: 30 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 1.2, type: 'spring', bounce: 0.3 }}
        className={`relative z-10 w-[95%] max-w-[1100px] ${th.card} backdrop-blur-md p-8 md:p-12 rounded-sm perspective-1000`}
      >
        {/* Main Corner Brackets */}
        <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${th.corner}`} />
        <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${th.corner}`} />
        
        {/* Top Titles */}
        <div className="text-center font-mono text-[10px] md:text-xs text-cyan-600 tracking-[0.2em] mb-4 space-y-1">
          <p>{banner.topText}</p>
          <p className="text-cyan-500 font-bold uppercase tracking-[0.3em]">{banner.mainTitle || event?.name}</p>
        </div>

        <div className="text-center mb-8">
          <p className="font-mono text-xs text-cyan-700 tracking-[0.3em] mb-2 uppercase">{banner.subtitle}</p>
          <motion.h1 
            initial={{ opacity: 0, scale: 0.6, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, delay: 0.3, type: 'spring', bounce: 0.5 }}
            className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase mb-4"
            style={{ textShadow: '0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(6,182,212,0.4)' }}
          >
            <CyberText text="WINNERS ANNOUNCED" delayMs={300} />
          </motion.h1>
        </div>

        {/* Divider 1 */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent relative mb-8">
          <motion.div 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            transition={{ duration: 1, delay: 0.6 }}
            className="absolute top-0 left-0 h-[1px] bg-cyan-400 block"
            style={{ boxShadow: '0 0 10px rgba(6,182,212,0.8)' }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-[#020b18] text-yellow-500 font-mono text-xs md:text-sm tracking-[0.3em] font-bold flex items-center gap-4">
            <Trophy size={14} className="text-yellow-600" />
            CHAMPIONS
            <Trophy size={14} className="text-yellow-600" />
          </div>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center font-mono text-[10px] md:text-xs text-slate-500 tracking-[0.3em] uppercase mb-12"
        >
          {banner.championSubtitle}
        </motion.p>

        {/* Podium Boxes */}
        <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6 mb-16 pt-8">
          {podiumBoxes.map((box, idx) => {
            if (!box.data) return null;

            return (
              <motion.div
                key={box.rank}
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -8 }}
                transition={{ duration: 1.0, delay: box.delay, type: 'spring', bounce: 0.4 }}
                className={`flex-1 w-full md:max-w-[300px] relative bg-gradient-to-b ${box.bgGrad} border border-white/5 p-6 flex flex-col items-center justify-center ${box.heightClass} group hover:border-white/20 transition-colors cursor-default`}
              >
                <CornerBrackets colorClass={box.color} />
                
                <div className="mb-6 transform group-hover:scale-110 transition-transform duration-500">
                  {box.icon}
                </div>
                
                <p className="font-mono text-[10px] tracking-[0.2em] text-slate-500 mb-2 uppercase">
                  {box.label}
                </p>
                
                <h2 className={`text-6xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-b ${box.textGrad} mb-4 leading-none`}>
                  {box.num}
                </h2>
                
                <h3 className="text-lg md:text-xl font-bold text-white text-center tracking-wide px-2 leading-tight">
                  {box.data.name}
                </h3>
                
                <p className="text-xs text-slate-400 mt-2 font-mono">
                  {box.data.weighted_total} PTS
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Divider 2 */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-8 relative"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-[#020b18] text-slate-600 font-mono text-[10px] tracking-[0.3em] whitespace-nowrap">
            {banner.footerText}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, type: 'spring' }}
          className="text-center font-mono text-[10px] md:text-xs tracking-widest text-slate-400 uppercase"
        >
          {banner.bottomText}
        </motion.div>
      </motion.div>

      {/* Runners Up Section (Integrated into the sci-fi theme below the main box) */}
      {runnersUp.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-12 w-[95%] max-w-[800px] relative"
        >
          <div className="text-center mb-6">
            <h4 className="font-mono text-sm tracking-[0.3em] text-cyan-500 flex items-center justify-center gap-4">
              <span className="w-12 h-[1px] bg-cyan-700" />
              HONORABLE MENTIONS
              <span className="w-12 h-[1px] bg-cyan-700" />
            </h4>
          </div>

          <div className="grid gap-3">
            {runnersUp.map((runner, i) => (
              <motion.div 
                key={runner.participant_id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.6 + (i * 0.1) }}
                className="relative bg-[#020b18]/60 backdrop-blur-sm border border-cyan-900/30 p-4 flex items-center gap-6 group hover:border-cyan-500/50 transition-colors"
              >
                {/* Mini corner brackets */}
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-cyan-800 group-hover:border-cyan-400 transition-colors" />
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-cyan-800 group-hover:border-cyan-400 transition-colors" />
                
                <div className="font-mono text-xl font-bold text-cyan-800 group-hover:text-cyan-400 transition-colors w-12 text-center">
                  {(runner.rank).toString().padStart(2, '0')}
                </div>
                
                <div className="flex-1">
                  <h5 className="text-white font-bold tracking-wide uppercase text-sm md:text-base">{runner.name}</h5>
                  {runner.branch && (
                    <p className="text-xs text-slate-500 font-mono tracking-widest">{runner.branch}</p>
                  )}
                </div>

                <div className="font-mono text-cyan-300/60 group-hover:text-cyan-300 text-sm tracking-widest bg-cyan-950/30 px-3 py-1">
                  {runner.weighted_total} PTS
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  )
}
