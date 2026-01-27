import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          if (!mounted) return

          setState({
            user: session.user,
            session,
            profile: profile || null,
            loading: false,
            error: error?.message || null,
          })
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
          }))
        }
      } catch (error) {
        if (!mounted) return
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Ошибка инициализации',
        }))
      }
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          setState({
            user: session.user,
            session,
            profile: profile || null,
            loading: false,
            error: null,
          })
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
          })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
      return { error }
    }

    return { error: null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'master',
        },
      },
    })

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
      return { error }
    }

    setState(prev => ({ ...prev, loading: false }))
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const isAdmin = state.profile?.role === 'admin'
  const isMaster = state.profile?.role === 'master'

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isMaster,
  }
}