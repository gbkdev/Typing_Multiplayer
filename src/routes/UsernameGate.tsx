import { type ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getProfile } from '@/services/profile'
import { needsUsernameChoice } from '@/lib/username'
import type { Profile } from '@/types'

const ALLOWED_WITHOUT_USERNAME = ['/setup-username']

export function UsernameGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const [profile, setProfile] = useState<Profile | null>(null)
  // Tracks which user's profile we've actually finished fetching (or null
  // if none yet / no user). Comparing this to `user.id` — rather than using
  // a separate boolean "loading" flag — guarantees we can't redirect on a
  // stale render where auth has resolved but the profile fetch for the
  // *current* user hasn't started or finished yet (the race that caused
  // /setup-username to flash on a hard refresh even with a real username).
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setProfileUserId(null)
      return
    }
    let cancelled = false
    getProfile(user.id)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
      .finally(() => {
        if (!cancelled) setProfileUserId(user.id)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const profileLoading = !!user && profileUserId !== user.id

  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-caret" />
      </div>
    )
  }

  if (
    user &&
    (!profile || needsUsernameChoice(profile.username)) &&
    !ALLOWED_WITHOUT_USERNAME.includes(location.pathname)
  ) {
    return <Navigate to="/setup-username" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
