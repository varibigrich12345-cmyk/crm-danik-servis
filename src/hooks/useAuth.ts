import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { translateError } from '@/utils/errorMessages'
import type { Profile } from '@/types/database'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function initialize() {
      console.log('Auth initialized')

      const { data: { session } } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          console.log('Profile query result:', { data, error, userId: session.user.id })

          if (!mounted) return
          setProfile(data)
        } catch (err) {
          console.error('Profile fetch failed:', err)
        }
      }

      if (!mounted) return
      setLoading(false)
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        setSession(session)
        setUser(session?.user ?? null)
        if (!session) {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      error.message = translateError(error.message)
    }
    return { error }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) {
      error.message = translateError(error.message)
    }
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: profile?.role === 'admin',
    isMaster: profile?.role === 'master',
  }
}