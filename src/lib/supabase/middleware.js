import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request })

  const { pathname } = request.nextUrl

  // Fully public routes — skip ALL auth/DB checks
  if (
    pathname === '/login' ||
    pathname === '/auth/callback' ||
    pathname === '/leaderboard' ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/api/')
  ) {
    return supabaseResponse
  }

  // Only create supabase client for protected routes
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not logged in, redirect to /login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Only query profiles table if accessing role-restricted routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/judge') || pathname.startsWith('/super-admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/admin') && role !== 'super_admin' && role !== 'club_admin') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'judge' ? '/judge' : '/login'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/judge') && role !== 'judge' && role !== 'super_admin') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'super_admin' ? '/admin' : '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
