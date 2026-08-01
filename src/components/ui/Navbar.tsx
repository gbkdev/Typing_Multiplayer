import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Keyboard, Trophy, Users, LogIn, MessageCircle, CalendarDays } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { listConversations, subscribeToInbox } from '@/services/messages'
import { getProfile } from '@/services/profile'
import { cn } from '@/lib/cn'
import { NotificationBell } from './NotificationBell'
import { SettingsMenu } from './SettingsMenu'
import { ProfileMenu } from './ProfileMenu'
import type { Profile } from '@/types'

const links = [
  { to: '/', label: 'Type', icon: Keyboard },
  { to: '/daily', label: 'Daily', icon: CalendarDays },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/rooms', label: 'Multiplayer', icon: Users },
]

export function Navbar() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    getProfile(user.id)
      .then(setProfile)
      .catch(() => setProfile(null))
  }, [user])

  useEffect(() => {
    if (!user) return
    const refresh = () => {
      listConversations()
        .then((convos) => setUnreadMessages(convos.reduce((sum, c) => sum + c.unread_count, 0)))
        .catch(() => setUnreadMessages(0))
    }
    refresh()
    const unsubscribe = subscribeToInbox(user.id, refresh)
    return unsubscribe
  }, [user])

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-mono text-sm font-semibold text-caret">
          <span className="inline-block h-4 w-[2px] bg-caret animate-caret-blink" />
          typerace
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              title={label}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm text-ink-400 hover:text-ink-100 hover:bg-ink-800/60 transition-colors',
                pathname === to && 'text-caret bg-ink-800/60'
              )}
            >
              <Icon className="size-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
          {user && (
            <Link
              to="/messages"
              title="Messages"
              className={cn(
                'relative flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm text-ink-400 hover:text-ink-100 hover:bg-ink-800/60 transition-colors',
                pathname.startsWith('/messages') && 'text-caret bg-ink-800/60'
              )}
            >
              <MessageCircle className="size-4" />
              <span className="hidden md:inline">Messages</span>
              {unreadMessages > 0 && (
                <span className="absolute right-0.5 top-0.5 flex size-3.5 items-center justify-center rounded-full bg-caret text-[9px] font-bold text-ink-950 md:static md:ml-0.5">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <SettingsMenu />
          <NotificationBell />
          {user && profile ? (
            <ProfileMenu profile={profile} />
          ) : (
            <Link
              to="/login"
              title="Sign in"
              className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm text-ink-300 hover:text-ink-100 hover:bg-ink-800/60 transition-colors"
            >
              <LogIn className="size-4" />
              <span className="hidden md:inline">Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
