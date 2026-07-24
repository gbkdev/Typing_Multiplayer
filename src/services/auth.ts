import { supabase } from '@/lib/supabase'
import { setUsername } from '@/services/profile'
import { normalizeUsername } from '@/lib/username'

export async function signUpWithEmail(email: string, password: string, username: string) {
  const chosen = normalizeUsername(username)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: chosen },
    },
  })
  if (error) throw error
  if (data.session) {
    await setUsername(chosen)
  }
  return data
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
  return data
}

export async function signInWithGithub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}
