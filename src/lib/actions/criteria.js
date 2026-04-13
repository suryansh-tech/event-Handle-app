'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function getCriteria(roundId) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('criteria')
    .select('id, round_id, name, max_score, weightage, display_order')
    .eq('round_id', roundId)
    .order('display_order', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

export async function getCriteriaForEvent(eventId) {
  const supabase = await createClient()

  // Single query: get rounds with their criteria via join
  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, name, display_order, deadline')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true })

  if (!rounds || rounds.length === 0) return { data: [] }

  const roundIds = rounds.map(r => r.id)

  // Single query for ALL criteria across all rounds
  const { data: allCriteria } = await supabase
    .from('criteria')
    .select('*')
    .in('round_id', roundIds)
    .order('display_order', { ascending: true })

  // Group criteria by round in JS (instead of N separate queries)
  const result = rounds.map(round => ({
    ...round,
    criteria: (allCriteria || []).filter(c => c.round_id === round.id)
  }))

  return { data: result }
}

export async function saveCriteria(roundId, criteriaList) {
  const supabase = await createClient()

  // 1. Get existing criteria to see what needs to be deleted
  const { data: existing } = await supabase
    .from('criteria')
    .select('id')
    .eq('round_id', roundId)
    
  // 2. Separate into updates/inserts and prepare for upsert
  const toUpsert = criteriaList.map((c, index) => {
    const record = {
      id: c.id || crypto.randomUUID(),
      round_id: roundId,
      name: c.name,
      max_score: c.max_score,
      weightage: c.weightage || 1,
      display_order: index + 1,
    }
    return record
  })

  // 3. Upsert the new/updated criteria
  const { data: upsertedData, error: upsertError } = await supabase
    .from('criteria')
    .upsert(toUpsert, { onConflict: 'id' })
    .select()

  if (upsertError) return { error: upsertError.message }

  // 4. Delete any criteria that were removed
  const newIds = toUpsert.map(c => c.id).filter(Boolean)
  if (existing) {
    const toDelete = existing.map(e => e.id).filter(id => !newIds.includes(id))
    if (toDelete.length > 0) {
      await supabase.from('criteria').delete().in('id', toDelete)
    }
  }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { data: upsertedData }
}
