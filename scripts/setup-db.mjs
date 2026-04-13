// Simplified setup: Only creates admin user via Supabase Auth API
// Run with: node --env-file=.env.local scripts/setup-db.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing env variables.')
  console.error('   Run: node --env-file=.env.local scripts/setup-db.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const ADMIN_EMAIL = 'admin@eventrank.com'
const ADMIN_PASSWORD = 'ChangeMe@12345'

async function setup() {
  console.log('🚀 EventRank Setup\n')

  // Step 1: Create super admin user in Supabase Auth
  console.log('👤 Creating Super Admin user...')

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL)

  let userId

  if (existing) {
    userId = existing.id
    console.log('   ℹ️  User already exists:', ADMIN_EMAIL)
  } else {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    })

    if (createError) {
      console.error('❌ Failed to create user:', createError.message)
      process.exit(1)
    }
    userId = newUser.user.id
    console.log('   ✅ Auth user created')
  }

  // Step 2: Insert profile as super_admin
  console.log('📝 Creating super_admin profile...')

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: 'Super Admin',
      email: ADMIN_EMAIL,
      role: 'super_admin',
    })

  if (profileError) {
    console.error('❌ Profile error:', profileError.message)
    console.log('')
    console.log('   ⚠️  This likely means the database tables haven\'t been created yet.')
    console.log('   👉 Please run the SQL migration in your Supabase SQL Editor first:')
    console.log(`      ${SUPABASE_URL.replace('.co', '.co/project/').replace('https://', 'https://supabase.com/dashboard/project/')}sql/new`)
    console.log('   👉 Copy & paste the contents of: supabase/migrations/001_initial_schema.sql')
    console.log('   👉 Then re-run this script.')
  } else {
    console.log('   ✅ Profile created as super_admin')
    console.log('')
    console.log('============================')
    console.log('🎉 Setup complete!')
    console.log('')
    console.log('📧 Login credentials:')
    console.log(`   Email:    ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log('')
    console.log('🌐 Start the app: npm run dev')
    console.log('   Visit: http://localhost:3000/login')
  }
}

setup().catch(console.error)
