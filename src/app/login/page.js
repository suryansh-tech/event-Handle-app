'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { gooeyToast as toast } from 'goey-toast'
import Head from 'next/head'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Auto-fill email from URL if present
  useEffect(() => {
    const urlEmail = searchParams.get('email')
    if (urlEmail) {
      setEmail(urlEmail)
      setTimeout(() => {
        const passEl = document.getElementById('password')
        if (passEl) passEl.focus()
      }, 100)
    }
  }, [searchParams])

  const supabase = createClient()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)

    // Clear any potentially corrupted old sessions/refresh tokens first
    await supabase.auth.signOut()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Logged in successfully!')
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 bg-[#432DD7]/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[15%] right-[10%] w-[500px] h-[500px] bg-[#432DD7]/10 rounded-full blur-[120px]"></div>
      </div>
      
      {/* Centralized Premium Card */}
      <div className="w-full max-w-[460px] z-10">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-10 card-shadow border border-slate-100">
              
              {/* Brand Anchor */}
              <div className="mb-10 text-center">
                <h1 className="font-[Manrope] text-3xl font-extrabold tracking-tight text-slate-900 mb-2">EventRank</h1>
                <p className="text-slate-500 text-sm font-medium tracking-wide uppercase">Elevating Events</p>
              </div>
              
              {/* Identity Verification Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-slate-400 ml-1" htmlFor="email">Email Address</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#432DD7] transition-colors">mail</span>
                    <input 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50/50 rounded-2xl border border-slate-100 focus:border-[#432DD7]/30 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all font-medium input-focus-ring outline-none" 
                      id="email" 
                      placeholder="name@company.com" 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold tracking-widest uppercase text-slate-400 ml-1" htmlFor="password">Password</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#432DD7] transition-colors">lock</span>
                    <input 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50/50 rounded-2xl border border-slate-100 focus:border-[#432DD7]/30 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all font-medium input-focus-ring outline-none" 
                      id="password" 
                      placeholder="••••••••" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input className="peer appearance-none w-4 h-4 border border-slate-200 rounded-md checked:bg-[#432DD7] checked:border-[#432DD7] transition-all cursor-pointer" type="checkbox" />
                      <span className="material-symbols-outlined absolute text-[12px] text-white opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Keep me signed in</span>
                  </label>
                  <a className="text-xs font-semibold text-[#432DD7] hover:underline underline-offset-4 transition-all" href="#">Forgot Password?</a>
                </div>
                
                <div className="pt-2">
                  <button 
                    className="w-full btn-premium flex justify-center items-center text-white font-[Manrope] font-bold py-4 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none" 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span> : null}
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-10 flex justify-center items-center gap-8 opacity-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-slate-400" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Enterprise Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-slate-400" style={{ fontVariationSettings: "'FILL' 1" }}>encrypted</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">256-Bit SSL</span>
              </div>
            </div>
          </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .premium-gradient {
            background: radial-gradient(circle at 0% 0%, rgba(67, 45, 215, 0.03) 0%, transparent 50%),
                        radial-gradient(circle at 100% 100%, rgba(67, 45, 215, 0.05) 0%, transparent 50%),
                        radial-gradient(circle at 50% 50%, #ffffff 0%, #f9fafb 100%);
        }
        .card-shadow {
            box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.04), 
                        0 20px 25px -5px rgba(0, 0, 0, 0.02);
        }
        .btn-premium {
            background-color: #432DD7;
            box-shadow: 0 4px 14px 0 rgba(67, 45, 215, 0.3);
            transition: all 0.2s ease;
        }
        .btn-premium:hover {
            background-color: #3522b5;
            box-shadow: 0 6px 20px rgba(67, 45, 215, 0.4);
            transform: translateY(-1px);
        }
        .btn-premium:active {
            transform: translateY(0px);
        }
        .input-focus-ring:focus {
            box-shadow: 0 0 0 4px rgba(67, 45, 215, 0.1);
        }
      `}} />

      <div className="premium-gradient font-[Inter] text-slate-900 antialiased min-h-screen flex flex-col">
        <main className="flex-grow flex items-center justify-center px-6 py-12 relative">
          <Suspense fallback={<div className="text-center font-medium">Loading credentials...</div>}>
            <LoginForm />
          </Suspense>
        </main>
        
        {/* Footer */}
        <footer className="w-full py-8 bg-transparent border-t border-slate-100/50">
          <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto px-8 gap-4">
            <div className="text-lg font-extrabold text-slate-900 tracking-tight">EventRank</div>
            <div className="flex flex-wrap justify-center gap-8">
              <a className="text-slate-400 hover:text-slate-900 font-[Inter] text-xs font-medium transition-colors" href="#">Privacy Policy</a>
              <a className="text-slate-400 hover:text-slate-900 font-[Inter] text-xs font-medium transition-colors" href="#">Terms of Service</a>
              <a className="text-slate-400 hover:text-slate-900 font-[Inter] text-xs font-medium transition-colors" href="#">Security</a>
              <a className="text-slate-400 hover:text-slate-900 font-[Inter] text-xs font-medium transition-colors" href="#">Status</a>
            </div>
            <div className="font-[Inter] text-xs text-slate-400 font-medium">© 2024 EventRank Inc. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  )
}
