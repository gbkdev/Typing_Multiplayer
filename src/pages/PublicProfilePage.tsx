import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { countryFlag } from '@/lib/flag'
import { AchievementBadge } from '@/features/profile/AchievementBadge'
import { getProfileByUsername, getUserAchievements } from '@/services/profile'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AchievementRow {
  achievement_id: string
  achievement: { id: string; title: string; description: string; icon: string }
}

interface AchievementCatalogItem {
  id: string
  title: string
  description: string
  icon: string
}

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [catalog, setCatalog] = useState<AchievementCatalogItem[]>([])
  const [earned, setEarned] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!username) return
    setNotFound(false)
    setProfile(null)
    getProfileByUsername(username)
      .then((p) => {
        setProfile(p)
        supabase
          .from('achievements')
          .select('id, title, description, icon')
          .then(({ data }) => setCatalog((data ?? []) as AchievementCatalogItem[]))
        getUserAchievements(p.id).then((rows) =>
          setEarned(new Set((rows as unknown as AchievementRow[]).map((r) => r.achievement_id)))
        )
      })
      .catch(() => setNotFound(true))
  }, [username])

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-ink-400">No player called "{username}" here.</p>
        <Link to="/leaderboard" className="text-sm text-caret hover:underline">
          Back to the leaderboard
        </Link>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-caret" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-ink-800 font-mono text-2xl text-caret">
          {profile.username[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="flex items-center gap-2 font-mono text-xl text-ink-100">
            {profile.country && <span aria-hidden="true">{countryFlag(profile.country)}</span>}
            {profile.username}
            <span className="rounded bg-caret/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-caret">
              Lv {profile.level}
            </span>
          </h1>
          <p className="text-sm text-ink-500">
            {profile.xp} XP · Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>
          {profile.bio && <p className="mt-1 max-w-md text-sm text-ink-400">{profile.bio}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Stat label="races" value={profile.total_races} />
        <Stat label="wins" value={profile.wins} />
        <Stat label="avg wpm" value={Math.round(profile.average_wpm)} />
        <Stat label="best wpm" value={Math.round(profile.highest_wpm)} accent />
        <Stat label="avg accuracy" value={`${Math.round(profile.average_accuracy)}%`} />
      </div>

      <div>
        <h2 className="mb-3 text-xs uppercase tracking-widest text-ink-500">Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {catalog.map((a) => (
            <AchievementBadge key={a.id} {...a} earned={earned.has(a.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card className="p-4">
      <p className={`font-mono text-2xl font-semibold tabular-nums ${accent ? 'text-caret' : 'text-ink-100'}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-ink-500">{label}</p>
    </Card>
  )
}
