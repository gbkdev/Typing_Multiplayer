import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, Users, Contact, Settings, LogOut } from 'lucide-react'
import { signOut } from '@/services/auth'
import type { Profile } from '@/types'

interface ProfileMenuProps {
  profile: Profile
}

export function ProfileMenu({ profile }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/60 px-2.5 py-1.5 text-sm text-ink-200 transition-colors hover:border-ink-600"
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-ink-700 font-mono text-[10px] text-ink-200">
          {profile.username[0]?.toUpperCase()}
        </span>
        <span className="hidden font-mono sm:inline">{profile.username}</span>
        <span className="rounded bg-caret/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-caret">
          {profile.level}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 py-1.5 shadow-xl">
          <MenuLink to="/profile?tab=stats" icon={BarChart3} onClick={() => setOpen(false)}>
            User stats
          </MenuLink>
          <MenuLink to="/profile?tab=friends" icon={Users} onClick={() => setOpen(false)}>
            Friends
          </MenuLink>
          <MenuLink to={`/u/${profile.username}`} icon={Contact} onClick={() => setOpen(false)}>
            Public profile
          </MenuLink>
          <MenuLink to="/profile?tab=settings" icon={Settings} onClick={() => setOpen(false)}>
            Account settings
          </MenuLink>
          <div className="my-1 h-px bg-ink-700/60" />
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-100"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function MenuLink({
  to,
  icon: Icon,
  onClick,
  active,
  children,
}: {
  to: string
  icon: typeof BarChart3
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-ink-800/60 hover:text-ink-100 ${
        active ? 'bg-ink-800/40 text-ink-100' : 'text-ink-300'
      }`}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  )
}
