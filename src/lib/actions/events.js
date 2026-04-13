'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function createEvent(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const name = formData.get('name')
  const description = formData.get('description')
  const result_mode = formData.get('result_mode') || 'avg' // Default to avg

  const { data, error } = await supabase
    .from('events')
    .insert({ 
      name, 
      description, 
      created_by: user.id, 
      result_mode,
      org_id: profile?.org_id || null 
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { data }
}

export async function toggleEventResultMode(eventId, resultMode) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('events')
    .update({ result_mode: resultMode })
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true }
}

export async function getEvents() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  if (profile?.role !== 'super_admin' && profile?.org_id) {
    query = query.eq('org_id', profile.org_id)
  }

  const { data: events, error } = await query

  if (error) return { error: error.message }
  if (!events || events.length === 0) return { data: [] }

  // Bulk fetch counts — 2 queries total instead of 2 per event
  const eventIds = events.map(e => e.id)
  const [pRes, jRes] = await Promise.all([
    supabase.from('participants').select('event_id').in('event_id', eventIds),
    supabase.from('event_judges').select('event_id').in('event_id', eventIds),
  ])

  const pCounts = {}
  for (const p of (pRes.data || [])) pCounts[p.event_id] = (pCounts[p.event_id] || 0) + 1
  const jCounts = {}
  for (const j of (jRes.data || [])) jCounts[j.event_id] = (jCounts[j.event_id] || 0) + 1

  const enriched = events.map(event => ({
    ...event,
    participantCount: pCounts[event.id] || 0,
    judgeCount: jCounts[event.id] || 0,
  }))

  return { data: enriched }
}

export async function toggleEventActive(eventId, setActive = true) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (setActive) {
    // First, deactivate all events
    let deactivateQuery = supabase.from('events').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    if (profile?.role !== 'super_admin' && profile?.org_id) {
      deactivateQuery = deactivateQuery.eq('org_id', profile.org_id)
    }
    await deactivateQuery

    // Then, activate the selected one
    let activateQuery = supabase.from('events').update({ is_active: true }).eq('id', eventId)
    if (profile?.role !== 'super_admin' && profile?.org_id) {
      activateQuery = activateQuery.eq('org_id', profile.org_id)
    }
    const { error } = await activateQuery
    if (error) return { error: error.message }
  } else {
    // Just deactivate the selected one
    let deactivateQuery = supabase.from('events').update({ is_active: false }).eq('id', eventId)
    if (profile?.role !== 'super_admin' && profile?.org_id) {
      deactivateQuery = deactivateQuery.eq('org_id', profile.org_id)
    }
    const { error } = await deactivateQuery
    if (error) return { error: error.message }
  }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true }
}

export async function toggleEventPublished(eventId, isPublished) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('events')
    .update({ is_published: isPublished })
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true }
}

export async function getActiveEvent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('events')
    .select('*')
    .eq('is_active', true)

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'judge') {
      const { data: judgeLinks } = await supabase.from('event_judges').select('event_id').eq('judge_id', user.id)
      const eventIds = judgeLinks?.map(jl => jl.event_id) || []
      if (eventIds.length > 0) {
        query = query.in('id', eventIds)
      }
    } else if (profile?.role !== 'super_admin' && profile?.org_id) {
      query = query.eq('org_id', profile.org_id)
    }
  }

  // The .limit(1).maybeSingle() is safer than .single() when there could be multiple active events globally
  const { data, error } = await query.limit(1).maybeSingle()

  if (error || !data) return { data: null }
  return { data }
}

export async function deleteEvent(eventId) {
  const supabase = await createClient()

  // All related data (participants, rounds, criteria, scores, penalties,
  // event_judges, judge_invites) will be automatically deleted via
  // ON DELETE CASCADE foreign keys in the database schema.
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true }
}
