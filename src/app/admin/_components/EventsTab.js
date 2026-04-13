'use client'

import { useState, useEffect } from 'react'
import { gooeyToast as toast } from 'goey-toast'
import { createEvent, getEvents, toggleEventActive, toggleEventPublished, deleteEvent } from '@/lib/actions/events'

export default function EventsTab() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    setLoading(true)
    const { data, error } = await getEvents()
    if (error) toast.error(error)
    else setEvents(data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    const tid = toast('Creating event...')
    const formData = new FormData(e.target)
    const { error } = await createEvent(formData)
    toast.dismiss(tid)
    if (error) toast.error(error)
    else {
      toast.success('Created.')
      e.target.reset()
      setShowForm(false)
      await loadEvents()
    }
    setCreating(false)
  }

  async function handleToggleActive(id, setActive) {
    const tid = toast('Updating...')
    const { error } = await toggleEventActive(id, setActive)
    toast.dismiss(tid)
    if (error) toast.error(error)
    else {
      toast.success('Updated.', { description: setActive ? 'Event activated.' : 'Event deactivated.' })
      await loadEvents()
    }
  }

  async function handleTogglePublish(id, current) {
    const tid = toast('Updating status...')
    const { error } = await toggleEventPublished(id, !current)
    toast.dismiss(tid)
    if (error) toast.error(error)
    else {
      toast.success('Updated.', { description: current ? 'Leaderboard hidden.' : 'Leaderboard published.' })
      await loadEvents()
    }
  }

  async function handleDelete(event) {
    const confirmed = window.confirm(
      `⚠️ Delete "${event.name}"?\n\nThis will permanently delete everything associated with it.\n\nThis action cannot be undone.`
    )
    if (!confirmed) return
    const tid = toast('Deleting...')
    const { error } = await deleteEvent(event.id)
    toast.dismiss(tid)
    if (error) toast.error(error)
    else {
      toast.warning('Deleted.', { description: `"${event.name}" removed permanently.` })
      await loadEvents()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'Manrope', fontSize: 24, fontWeight: 800, color: '#2b3437', margin: '0 0 4px' }}>Events Directory</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#586064' }}>Manage your platform events and leaderboards</p>
        </div>
        <button 
          className={showForm ? "ad-btn-draft" : "ad-btn-primary"}
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 24px', borderRadius: 12, fontWeight: 700, fontSize: 14 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel Creation' : 'Create New Event'}
        </button>
      </div>

      {/* New Event Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="ad-panel" style={{ background: '#f8f9fa', padding: 32 }}>
          <h3 style={{ fontFamily: 'Manrope', fontSize: 18, fontWeight: 800, color: '#2b3437', marginBottom: 24 }}>New Event Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#586064', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Name</label>
              <input 
                name="name" 
                style={{ width: '100%', background: '#ffffff', border: '1px solid rgba(171,179,183,0.3)', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#2b3437', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                placeholder="e.g. Hackathon 2024" 
                required 
                onFocus={(e) => { e.target.style.borderColor = '#432DD7'; e.target.style.boxShadow = '0 0 0 3px rgba(67, 45, 215, 0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(171,179,183,0.3)'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#586064', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Result Mode</label>
              <div style={{ position: 'relative' }}>
                <select 
                  name="result_mode" 
                  defaultValue="avg"
                  style={{ width: '100%', appearance: 'none', background: '#ffffff', border: '1px solid rgba(171,179,183,0.3)', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#2b3437', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', fontWeight: 600, cursor: 'pointer' }}
                  onFocus={(e) => { e.target.style.borderColor = '#432DD7'; e.target.style.boxShadow = '0 0 0 3px rgba(67, 45, 215, 0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(171,179,183,0.3)'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
                >
                  <option value="avg">Weighted Average</option>
                  <option value="sum">Total Sum</option>
                  <option value="avg_penalty">Weighted Average + Penalties</option>
                  <option value="sum_penalty">Total Sum + Penalties</option>
                </select>
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#586064', pointerEvents: 'none' }}>expand_more</span>
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#586064', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
            <textarea 
              name="description" 
              style={{ width: '100%', minHeight: 120, background: '#ffffff', border: '1px solid rgba(171,179,183,0.3)', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#2b3437', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', resize: 'vertical' }}
              placeholder="Describe your event parameters and goals..."
              onFocus={(e) => { e.target.style.borderColor = '#432DD7'; e.target.style.boxShadow = '0 0 0 3px rgba(67, 45, 215, 0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(171,179,183,0.3)'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
            />
          </div>

          <button 
            type="submit" 
            className="ad-btn-primary"
            style={{ width: '100%', height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            disabled={creating}
          >
            {creating ? <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>hourglass_top</span> : <span className="material-symbols-outlined">save</span>}
            {creating ? 'Saving Event...' : 'Create Event'}
          </button>
        </form>
      )}

      {/* Events Grid */}
      {loading ? (
        <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#432DD7', animation: 'spin 1s linear infinite' }}>refresh</span>
        </div>
      ) : events.length === 0 ? (
        <div className="ad-panel" style={{ padding: '80px 40px', textAlign: 'center', background: 'transparent', borderStyle: 'dashed' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'rgba(171,179,183,0.3)', marginBottom: 16 }}>event_busy</span>
          <h3 style={{ fontFamily: 'Manrope', fontSize: 20, fontWeight: 800, color: '#2b3437', margin: '0 0 8px' }}>No Events Found</h3>
          <p style={{ margin: 0, color: '#586064' }}>Get started by creating your first event configuration above.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {events.map(event => (
            <div key={event.id} className="ad-stats-card" style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 240, position: 'relative', overflow: 'hidden' }}>
              {/* Event Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div>
                  <h3 style={{ fontFamily: 'Manrope', fontSize: 20, fontWeight: 800, color: '#2b3437', margin: '0 0 8px', lineHeight: 1.2 }}>{event.name}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {event.is_active && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', borderRadius: 9999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>bolt</span> Active
                      </span>
                    )}
                    {event.is_published && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(67, 45, 215, 0.1)', color: '#432DD7', borderRadius: 9999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>public</span> Published
                      </span>
                    )}
                    <span style={{ display: 'inline-flex', items: 'center', padding: '2px 8px', background: '#f1f4f6', color: '#586064', borderRadius: 9999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {event.result_mode?.replace('_', ' + ') || 'AVG'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Event Description */}
              <p style={{ fontSize: 13, color: '#586064', margin: 0, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {event.description || 'No description provided for this event.'}
              </p>

              {/* Stats Bar */}
              <div style={{ padding: '16px 0', borderTop: '1px solid rgba(171,179,183,0.15)', borderBottom: '1px solid rgba(171,179,183,0.15)', display: 'flex', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#586064', fontSize: 13, fontWeight: 700 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#432DD7' }}>groups</span>
                  {event.participantCount || 0} Participants
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#586064', fontSize: 13, fontWeight: 700 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#432DD7' }}>gavel</span>
                  {event.judgeCount || 0} Judges
                </div>
              </div>

              {/* Result Mode Changer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#586064', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scoring Mode</span>
                <div style={{ position: 'relative', flex: 1 }}>
                  <select 
                    style={{ width: '100%', appearance: 'none', background: '#f8f9fa', border: '1px solid rgba(171,179,183,0.3)', borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 12, fontWeight: 700, color: '#2b3437', outline: 'none', cursor: 'pointer' }}
                    value={event.result_mode || 'avg'}
                    onChange={(e) => {
                      import('@/lib/actions/events').then(m => m.toggleEventResultMode(event.id, e.target.value))
                        .then(() => { toast.success('Mode updated'); loadEvents(); })
                    }}
                  >
                    <option value="avg">Weighted Average</option>
                    <option value="sum">Total Sum</option>
                    <option value="avg_penalty">Avg + Penalty</option>
                    <option value="sum_penalty">Sum + Penalty</option>
                  </select>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#586064', pointerEvents: 'none' }}>expand_more</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {!event.is_active ? (
                  <button 
                    onClick={() => handleToggleActive(event.id, true)} 
                    className="ad-btn-secondary" 
                    style={{ flex: 1, padding: '10px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span> Set Active
                  </button>
                ) : (
                  <button 
                    onClick={() => handleToggleActive(event.id, false)} 
                    className="ad-btn-draft" 
                    style={{ flex: 1, padding: '10px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#ef4444' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>power_settings_new</span> Deactivate
                  </button>
                )}
                <button 
                  onClick={() => handleTogglePublish(event.id, event.is_published)} 
                  className={event.is_published ? "ad-btn-draft" : "ad-btn-primary"} 
                  style={{ flex: 1, padding: '10px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...(!event.is_published ? {boxShadow: '0 4px 12px rgba(67, 45, 215, 0.2)'} : {}) }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{event.is_published ? 'visibility_off' : 'visibility'}</span>
                  {event.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button 
                  onClick={() => handleDelete(event)} 
                  className="ad-btn-draft" 
                  title="Delete Event"
                  style={{ width: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                </button>
              </div>

              {/* Glowing Background Blob */}
              <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'rgba(67, 45, 215, 0.03)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
