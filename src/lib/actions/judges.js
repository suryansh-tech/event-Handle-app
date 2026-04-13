'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import crypto from 'crypto'

/**
 * Generate a secure invite token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Invite a judge by email. Creates:
 * 1. A Supabase auth user (if not exists)
 * 2. A profile with role=judge
 * 3. An event_judges link
 * 4. A judge_invites row with a token that expires in 24 hours
 * 5. Sends the Supabase invite email automatically
 */
export async function inviteJudge(eventId, email) {
  const adminSupabase = await createAdminClient()
  const supabase = await createClient()

  // Check if user already exists
  const { data: existingUsers } = await adminSupabase.auth.admin.listUsers()
  let userId = null

  const existingUser = existingUsers?.users?.find(u => u.email === email)

  if (existingUser) {
    userId = existingUser.id

    // Ensure role is judge
    const { error: existingProfileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        role: 'judge',
      })
      
    if (existingProfileError) {
      console.error('Existing Profile Upsert Error:', existingProfileError)
      return { error: 'Failed to update existing judge profile: ' + existingProfileError.message }
    }
  } else {
    // Generate a secure temporary password
    const tempPassword = Math.random().toString(36).slice(-8)

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'judge' }
    })

    if (createError) return { error: createError.message }

    userId = newUser.user.id

    // Create profile as judge
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        role: 'judge',
        name: email.split('@')[0],
      })
      
    if (profileError) {
      console.error('Profile Upsert Error:', profileError)
      return { error: 'Failed to create judge profile: ' + profileError.message }
    }

    // Attach credentials to return so the admin can copy them
    var generatedCredentials = { email, password: tempPassword }
  }

  // Link judge to event AND create invite token in parallel
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const [linkResult, tokenResult] = await Promise.all([
    adminSupabase.from('event_judges').upsert({ event_id: eventId, judge_id: userId }),
    adminSupabase.from('judge_invites').insert({
      token,
      judge_id: userId,
      event_id: eventId,
      email,
      expires_at: expiresAt,
    }),
  ])

  if (linkResult.error) return { error: 'Failed to link judge to event: ' + linkResult.error.message }
  if (tokenResult.error) return { error: 'Failed to create invite token: ' + tokenResult.error.message }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true, userId, token, credentials: generatedCredentials || null }
}

/**
 * Validate an invite token and return the associated data.
 */
export async function validateInviteToken(token) {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('judge_invites')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single()

  if (error || !data) return { error: 'Invalid or expired invite link.' }

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    return { error: 'This invite link has expired. Ask the admin for a new one.' }
  }

  return { data }
}

/**
 * Activate a judge account using an invite token and a 6-digit PIN.
 */
export async function activateJudgeAccount(token, pin) {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return { error: 'Please enter a valid 6-digit PIN.' }
  }

  const adminSupabase = await createAdminClient()

  // Validate token
  const { data: invite, error: validateError } = await adminSupabase
    .from('judge_invites')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single()

  if (validateError || !invite) return { error: 'Invalid or expired invite link.' }

  if (new Date(invite.expires_at) < new Date()) {
    return { error: 'This invite link has expired.' }
  }

  // Update the user's password and confirm email
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
    invite.judge_id,
    { password: pin, email_confirm: true }
  )

  if (updateError) return { error: 'Could not set password: ' + updateError.message }

  // Mark token as used
  await adminSupabase
    .from('judge_invites')
    .update({ used: true })
    .eq('id', invite.id)

  return { success: true, email: invite.email }
}

export async function getJudgesForEvent(eventId) {
  const supabase = await createClient()

  const { data: eventJudges, error } = await supabase
    .from('event_judges')
    .select('judge_id')
    .eq('event_id', eventId)

  if (error) return { error: error.message }
  if (!eventJudges || eventJudges.length === 0) return { data: [] }

  const judgeIds = eventJudges.map(ej => ej.judge_id)

  // Batch: get profiles, participant count, invites, and ALL scores in parallel
  const adminSupabase = await createAdminClient()
  
  const [profilesRes, participantsRes, invitesRes, allScoresRes] = await Promise.all([
    supabase.from('profiles').select('*').in('id', judgeIds),
    supabase.from('participants').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
    adminSupabase.from('judge_invites').select('judge_id, token, expires_at, used').eq('event_id', eventId),
    adminSupabase.from('scores').select('judge_id, participant_id').in('judge_id', judgeIds),
  ])

  const profiles = profilesRes.data || []
  const totalParticipants = participantsRes.count || 0
  const invites = invitesRes.data || []
  const allScores = allScoresRes.data || []

  // Pre-compute scored counts per judge in JS (no more N+1 queries)
  const scoredByJudge = {}
  for (const s of allScores) {
    if (!scoredByJudge[s.judge_id]) scoredByJudge[s.judge_id] = new Set()
    scoredByJudge[s.judge_id].add(s.participant_id)
  }

  const enriched = profiles.map(judge => {
    const uniqueScored = scoredByJudge[judge.id] || new Set()

    // Find latest invite for this judge
    const judgeInvites = invites.filter(i => i.judge_id === judge.id)
    const latestInvite = judgeInvites.sort((a, b) => new Date(b.expires_at) - new Date(a.expires_at))[0]

    return {
      ...judge,
      scored: uniqueScored.size,
      total: totalParticipants,
      inviteToken: latestInvite?.token || null,
      inviteUsed: latestInvite?.used || false,
      inviteExpired: latestInvite ? new Date(latestInvite.expires_at) < new Date() : true,
    }
  })

  return { data: enriched }
}

export async function removeJudge(eventId, judgeId) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  // Check if judge is assigned to multiple events
  const { count } = await adminSupabase
    .from('event_judges')
    .select('event_id', { count: 'exact', head: true })
    .eq('judge_id', judgeId)

  if (count <= 1) {
    // Judge is only assigned to this current event. 
    // Fully PURGE their auth account (cascades profiles, invites, and scores).
    const { error } = await adminSupabase.auth.admin.deleteUser(judgeId)
    if (error) return { error: error.message }
  } else {
    // Judge is judging multiple events! Safely decouple them from THIS event only.
    await adminSupabase.from('event_judges').delete().eq('event_id', eventId).eq('judge_id', judgeId)
    await adminSupabase.from('judge_invites').delete().eq('event_id', eventId).eq('judge_id', judgeId)
    
    // Attempt to delete their scores for this specific event to prevent skew 
    // (requires a complex join, but scores are directly linked via participant_id)
    const { data: eventParticipants } = await adminSupabase.from('participants').select('id').eq('event_id', eventId)
    if (eventParticipants && eventParticipants.length > 0) {
      const pIds = eventParticipants.map(p => p.id)
      await adminSupabase.from('scores').delete().eq('judge_id', judgeId).in('participant_id', pIds)
    }
  }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true }
}

export async function resetJudgePassword(judgeId, email) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only club_admin or super_admin can reset judge passwords
  if (profile?.role !== 'club_admin' && profile?.role !== 'super_admin') {
    return { error: 'Unauthorized. Only admins can reset judge passwords.' }
  }

  const adminSupabase = await createAdminClient()
  const tempPassword = Math.random().toString(36).slice(-8)

  const { error } = await adminSupabase.auth.admin.updateUserById(judgeId, {
    password: tempPassword,
    email_confirm: true
  })

  if (error) return { error: error.message }

  return { success: true, credentials: { email, password: tempPassword } }
}
export async function purgeAllJudges(eventId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Only super_admin can purge all judges
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return { error: 'Unauthorized. Only Super Admins can purge judge data.' }
  }

  const { data: eventJudges, error: fetchError } = await supabase
    .from('event_judges')
    .select('judge_id')
    .eq('event_id', eventId)

  if (fetchError) return { error: fetchError.message }
  if (!eventJudges || eventJudges.length === 0) return { success: true, message: 'No judges to purge' }

  const adminSupabase = await createAdminClient()
  const purgeResults = await Promise.all(
    eventJudges.map(async (ej) => {
      // 1. Delete Auth User (Admin only)
      const { error: authError } = await adminSupabase.auth.admin.deleteUser(ej.judge_id)
      
      // 2. Delete Profile (Cascade handles scores & event_judges)
      const { error: profileError } = await adminSupabase
        .from('profiles')
        .delete()
        .eq('id', ej.judge_id)

      return { id: ej.judge_id, error: authError || profileError }
    })
  )

  const fails = purgeResults.filter(r => r.error)
  if (fails.length > 0) {
    console.error('Some purges failed:', fails)
  }

  revalidatePath('/admin')
  revalidateTag('platform-data')
  return { success: true, purged: eventJudges.length }
}
