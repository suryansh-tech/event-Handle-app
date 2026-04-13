'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function importParticipants(eventId, rows, columnMapping) {
  const supabase = await createClient()

  const standardFields = ['name', 'enrollment_no', 'branch', 'year', 'email']
  const results = { imported: 0, skipped: 0, duplicates: 0 }

  // Build all participants first
  const allParticipants = []
  for (const row of rows) {
    const participant = { event_id: eventId }
    const extraData = {}

    for (const [originalCol, mappedField] of Object.entries(columnMapping)) {
      if (standardFields.includes(mappedField)) {
        participant[mappedField] = row[originalCol] ? String(row[originalCol]).trim() : null
      } else if (mappedField !== '__skip__') {
        extraData[originalCol] = row[originalCol] || null
      }
    }

    // Skip rows without a name
    if (!participant.name || participant.name.trim() === '') {
      results.skipped++
      continue
    }

    participant.name = participant.name.trim()
    if (participant.enrollment_no) {
      participant.enrollment_no = String(participant.enrollment_no).trim()
    }
    if (Object.keys(extraData).length > 0) {
      participant.extra_data = extraData
    }

    allParticipants.push(participant)
  }

  if (allParticipants.length === 0) {
    return results
  }

  // Get existing participants for duplicate checking (one query instead of N)
  const { data: existing } = await supabase
    .from('participants')
    .select('id, name, enrollment_no')
    .eq('event_id', eventId)

  const existingByEnrollment = {}
  const existingByName = {}
  for (const e of (existing || [])) {
    if (e.enrollment_no) existingByEnrollment[e.enrollment_no.toLowerCase()] = e.id
    if (e.name) existingByName[e.name.toLowerCase()] = e.id
  }

  const toInsert = []
  const toUpdate = []

  for (const p of allParticipants) {
    let existingId = null

    if (p.enrollment_no) {
      existingId = existingByEnrollment[p.enrollment_no.toLowerCase()] || null
    }
    if (!existingId && p.name) {
      existingId = existingByName[p.name.toLowerCase()] || null
    }

    if (existingId) {
      toUpdate.push({ ...p, id: existingId })
      results.duplicates++
    } else {
      toInsert.push(p)
      results.imported++
    }
  }

  // Batch insert new participants (chunks of 200)
  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200)
    const { error } = await supabase.from('participants').insert(chunk)
    if (error) {
      // If batch fails, try one-by-one
      for (const p of chunk) {
        const { error: singleErr } = await supabase.from('participants').insert(p)
        if (singleErr) {
          results.imported--
          results.skipped++
        }
      }
    }
  }

  // Batch update existing in parallel chunks of 50
  for (let i = 0; i < toUpdate.length; i += 50) {
    const chunk = toUpdate.slice(i, i + 50)
    await Promise.all(chunk.map(p => {
      const { id, ...updateData } = p
      return supabase.from('participants').update(updateData).eq('id', id)
    }))
  }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return results
}

export async function getParticipants(eventId) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('participants')
    .select('id, event_id, name, enrollment_no, branch, year, email, created_at')
    .eq('event_id', eventId)
    .order('name', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

export async function deleteParticipant(participantId) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', participantId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true }
}

export async function clearAllParticipants(eventId) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('event_id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true }
}

export async function addManualParticipant(eventId, { name, enrollment_no, branch, year }) {
  const supabase = await createClient()

  if (!name || name.trim() === '') {
    return { error: 'Participant name is required.' }
  }

  const trimmedName = name.trim()
  const trimmedEnrollment = enrollment_no ? String(enrollment_no).trim() : null

  // Duplicate check by enrollment number (if provided)
  if (trimmedEnrollment) {
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('event_id', eventId)
      .ilike('enrollment_no', trimmedEnrollment)
      .limit(1)

    if (existing && existing.length > 0) {
      return { error: `A participant with enrollment "${trimmedEnrollment}" already exists in this event.` }
    }
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({
      event_id: eventId,
      name: trimmedName,
      enrollment_no: trimmedEnrollment,
      branch: branch ? String(branch).trim() : null,
      year: year ? String(year).trim() : null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { data }
}
