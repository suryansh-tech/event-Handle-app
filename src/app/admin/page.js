'use client'

import './admin.css'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const SetupTab = dynamic(() => import('./_components/SetupTab'), {
  loading: () => (
    <div style={{ padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 32, animation: 'ad-pulse 1.2s linear infinite' }}>hourglass_top</span>
      <p style={{ fontSize: 14, fontWeight: 500, marginTop: 16 }}>Loading setup...</p>
    </div>
  ),
})
const JudgesTab = dynamic(() => import('./_components/JudgesTab'), {
  loading: () => (
    <div style={{ padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 32, animation: 'ad-pulse 1.2s linear infinite' }}>hourglass_top</span>
      <p style={{ fontSize: 14, fontWeight: 500, marginTop: 16 }}>Loading judges...</p>
    </div>
  ),
})
const ResultsTab = dynamic(() => import('./_components/ResultsTab'), {
  loading: () => (
    <div style={{ padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 32, animation: 'ad-pulse 1.2s linear infinite' }}>hourglass_top</span>
      <p style={{ fontSize: 14, fontWeight: 500, marginTop: 16 }}>Loading results...</p>
    </div>
  ),
})
import { getActiveEvent, toggleEventPublished } from '@/lib/actions/events'
import { gooeyToast as toast } from 'goey-toast'

const TABS = ['Setup', 'Judges', 'Results']
const TAB_ICONS = { Setup: 'settings', Judges: 'group', Results: 'leaderboard' }

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('Setup')
  const [activeEvent, setActiveEvent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPodiumModal, setShowPodiumModal] = useState(false)
  const [podiumSettings, setPodiumSettings] = useState({
    topText: 'NIET GREATER NOIDA • CLOUD SHASTRA • 18 MAR 2026',
    mainTitle: 'AI BUILDER ARENA',
    subtitle: 'CLOUD SHASTRA PRESENTS',
    championSubtitle: 'WHERE IDEAS MET ARTIFICIAL INTELLIGENCE',
    footerText: 'CLOUD SHASTRA • ITC • NIET GREATER NOIDA',
    bottomText: 'CONGRATULATIONS TO ALL PARTICIPANTS'
  })
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadActiveEvent()
    const saved = localStorage.getItem('podium_settings')
    if (saved) {
      try { setPodiumSettings(JSON.parse(saved)) } catch(e) {}
    }
  }, [])

  async function loadActiveEvent() {
    setIsLoading(true)
    const { data } = await getActiveEvent()
    setActiveEvent(data)
    setIsLoading(false)
  }

  // Active event doesn't change between tabs — no need to refetch

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleTogglePublish() {
    if (!activeEvent) return
    const newState = !activeEvent.is_published
    const { error } = await toggleEventPublished(activeEvent.id, newState)
    if (error) {
      toast.error(error)
      return
    }
    
    if (newState) {
      toast.success('Leaderboard published!')
      window.open('/leaderboard', '_blank')
    } else {
      toast.success('Leaderboard hidden')
    }
    await loadActiveEvent()
  }

  function handleOpenPodium() {
    localStorage.setItem('podium_settings', JSON.stringify(podiumSettings))
    window.open('/podium', '_blank')
    setShowPodiumModal(false)
  }

  return (
    <div className="ad-shell">
      {/* ===== Sidebar ===== */}
      <aside className="ad-sidebar">
        <div className="ad-sidebar-brand">
          <div className="ad-sidebar-logo">
            <span className="material-symbols-outlined">rocket_launch</span>
          </div>
          <div className="ad-sidebar-brand-text">
            <h1>EventRank</h1>
            <p>Premium Analytics</p>
          </div>
        </div>

        <nav className="ad-sidebar-nav">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`ad-nav-btn ${activeTab === tab ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">{TAB_ICONS[tab]}</span>
              {tab}
            </button>
          ))}
        </nav>

        <div className="ad-sidebar-footer">
          <div className="ad-sidebar-user">
            <div className="ad-sidebar-avatar">AD</div>
            <div className="ad-sidebar-user-info">
              <p>Admin</p>
              <span>Event Manager</span>
            </div>
          </div>
          <button onClick={handleLogout} disabled={loggingOut} className="ad-sidebar-logout">
            <span className="material-symbols-outlined">logout</span>
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="ad-main">
        {/* TopNavBar */}
        <header className="ad-header">
          <div className="ad-header-left">
            {isLoading ? (
              <span className="ad-header-title">Loading...</span>
            ) : activeEvent ? (
              <>
                <span className="ad-header-title">Live Event: {activeEvent.name}</span>
                <span className="ad-live-badge">
                  <span className="ad-live-dot"></span>
                  Live
                </span>
              </>
            ) : (
              <span className="ad-header-title">No Active Event</span>
            )}
            <Link href="/admin/events" className="ad-header-manage-link">
              Manage Events
            </Link>
          </div>

          <div className="ad-header-right">
            <div className="ad-header-actions">
              <button className="ad-icon-btn" title="Notifications">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="ad-icon-btn" title="Help">
                <span className="material-symbols-outlined">help</span>
              </button>
              {!isLoading && activeEvent && (
                <button onClick={handleTogglePublish} className="ad-btn-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {activeEvent.is_published ? 'visibility_off' : 'public'}
                  </span>
                  {activeEvent.is_published ? 'Unpublish' : 'Publish Leaderboard'}
                </button>
              )}
              {!isLoading && activeEvent?.is_published && (
                <>
                  <button onClick={() => window.open('/leaderboard', '_blank')} className="ad-btn-outline">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                    View Live
                  </button>
                  <button onClick={() => setShowPodiumModal(true)} className="ad-btn-outline">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>emoji_events</span>
                    Present Podium
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="ad-content">
          {/* Tab Content */}
          {isLoading ? (
            <div style={{ padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, animation: 'ad-pulse 1.2s linear infinite' }}>hourglass_top</span>
              <p style={{ fontSize: 14, fontWeight: 500, marginTop: 16 }}>Loading workspace...</p>
            </div>
          ) : (
            <>
              {activeTab === 'Setup' && <SetupTab activeEvent={activeEvent} />}
              {activeTab === 'Judges' && <JudgesTab activeEvent={activeEvent} />}
              {activeTab === 'Results' && <ResultsTab activeEvent={activeEvent} />}
            </>
          )}
        </div>

        {/* Podium Configuration Side-Sheet */}
        <div className={`ad-side-sheet-overlay ${showPodiumModal ? 'open' : ''}`} onClick={() => setShowPodiumModal(false)} />
        
        <aside className={`ad-side-sheet ${showPodiumModal ? 'open' : ''}`}>
          {/* Header */}
          <header className="ad-side-sheet-header">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="ad-side-sheet-tag">
                <span>Configuration</span>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(171,179,183,0.3)' }} />
                <span>Podium Display</span>
              </div>
              <h3>Podium Configuration</h3>
            </div>
            <button className="ad-side-sheet-close" onClick={() => setShowPodiumModal(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>

          {/* Body */}
          <div className="ad-side-sheet-body">
            {/* Live Preview */}
            <section className="ad-side-sheet-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <label className="section-label" style={{ marginBottom: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
                  Live Preview
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', padding: '4px 8px', borderRadius: 9999 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'ad-pulse 2s infinite' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Sync</span>
                </div>
              </div>
              
              <div className="ad-live-preview-wrap">
                <div className="ad-live-preview-header">
                  <span>{podiumSettings.topText || 'Global Championship Finals 2024'}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12, textAlign: 'center' }}>
                  <h4 style={{ color: 'white', fontFamily: 'Manrope, sans-serif', fontSize: 14, fontWeight: 800, margin: '0 0 2px' }}>{podiumSettings.mainTitle || 'Winners Circle'}</h4>
                  <p style={{ color: '#004ced', fontSize: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 16px' }}>{podiumSettings.subtitle || "Men's Technical Division"}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', height: 80, padding: '0 8px' }}>
                    {/* 2nd Place */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}></div>
                      <div style={{ width: '100%', height: 32, background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 5, fontWeight: 700 }}>2nd</span>
                      </div>
                    </div>
                    {/* 1st Place */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,76,237,0.2)', border: '1px solid #004ced', boxShadow: '0 0 10px rgba(0,76,237,0.4)' }}></div>
                      <div style={{ width: '100%', height: 48, background: '#004ced', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: 6, fontWeight: 900, fontStyle: 'italic' }}>WINNER</span>
                      </div>
                    </div>
                    {/* 3rd Place */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}></div>
                      <div style={{ width: '100%', height: 24, background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 5, fontWeight: 700 }}>3rd</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Display Text Form */}
            <section className="ad-side-sheet-section">
              <label className="section-label">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>text_fields</span>
                Display Text
              </label>
              <div className="ad-side-sheet-field">
                <label>Top Bar Text</label>
                <input type="text" value={podiumSettings.topText} onChange={(e) => setPodiumSettings({...podiumSettings, topText: e.target.value})} />
              </div>
              <div className="ad-side-sheet-field">
                <label>Main Banner Title</label>
                <input type="text" value={podiumSettings.mainTitle} onChange={(e) => setPodiumSettings({...podiumSettings, mainTitle: e.target.value})} />
              </div>
              <div className="ad-side-sheet-field">
                <label>Subtitles</label>
                <input type="text" value={podiumSettings.subtitle} onChange={(e) => setPodiumSettings({...podiumSettings, subtitle: e.target.value})} />
              </div>
              <div className="ad-side-sheet-field">
                <label>Champions Subtitle</label>
                <input type="text" value={podiumSettings.championSubtitle} onChange={(e) => setPodiumSettings({...podiumSettings, championSubtitle: e.target.value})} />
              </div>
            </section>

            {/* Peripheral Details */}
            <section className="ad-side-sheet-section">
              <label className="section-label">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>dock_to_bottom</span>
                Peripheral Details
              </label>
              <div className="ad-side-sheet-field">
                <label>Footer Text</label>
                <input type="text" value={podiumSettings.footerText} onChange={(e) => setPodiumSettings({...podiumSettings, footerText: e.target.value})} />
              </div>
              <div className="ad-side-sheet-field">
                <label>Bottom Line</label>
                <input type="text" value={podiumSettings.bottomText} onChange={(e) => setPodiumSettings({...podiumSettings, bottomText: e.target.value})} />
              </div>
            </section>

            {/* Visual Theme Section */}
            <section className="ad-side-sheet-section">
              <label className="section-label">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>palette</span>
                Visual Theme
              </label>
              <div className="ad-theme-grid">
                <button type="button" className={`ad-theme-btn ${podiumSettings.theme === 'dark' || !podiumSettings.theme ? 'active' : ''}`} onClick={() => setPodiumSettings({...podiumSettings, theme: 'dark'})}>
                  <div className="ad-theme-preview" style={{ background: '#0f172a' }}></div>
                  <span>Dark Onyx</span>
                </button>
                <button type="button" className={`ad-theme-btn ${podiumSettings.theme === 'light' ? 'active' : ''}`} onClick={() => setPodiumSettings({...podiumSettings, theme: 'light'})}>
                  <div className="ad-theme-preview" style={{ background: 'white', border: '1px solid #e2e8f0' }}></div>
                  <span>Clean White</span>
                </button>
                <button type="button" className={`ad-theme-btn ${podiumSettings.theme === 'blue' ? 'active' : ''}`} onClick={() => setPodiumSettings({...podiumSettings, theme: 'blue'})}>
                  <div className="ad-theme-preview" style={{ background: '#2563eb' }}></div>
                  <span>Electric Blue</span>
                </button>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="ad-side-sheet-footer">
            <button className="ad-side-sheet-btn-primary" onClick={handleOpenPodium}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
              Open Podium
            </button>
            <button className="ad-side-sheet-btn-secondary" onClick={() => setShowPodiumModal(false)}>
              Dismiss Changes
            </button>
          </footer>
        </aside>
      </main>
    </div>
  )
}
