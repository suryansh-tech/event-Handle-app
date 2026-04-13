'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function upsertScore(participantId, criteriaId, judgeId, score) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scores')
    .upsert(
      {
        participant_id: participantId,
        criteria_id: criteriaId,
        judge_id: judgeId,
        score: score,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'participant_id,criteria_id,judge_id',
      }
    )
    .select()
    .single()

  if (error) return { error: error.message }

  return { data }
}

export async function upsertScoresBatch(scoresArray) {
  const supabase = await createClient()

  const records = scoresArray.map(s => ({
    participant_id: s.participantId,
    criteria_id: s.criteriaId,
    judge_id: s.judgeId,
    score: s.score,
    updated_at: new Date().toISOString(),
  }))

  // Skip if empty
  if (records.length === 0) return { data: [] }

  const { data, error } = await supabase
    .from('scores')
    .upsert(records, {
      onConflict: 'participant_id,criteria_id,judge_id',
    })
    .select()

  if (error) return { error: error.message }

  return { data }
}

export async function upsertPenalty(eventId, participantId, judgeId, penalty) {
  const supabase = await createClient()

  // Make sure penalty is at least 0
  const validPenalty = Math.max(0, Number(penalty))

  const { data, error } = await supabase
    .from('participant_penalties')
    .upsert(
      {
        event_id: eventId,
        participant_id: participantId,
        judge_id: judgeId,
        penalty: validPenalty,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'participant_id,judge_id',
      }
    )
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function getPenaltiesForJudge(eventId, judgeId) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('participant_penalties')
    .select('id, event_id, participant_id, judge_id, penalty, updated_at')
    .eq('event_id', eventId)
    .eq('judge_id', judgeId)

  if (error) return { error: error.message }
  return { data: data || [] }
}

export async function getScoresForJudge(eventId, judgeId) {
  const supabase = await createClient()

  // Single query using JOIN — no participant ID list needed
  const { data: scores, error } = await supabase
    .from('scores')
    .select('id, participant_id, criteria_id, judge_id, score, updated_at, participants!inner(event_id)')
    .eq('participants.event_id', eventId)
    .eq('judge_id', judgeId)

  if (error) return { error: error.message }
  return { data: scores || [] }
}

export async function getAllScoresForEvent(eventId) {
  const { createAdminClient } = require('@/lib/supabase/server')
  const adminSupabase = await createAdminClient()

  // Single query using JOIN — scales to any number of participants
  const { data: scores, error } = await adminSupabase
    .from('scores')
    .select('*, profiles:judge_id(name, email), participants!inner(event_id)')
    .eq('participants.event_id', eventId)

  if (error) return { error: error.message }
  return { data: scores || [] }
}

export async function getLeaderboard(eventId) {
  const { createAdminClient } = require('@/lib/supabase/server')
  const adminSupabase = await createAdminClient()

  const { data, error } = await adminSupabase
    .rpc('get_leaderboard', { p_event_id: eventId })

  if (error) return { error: error.message }
  return { data: data || [] }
}

/**
 * Get scoring status from OTHER judges for each participant.
 * Returns a map: { participantId: { count, names: ['Judge A', ...] } }
 */
export async function getOtherJudgesStatus(eventId, currentJudgeId) {
  const { createAdminClient } = require('@/lib/supabase/server')
  const adminSupabase = await createAdminClient()

  // Single query using JOIN — no participant ID list needed
  const { data: scores, error } = await adminSupabase
    .from('scores')
    .select('participant_id, judge_id, profiles!judge_id(name, email), participants!inner(event_id)')
    .eq('participants.event_id', eventId)
    .neq('judge_id', currentJudgeId)

  if (error) return { error: error.message }

  // Build map: participantId → { count, names }
  const statusMap = {}
  const seen = new Set() // track unique judge-participant pairs

  for (const s of (scores || [])) {
    const key = `${s.participant_id}_${s.judge_id}`
    if (seen.has(key)) continue
    seen.add(key)

    if (!statusMap[s.participant_id]) {
      statusMap[s.participant_id] = { count: 0, names: [] }
    }
    statusMap[s.participant_id].count++
    const name = s.profiles?.name || s.profiles?.email?.split('@')[0] || 'Unknown'
    if (!statusMap[s.participant_id].names.includes(name)) {
      statusMap[s.participant_id].names.push(name)
    }
  }

  return { data: statusMap }
}
