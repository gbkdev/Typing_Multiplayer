import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Keyboard, Trophy, Users, User, LogIn, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/services/auth'
import { cn } from '@/lib/cn'
import { NotificationBell } from './NotificationBell'
import { SettingsMenu } from './SettingsMenu'

const links = [
  { to: '/', label: 'Type', icon: Keyboard },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/rooms', label: 'Multiplayer', icon: Users },
]

export function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

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
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <SettingsMenu />
          <NotificationBell />
          {user && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="hidden sm:flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-ink-400 hover:text-ink-100 hover:bg-ink-800/60 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          )}
          <Link
            to={user ? '/profile' : '/login'}
            title={user ? 'Profile' : 'Sign in'}
            className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm text-ink-300 hover:text-ink-100 hover:bg-ink-800/60 transition-colors"
          >
            {user ? <User className="size-4" /> : <LogIn className="size-4" />}
            <span className="hidden md:inline">{user ? 'Profile' : 'Sign in'}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
