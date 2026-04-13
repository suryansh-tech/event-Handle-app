import { NextResponse } from 'next/server'
import Papa from 'papaparse'

export async function POST(request) {
  try {
    const { url } = await request.json()

    // Extract sheet ID from URL
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /key=([a-zA-Z0-9-_]+)/,
    ]

    let sheetId = null
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) { sheetId = match[1]; break }
    }

    if (!sheetId) {
      return NextResponse.json(
        { error: 'Invalid Google Sheets URL. Copy the full URL from your browser.' },
        { status: 400 }
      )
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`

    const res = await fetch(csvUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: 'Sheet not found. Check the URL and try again.' }, { status: 404 })
      }
      return NextResponse.json(
        { error: "Sheet is private. Please change sharing to 'Anyone with link can view'." },
        { status: 403 }
      )
    }

    const text = await res.text()
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Sheet appears to be empty.' }, { status: 400 })
    }

    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })

    return NextResponse.json({
      rows: parsed.data,
      headers: parsed.meta.fields || [],
      totalRows: parsed.data.length,
      preview: parsed.data.slice(0, 5),
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not reach Google Sheets. Try uploading the file directly.' },
      { status: 500 }
    )
  }
}
