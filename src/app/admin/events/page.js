'use client'

import '../admin.css'
import Link from 'next/link'
import EventsTab from '../_components/EventsTab'

export default function ManageEventsPage() {
  return (
    <div className="ad-shell bg-[#f8f9fa]">
      <main className="ad-main w-full ml-0 border-none max-w-6xl mx-auto py-10 px-6">
        {/* Header */}
        <header className="ad-hero-header mb-8 pb-8 border-b border-[rgba(226,232,240,0.6)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link 
              href="/admin"
              className="w-12 h-12 flex items-center justify-center bg-white border border-[#e2e8f0] rounded-xl text-[#586064] hover:text-[#432DD7] hover:border-[#432DD7] transition-all shadow-sm"
              title="Back to Dashboard"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#432DD7] to-[#301ca1] rounded-2xl shadow-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[24px]">calendar_month</span>
              </div>
              <div>
                <h1 className="ad-hero-title text-2xl" style={{ margin: 0, fontSize: 24 }}>Manage Events</h1>
                <p className="ad-hero-desc" style={{ margin: 0 }}>Create, publish, and configure scoring logic.</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="ad-panel p-8">
          <EventsTab />
        </div>

        {/* Footer Info */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[#94a3b8]">
          <span className="material-symbols-outlined text-[16px]">info</span>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em]">Only one event can be active at a time</p>
        </div>
      </main>
    </div>
  )
}
