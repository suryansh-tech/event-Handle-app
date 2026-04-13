'use client'

import { useState, useEffect, useRef } from 'react'
import { gooeyToast as toast } from 'goey-toast'
import { getRounds, createRound, deleteRound, updateRoundDeadline } from '@/lib/actions/rounds'
import { getCriteria, saveCriteria } from '@/lib/actions/criteria'
import { importParticipants, getParticipants, clearAllParticipants, addManualParticipant } from '@/lib/actions/participants'
import { parseLocalFile } from '@/lib/fetchSheet'
import { analyzeColumns } from '@/lib/analyzeColumns'
import { Upload, Link, FileSpreadsheet, Plus, Trash2, GripVertical, Save, ChevronRight, Check, AlertCircle, X, Users, Clock, Info, Download, Tag, UserPlus, MinusCircle } from 'lucide-react'

export default function SetupTab({ activeEvent }) {
  if (!activeEvent) {
    return (
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(226,232,240,0.6)', padding: 48, textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', display: 'block', marginBottom: 16 }}>error_outline</span>
        <p style={{ color: '#64748b', fontWeight: 500, fontSize: 14 }}>No active event. Go to Events tab and set one as active first.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* Hero Header */}
      <section className="ad-hero">
        <h2>EventRank: Setup &amp; Participant Import</h2>
        <p>Configure your competition environment, define judging logic, and synchronize participant data with architectural precision.</p>
      </section>

      {/* Quick Manual Check-In */}
      <ManualCheckInSection eventId={activeEvent.id} />

      {/* Participant Import (Step Wizard) */}
      <ParticipantImportSection eventId={activeEvent.id} />

      {/* Rounds & Criteria (Asymmetric) */}
      <RoundsCriteriaSection eventId={activeEvent.id} />
    </div>
  )
}

/* ===== MANUAL CHECK-IN SECTION ===== */
function ManualCheckInSection({ eventId }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', enrollment_no: '', branch: '', year: '' })
  const [submitting, setSubmitting] = useState(false)
  const [recentlyAdded, setRecentlyAdded] = useState([])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Participant name required.')
      return
    }
    setSubmitting(true)
    const tid = toast('Adding...')
    const result = await addManualParticipant(eventId, form)
    toast.dismiss(tid)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Added.')
      setRecentlyAdded(prev => [{ name: form.name, enrollment_no: form.enrollment_no, time: new Date() }, ...prev].slice(0, 5))
      setForm({ name: '', enrollment_no: '', branch: '', year: '' })
    }
    setSubmitting(false)
  }

  return (
    <section style={{
      background: 'white',
      borderRadius: 16,
      border: '1px solid rgba(226,232,240,0.6)',
      overflow: 'hidden',
    }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(67,45,215,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#432DD7' }}>person_add</span>
          </div>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2b3437', fontFamily: 'Manrope, Inter, sans-serif' }}>
              Quick Check-In
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#586064' }}>
              Manually add last-minute participants on event day
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {recentlyAdded.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#047857',
              background: '#ecfdf5', padding: '4px 10px', borderRadius: 9999,
              border: '1px solid #a7f3d0',
            }}>
              {recentlyAdded.length} added
            </span>
          )}
          <span className="material-symbols-outlined" style={{
            fontSize: 20, color: '#94a3b8',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>expand_more</span>
        </div>
      </button>

      {/* Collapsible Body */}
      {open && (
        <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(226,232,240,0.4)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 20 }}>
            {/* 2-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Name (required) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#586064', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>badge</span>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  style={{
                    padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                    fontSize: 14, fontWeight: 500, fontFamily: 'Inter, sans-serif',
                    outline: 'none', transition: 'border-color 0.15s',
                    background: '#fafbfc',
                  }}
                />
              </div>

              {/* Enrollment No */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#586064', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>confirmation_number</span>
                  Enrollment / ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2024CSE001"
                  value={form.enrollment_no}
                  onChange={(e) => setForm({ ...form, enrollment_no: e.target.value })}
                  style={{
                    padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                    fontSize: 14, fontWeight: 500, fontFamily: 'Inter, sans-serif',
                    outline: 'none', transition: 'border-color 0.15s',
                    background: '#fafbfc',
                  }}
                />
              </div>

              {/* Branch */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#586064', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>school</span>
                  Branch
                </label>
                <input
                  type="text"
                  placeholder="e.g. CSE, IT"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  style={{
                    padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                    fontSize: 14, fontWeight: 500, fontFamily: 'Inter, sans-serif',
                    outline: 'none', transition: 'border-color 0.15s',
                    background: '#fafbfc',
                  }}
                />
              </div>

              {/* Year */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#586064', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>calendar_today</span>
                  Year
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2nd, 3rd"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  style={{
                    padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                    fontSize: 14, fontWeight: 500, fontFamily: 'Inter, sans-serif',
                    outline: 'none', transition: 'border-color 0.15s',
                    background: '#fafbfc',
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <button
                type="submit"
                disabled={submitting}
                className="ad-btn-primary"
                style={{ padding: '12px 28px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
                {submitting ? 'Adding...' : 'Add Participant'}
              </button>

              {recentlyAdded.length > 0 && (
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                  Last added: <strong style={{ color: '#432DD7' }}>{recentlyAdded[0].name}</strong>
                  {recentlyAdded[0].enrollment_no && ` (${recentlyAdded[0].enrollment_no})`}
                </p>
              )}
            </div>
          </form>

          {/* Recently Added List */}
          {recentlyAdded.length > 0 && (
            <div style={{ marginTop: 20, borderTop: '1px solid rgba(226,232,240,0.4)', paddingTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Recently Added ({recentlyAdded.length})
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {recentlyAdded.map((p, i) => (
                  <div key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', background: '#f0fdf4', borderRadius: 9999,
                    border: '1px solid #bbf7d0', fontSize: 12, fontWeight: 600, color: '#15803d',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/* ===== PARTICIPANT IMPORT SECTION ===== */
function ParticipantImportSection({ eventId }) {
  const [step, setStep] = useState(1)
  const [sheetData, setSheetData] = useState(null)
  const [columnAnalysis, setColumnAnalysis] = useState([])
  const [columnMapping, setColumnMapping] = useState({})
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  async function handleGoogleSheet(e) {
    e.preventDefault()
    const url = new FormData(e.target).get('sheetUrl')
    if (!url) return
    setLoading(true)
    try {
      const res = await fetch('/api/fetch-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to fetch sheet')
        setLoading(false)
        return
      }
      processSheetData(data)
    } catch (err) {
      toast.error('Network error. Try uploading the file directly.')
    }
    setLoading(false)
  }

  async function handleFileUpload(file) {
    if (!file) return
    setLoading(true)
    const result = await parseLocalFile(file)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    const plainResult = JSON.parse(JSON.stringify(result))
    processSheetData(plainResult)
    setLoading(false)
  }

  function processSheetData(data) {
    setSheetData(data)
    const analysis = analyzeColumns(data.headers, data.rows)
    setColumnAnalysis(analysis)
    const mapping = {}
    analysis.forEach(col => {
      if (col.selected) {
        mapping[col.columnName] = col.mappedField === 'extra' ? '__skip__' : col.mappedField
      }
    })
    setColumnMapping(mapping)
    setStep(2)
    toast.success(`Found ${data.totalRows} rows and ${data.headers.length} columns`)
  }

  function toggleColumn(columnName, selected) {
    const col = columnAnalysis.find(c => c.columnName === columnName)
    if (!col) return
    setColumnAnalysis(prev => prev.map(c => c.columnName === columnName ? { ...c, selected } : c))
    if (selected) {
      setColumnMapping(prev => ({ ...prev, [columnName]: col.mappedField === 'extra' ? '__skip__' : col.mappedField }))
    } else {
      setColumnMapping(prev => {
        const next = { ...prev }
        delete next[columnName]
        return next
      })
    }
  }

  function changeMapping(columnName, newField) {
    setColumnMapping(prev => ({ ...prev, [columnName]: newField }))
  }

  async function handleImport() {
    setLoading(true)
    try {
      const plainRows = JSON.parse(JSON.stringify(sheetData.rows))
      const plainMapping = JSON.parse(JSON.stringify(columnMapping))
      const result = await importParticipants(eventId, plainRows, plainMapping)
      setImportResult(result)
      setStep(3)
      toast.success(`Imported ${result.imported} participants`)
    } catch (err) {
      toast.error('Import failed: ' + (err.message || 'Unknown error'))
    }
    setLoading(false)
  }

  const hasNameColumn = Object.values(columnMapping).includes('name')
  const selectedCount = columnAnalysis.filter(c => c.selected).length
  const stepLabels = ['Source Selection', 'Data Mapping', 'Final Summary']

  return (
    <section className="ad-wizard">
      {/* Step Wizard Dots */}
      <div className="ad-steps">
        <div className="ad-steps-line"></div>
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`ad-step-dot ${step > s ? 'ad-step-done' : step === s ? 'ad-step-active' : 'ad-step-inactive'}`}
          >
            {step > s ? <Check size={18} /> : s}
          </div>
        ))}
      </div>
      <div className="ad-steps-labels">
        {stepLabels.map((label, i) => (
          <span key={label} className={`ad-step-label ${step >= i + 1 ? 'ad-step-label-active' : 'ad-step-label-inactive'}`}>{label}</span>
        ))}
      </div>

      {/* Wizard Content */}
      <div className="ad-wizard-card">
        {/* STEP 1 — Source Selection */}
        {step === 1 && (
          <div>
            <div className="ad-source-grid">
              {/* Google Sheets */}
              <div className="ad-source-card">
                <div className="ad-source-icon ad-source-icon-sheets">
                  <span className="material-symbols-outlined">table_chart</span>
                </div>
                <h3 className="ad-source-title">Google Sheets Sync</h3>
                <p className="ad-source-desc">Directly pull participant lists and live scores from an existing spreadsheet. Changes sync automatically.</p>
                <form onSubmit={handleGoogleSheet} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    name="sheetUrl"
                    style={{
                      width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                      padding: '10px 14px', fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', outline: 'none'
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                  <p style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                    <Info size={14} /> Ensure "Anyone with link can view" is on
                  </p>
                  <button type="submit" className="ad-btn-continue" disabled={loading} style={{ width: '100%', textAlign: 'center', justifyContent: 'center', display: 'flex' }}>
                    {loading ? 'Analyzing...' : 'Connect Sheet'}
                  </button>
                </form>
              </div>

              {/* File Upload */}
              <div className="ad-source-card" onClick={() => fileRef.current?.click()} style={{ display: 'flex', flexDirection: 'column' }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                  hidden
                />
                <div className="ad-source-icon ad-source-icon-upload">
                  <span className="material-symbols-outlined">upload_file</span>
                </div>
                <h3 className="ad-source-title">File Upload</h3>
                <p className="ad-source-desc">Upload .csv or .xlsx files manually. Best for static events or one-time batch imports.</p>
                <span className="ad-source-cta">
                  Browse Files <span className="material-symbols-outlined">arrow_forward</span>
                </span>
                {loading && <p style={{ fontSize: 12, color: '#432DD7', fontWeight: 600, marginTop: 12 }}>Processing...</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="ad-wizard-footer">
              <button
                className="ad-clear-btn"
                onClick={async () => {
                  if (confirm("⚠️ Delete ALL participants and their scores? This cannot be undone.")) {
                    const tid = toast('Deleting...')
                    const { error } = await clearAllParticipants(eventId)
                    toast.dismiss(tid)
                    if (error) toast.error(error)
                    else toast.warning("Deleted.", { description: "All participants removed permanently." })
                  }
                }}
              >
                <span className="material-symbols-outlined">delete_sweep</span>
                Clear All Data
              </button>
              <div className="ad-wizard-footer-right">
                <button className="ad-btn-draft">Save Draft</button>
                <button className="ad-btn-continue" disabled>Continue to Mapping</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Data Mapping */}
        {step === 2 && sheetData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#ecfdf5', color: '#047857', borderRadius: 9999, fontSize: 12, fontWeight: 700, border: '1px solid #a7f3d0' }}>
              <Check size={14} /> {sheetData.totalRows} rows and {sheetData.headers.length} columns found
            </div>

            {/* Column Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {columnAnalysis.map(col => (
                <div
                  key={col.columnName}
                  onClick={() => toggleColumn(col.columnName, !col.selected)}
                  style={{
                    padding: 16, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                    border: col.selected ? '1px solid #432DD7' : '1px solid #e2e8f0',
                    background: col.selected ? 'rgba(67,45,215,0.03)' : 'white',
                    opacity: col.selected ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, color: '#2b3437', fontSize: 14 }}>{col.columnName}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: '0.06em',
                      background: col.confidence === 'high' ? '#dcfce7' : col.confidence === 'medium' ? '#fef3c7' : '#dbeafe',
                      color: col.confidence === 'high' ? '#047857' : col.confidence === 'medium' ? '#b45309' : '#1d4ed8',
                    }}>
                      {col.detectedType}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {col.sampleValues.join(', ') || 'No data'}
                  </p>
                  {col.selected && (
                    <select
                      style={{
                        width: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
                        padding: '6px 8px', fontSize: 12, fontWeight: 700, color: '#334155', outline: 'none',
                        fontFamily: 'Inter, system-ui, sans-serif'
                      }}
                      value={columnMapping[col.columnName] || '__skip__'}
                      onChange={(e) => { e.stopPropagation(); changeMapping(col.columnName, e.target.value) }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="name">Name</option>
                      <option value="enrollment_no">Enrollment / ID</option>
                      <option value="branch">Branch</option>
                      <option value="year">Year</option>
                      <option value="email">Email</option>
                      <option value="__skip__">Extra Data</option>
                    </select>
                  )}
                </div>
              ))}
            </div>

            {/* Preview Table */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', fontSize: 14, borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      {Object.keys(columnMapping).map(col => (
                        <th key={col} style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetData.preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {Object.keys(columnMapping).map(col => (
                          <td key={col} style={{ padding: '12px 16px', color: '#475569' }}>{row[col] || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, paddingTop: 16 }}>
              <button
                className="ad-btn-continue"
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
                disabled={!hasNameColumn || loading}
                onClick={handleImport}
              >
                {loading ? 'Importing...' : <><Download size={20} /> Import Participants</>}
              </button>
              <button className="ad-btn-draft" onClick={() => setStep(1)}>Back</button>
            </div>
            {!hasNameColumn && (
              <p style={{ fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, background: '#fef2f2', padding: 12, borderRadius: 8, border: '1px solid #fecaca' }}>
                <AlertCircle size={14} /> Please map at least one column as "Name" to continue.
              </p>
            )}
          </div>
        )}

        {/* STEP 3 — Import Complete */}
        {step === 3 && importResult && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: 80, height: 80, background: '#ecfdf5', color: '#059669', borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Check size={40} />
            </div>
            <h4 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 32 }}>Import Complete!</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
              <div style={{ padding: 16, background: '#ecfdf5', borderRadius: 16, border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#059669' }}>{importResult.imported}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '-0.02em', marginTop: 4 }}>New</div>
              </div>
              <div style={{ padding: 16, background: '#fffbeb', borderRadius: 16, border: '1px solid #fde68a' }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#d97706' }}>{importResult.duplicates}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '-0.02em', marginTop: 4 }}>Updated</div>
              </div>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#475569' }}>{importResult.skipped}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '-0.02em', marginTop: 4 }}>Skipped</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button className="ad-btn-continue" onClick={() => { setStep(1); setSheetData(null); setImportResult(null) }}>Import More</button>
              <button className="ad-btn-draft" onClick={() => { setStep(1); setSheetData(null); setImportResult(null) }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ===== ROUNDS & CRITERIA SECTION ===== */
function RoundsCriteriaSection({ eventId }) {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [newRoundName, setNewRoundName] = useState('')
  const [expandedRound, setExpandedRound] = useState(null)
  const [participants, setParticipants] = useState([])

  useEffect(() => { loadRounds(); loadParticipants() }, [eventId])

  async function loadRounds() {
    setLoading(true)
    const { data, error } = await getRounds(eventId)
    if (error) toast.error(error)
    else setRounds(data || [])
    setLoading(false)
  }

  async function loadParticipants() {
    const { data } = await getParticipants(eventId)
    setParticipants(data || [])
  }

  async function handleCreateRound() {
    if (!newRoundName.trim()) return
    const { error } = await createRound(eventId, newRoundName.trim())
    if (error) toast.error(error)
    else {
      toast.success('Round created!')
      setNewRoundName('')
      await loadRounds()
    }
  }

  async function handleDeleteRound(id) {
    const { error } = await deleteRound(id)
    if (error) toast.error(error)
    else {
      toast.success('Round deleted')
      await loadRounds()
    }
  }

  const participantCount = participants.length
  const roundsConfigured = rounds.length
  const progressPercent = Math.min(100, Math.round(
    ((participantCount > 0 ? 35 : 0) + (roundsConfigured > 0 ? 30 : 0) + 35) // base 35% for being setup
  ))

  return (
    <section className="ad-asymmetric">
      {/* Left: Rounds & Criteria Builder */}
      <div>
        <div className="ad-rounds-header">
          <div>
            <h2>Rounds &amp; Criteria</h2>
            <p>Define scoring logic for each stage of your event.</p>
          </div>
          <button className="ad-btn-create-round" onClick={handleCreateRound} style={{ alignSelf: 'flex-end' }}>
            <span className="material-symbols-outlined">add_circle</span>
            Create Round
          </button>
        </div>

        {/* Round Name Input */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <input
            style={{
              flex: 1, background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
              padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#334155',
              outline: 'none', fontFamily: 'Inter, system-ui, sans-serif',
            }}
            placeholder="e.g. Round 1 — Presentation"
            value={newRoundName}
            onChange={(e) => setNewRoundName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateRound()}
          />
        </div>

        {loading ? (
          <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, animation: 'ad-pulse 1.2s linear infinite' }}>hourglass_top</span>
            <p style={{ fontSize: 14, marginTop: 12 }}>Loading rounds...</p>
          </div>
        ) : rounds.length === 0 ? (
          <div style={{ padding: 32, borderRadius: 12, border: '2px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            No rounds yet. Add your first judging round above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {rounds.map(round => (
              <div key={round.id} className="ad-round-card">
                <div
                  className="ad-round-card-header"
                  onClick={() => setExpandedRound(expandedRound === round.id ? null : round.id)}
                >
                  <div className="ad-round-card-header-left">
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>drag_indicator</span>
                    <div>
                      <h4 className="ad-round-card-title">{round.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                        <Clock size={12} />
                        {round.deadline ? <span>Ends: {new Date(round.deadline).toLocaleString()}</span> : <span>No deadline set</span>}
                      </div>
                    </div>
                  </div>
                  <div className="ad-round-card-header-right" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', fontWeight: 700 }}>Deadline</span>
                      <input
                        type="datetime-local"
                        style={{
                          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                          padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#334155', outline: 'none',
                          fontFamily: 'Inter, system-ui, sans-serif',
                        }}
                        value={round.deadline ? new Date(new Date(round.deadline).getTime() - new Date(round.deadline).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                        onChange={async (e) => {
                          const { error } = await updateRoundDeadline(round.id, e.target.value)
                          if (error) toast.error(error)
                          else { toast.success('Deadline updated'); loadRounds() }
                        }}
                      />
                    </div>
                    <button className="ad-round-delete-btn" onClick={() => handleDeleteRound(round.id)}>
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
                {expandedRound === round.id && <CriteriaBuilder roundId={round.id} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Progress Sidebar */}
      <div className="ad-progress-sidebar">
        {/* Progress Card */}
        <div className="ad-progress-card">
          <div className="ad-progress-card-bg">
            <svg width="100%" height="100%" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 150L80 120L160 160L240 80L320 110L400 40" stroke="white" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="80" cy="120" r="16" fill="white"/>
              <circle cx="160" cy="160" r="16" fill="white"/>
              <circle cx="240" cy="80" r="16" fill="white"/>
              <circle cx="320" cy="110" r="16" fill="white"/>
              <path d="M300 30L320 50L340 30L320 10L300 30Z" fill="white" opacity="0.4"/>
              <path d="M180 20L200 40L220 20L200 0L180 20Z" fill="white" opacity="0.4"/>
            </svg>
          </div>
          <div className="ad-progress-card-content">
            <h5 className="ad-progress-card-title">Setup Progress</h5>
            <div className="ad-progress-big">
              <span className="ad-progress-big-num">{progressPercent}%</span>
              <span className="ad-progress-big-label">Configured</span>
            </div>
            <div className="ad-progress-bar-section">
              <div className="ad-progress-bar-labels">
                <span>Participants</span>
                <span>{participantCount} Synchronized</span>
              </div>
              <div className="ad-progress-bar-track">
                <div className="ad-progress-bar-value" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist Card */}
        <div className="ad-checklist-card">
          <h5>Setup Checklist</h5>
          <ul className="ad-checklist-list">
            <li className={`ad-checklist-item ${participantCount > 0 ? 'ad-checklist-done' : 'ad-checklist-todo'}`}>
              <span className="material-symbols-outlined">{participantCount > 0 ? 'check_circle' : 'radio_button_unchecked'}</span>
              <div className="ad-checklist-item-text">
                <p>Sync Destination Set</p>
                <p>{participantCount > 0 ? `${participantCount} participants loaded.` : 'Import participants to begin.'}</p>
              </div>
            </li>
            <li className={`ad-checklist-item ${participantCount > 0 ? 'ad-checklist-done' : 'ad-checklist-todo'}`}>
              <span className="material-symbols-outlined">{participantCount > 0 ? 'check_circle' : 'radio_button_unchecked'}</span>
              <div className="ad-checklist-item-text">
                <p>Participant Mapping</p>
                <p>{participantCount > 0 ? 'Fields mapped successfully.' : 'Define column mappings.'}</p>
              </div>
            </li>
            <li className={`ad-checklist-item ${roundsConfigured > 0 ? 'ad-checklist-done' : 'ad-checklist-todo'}`}>
              <span className="material-symbols-outlined">{roundsConfigured > 0 ? 'check_circle' : 'radio_button_unchecked'}</span>
              <div className="ad-checklist-item-text">
                <p>Judging Logic</p>
                <p>{roundsConfigured > 0 ? `${roundsConfigured} round(s) configured.` : 'Define rounds and scoring weightage.'}</p>
              </div>
            </li>
            <li className="ad-checklist-item ad-checklist-todo">
              <span className="material-symbols-outlined">radio_button_unchecked</span>
              <div className="ad-checklist-item-text">
                <p>Launch Event</p>
                <p>Pending setup completion.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Help Card */}
        <div className="ad-help-card">
          <div className="ad-help-icon">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <div>
            <p>Smart Templates</p>
            <p>Need help? Try our AI preset generator.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ===== CRITERIA BUILDER ===== */
function CriteriaBuilder({ roundId }) {
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCriteria() }, [roundId])

  async function loadCriteria() {
    setLoading(true)
    const { data, error } = await getCriteria(roundId)
    if (error) toast.error(error)
    else {
      if (data && data.length > 0) {
        setCriteria(data.map(c => ({ id: c.id, name: c.name, max_score: c.max_score, weightage: c.weightage })))
      } else {
        setCriteria([
          { id: null, name: 'Innovation', max_score: 10, weightage: 1 },
          { id: null, name: 'Presentation', max_score: 10, weightage: 1 },
          { id: null, name: 'Technical Depth', max_score: 10, weightage: 1 },
        ])
      }
    }
    setLoading(false)
  }

  function addRow() { setCriteria([...criteria, { id: null, name: '', max_score: 10, weightage: 1 }]) }
  function removeRow(index) { setCriteria(criteria.filter((_, i) => i !== index)) }
  function updateRow(index, field, value) { setCriteria(criteria.map((c, i) => i === index ? { ...c, [field]: value } : c)) }

  async function handleSave() {
    if (!criteria.every(c => c.name.trim() && c.max_score > 0)) {
      toast.error('Invalid criteria name or max score')
      return
    }
    setSaving(true)
    const { error } = await saveCriteria(roundId, criteria)
    if (error) toast.error(error)
    else toast.success('Criteria saved!')
    setSaving(false)
  }

  if (loading) return (
    <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#432DD7', animation: 'ad-pulse 1.2s linear infinite' }}>hourglass_top</span>
    </div>
  )

  return (
    <div className="ad-criteria-body">
      {/* Column Headers */}
      <div className="ad-criteria-grid-head">
        <span>Criterion Name</span>
        <span>Max Score</span>
        <span>Weight (%)</span>
      </div>

      {/* Criteria Rows */}
      {criteria.map((c, index) => (
        <div key={index} className="ad-criteria-row">
          <div>
            <input
              className="ad-criteria-input-name"
              type="text"
              placeholder="Criteria name"
              value={c.name}
              onChange={(e) => updateRow(index, 'name', e.target.value)}
            />
          </div>
          <div>
            <input
              className="ad-criteria-input-num"
              type="number"
              value={c.max_score}
              onChange={(e) => updateRow(index, 'max_score', Number(e.target.value))}
              min="1"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="ad-criteria-input-num"
              type="number"
              value={c.weightage}
              onChange={(e) => updateRow(index, 'weightage', Number(e.target.value))}
              min="0.1"
              step="0.1"
            />
            <button
              onClick={() => removeRow(index)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, transition: 'color 0.15s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#9e3f4e'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
        </div>
      ))}

      {/* Add Criterion */}
      <button className="ad-add-criterion-btn" onClick={addRow}>
        <span className="material-symbols-outlined">add</span>
        Add Scoring Criterion
      </button>

      {/* Save */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button className="ad-btn-continue" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
        </button>
      </div>
    </div>
  )
}
