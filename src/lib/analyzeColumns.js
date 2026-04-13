/**
 * Fuzzy match patterns for auto-detecting column types.
 */
const PATTERNS = {
  name: ['name', 'student', 'participant', 'candidate', 'full name', 'student name'],
  id: ['enrollment', 'roll', 'reg', 'id', 'prn', 'usn', 'roll no', 'enrollment no', 'reg no', 'registration'],
  branch: ['branch', 'dept', 'department', 'stream', 'course', 'programme'],
  year: ['year', 'sem', 'semester', 'grade', 'class', 'section'],
  email: ['email', 'mail', 'e-mail'],
  phone: ['phone', 'mobile', 'contact', 'cell', 'tel'],
}

function fuzzyMatch(header, patterns) {
  const normalized = header.toLowerCase().trim()
  // Exact match
  if (patterns.includes(normalized)) return 'high'
  // Partial match
  for (const p of patterns) {
    if (normalized.includes(p) || p.includes(normalized)) return 'medium'
  }
  return null
}

function detectTypeByValues(values) {
  const emailRegex = /@/
  const phoneRegex = /^\d{10}$/

  const nonEmpty = values.filter(v => v && String(v).trim() !== '')

  if (nonEmpty.length === 0) return null

  const emailCount = nonEmpty.filter(v => emailRegex.test(String(v))).length
  if (emailCount > nonEmpty.length * 0.5) return { type: 'email', confidence: 'medium' }

  const phoneCount = nonEmpty.filter(v => phoneRegex.test(String(v).replace(/[\s-]/g, ''))).length
  if (phoneCount > nonEmpty.length * 0.5) return { type: 'phone', confidence: 'medium' }

  return null
}

/**
 * Analyze columns from parsed sheet data.
 * @param {string[]} headers - The column headers.
 * @param {object[]} rows - The data rows.
 * @returns {ColumnInfo[]} Analysis result sorted by confidence.
 */
export function analyzeColumns(headers, rows) {
  const results = headers.map((header) => {
    // Get sample values
    const sampleValues = rows
      .slice(0, 5)
      .map(row => row[header])
      .filter(v => v && String(v).trim() !== '')
      .slice(0, 3)

    // Try fuzzy matching on header name
    let detectedType = 'text'
    let confidence = 'low'
    let suggestedLabel = header

    for (const [type, patterns] of Object.entries(PATTERNS)) {
      const matchResult = fuzzyMatch(header, patterns)
      if (matchResult) {
        detectedType = type
        confidence = matchResult
        suggestedLabel = type === 'id' ? 'Enrollment / ID' : type.charAt(0).toUpperCase() + type.slice(1)
        break
      }
    }

    // If no header match, try value-based detection
    if (detectedType === 'text') {
      const valueResult = detectTypeByValues(sampleValues)
      if (valueResult) {
        detectedType = valueResult.type
        confidence = valueResult.confidence
        suggestedLabel = detectedType.charAt(0).toUpperCase() + detectedType.slice(1)
      }
    }

    // Map to participant field name
    const fieldMapping = {
      name: 'name',
      id: 'enrollment_no',
      branch: 'branch',
      year: 'year',
      email: 'email',
      phone: 'extra',
      text: 'extra',
    }

    return {
      columnName: header,
      sampleValues,
      detectedType,
      confidence,
      suggestedLabel,
      mappedField: fieldMapping[detectedType] || 'extra',
      selected: confidence !== 'low',
    }
  })

  // Sort by confidence (high first)
  const order = { high: 0, medium: 1, low: 2 }
  results.sort((a, b) => order[a.confidence] - order[b.confidence])

  return results
}
