'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function getRounds(eventId) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rounds')
    .select('id, event_id, name, display_order, deadline, created_at')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

export async function createRound(eventId, name) {
  const supabase = await createClient()

  // Get current max display_order
  const { data: existing } = await supabase
    .from('rounds')
    .select('display_order')
    .eq('event_id', eventId)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.display_order ?? 0) + 1

  const { data, error } = await supabase
    .from('rounds')
    .insert({ event_id: eventId, name, display_order: nextOrder })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { data }
}

export async function deleteRound(roundId) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('rounds')
    .delete()
    .eq('id', roundId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true }
}

export async function updateRoundOrder(rounds) {
  const supabase = await createClient()

  await Promise.all(rounds.map(r =>
    supabase
      .from('rounds')
      .update({ display_order: r.display_order })
      .eq('id', r.id)
  ))

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true }
}

export async function updateRoundDeadline(roundId, deadline) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('rounds')
    .update({ deadline: deadline || null })
    .eq('id', roundId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true }
}
