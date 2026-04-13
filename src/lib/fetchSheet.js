import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/**
 * Extract Google Sheets ID from various URL formats.
 */
export function extractSheetId(url) {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /key=([a-zA-Z0-9-_]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/**
 * Fetch a public Google Sheet as CSV and parse it.
 */
export async function fetchGoogleSheet(url) {
  const sheetId = extractSheetId(url)
  if (!sheetId) {
    return { error: 'Invalid Google Sheets URL. Copy the full URL from your browser.' }
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`

  try {
    const res = await fetch(csvUrl)
    if (!res.ok) {
      if (res.status === 404) {
        return { error: 'Sheet not found. Check the URL and try again.' }
      }
      return { error: "Sheet is private. Please change sharing to 'Anyone with link can view'." }
    }

    const text = await res.text()
    if (!text || text.trim() === '') {
      return { error: 'Sheet appears to be empty.' }
    }

    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })

    return {
      rows: parsed.data,
      headers: parsed.meta.fields || [],
      totalRows: parsed.data.length,
      preview: parsed.data.slice(0, 5),
    }
  } catch (err) {
    return { error: 'Could not reach Google Sheets. Try uploading the file directly.' }
  }
}

/**
 * Parse a local CSV or Excel file.
 */
export function parseLocalFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()

    const fileName = file.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv')

    reader.onload = (e) => {
      try {
        if (isCSV) {
          const parsed = Papa.parse(e.target.result, { header: true, skipEmptyLines: true })
          resolve({
            rows: parsed.data,
            headers: parsed.meta.fields || [],
            totalRows: parsed.data.length,
            preview: parsed.data.slice(0, 5),
          })
        } else {
          // Excel file
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' })

          if (jsonData.length === 0) {
            resolve({ error: 'Sheet appears to be empty.' })
            return
          }

          const headers = Object.keys(jsonData[0])

          resolve({
            rows: jsonData,
            headers,
            totalRows: jsonData.length,
            preview: jsonData.slice(0, 5),
          })
        }
      } catch {
        resolve({ error: 'Could not parse the file. Ensure it is a valid CSV or Excel file.' })
      }
    }

    if (isCSV) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}
