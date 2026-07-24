import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AchievementBadge } from '@/features/profile/AchievementBadge'
import { ActivityHeatmap } from '@/features/profile/ActivityHeatmap'
import { FriendsPanel } from '@/features/profile/FriendsPanel'
import { ProfileUsernameEditor } from '@/features/profile/ProfileUsernameEditor'
import { getProfile, getUserAchievements, getDailyActivity } from '@/services/profile'
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

export function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [catalog, setCatalog] = useState<AchievementCatalogItem[]>([])
  const [earned, setEarned] = useState<Set<string>>(new Set())
  const [activity, setActivity] = useState<{ date: string; races: number }[]>([])

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(setProfile)
    supabase
      .from('achievements')
      .select('id, title, description, icon')
      .then(({ data }) => setCatalog((data ?? []) as AchievementCatalogItem[]))
    getUserAchievements(user.id).then((rows) =>
      setEarned(new Set((rows as unknown as AchievementRow[]).map((r) => r.achievement_id)))
    )
    getDailyActivity(user.id).then((rows) => setActivity(rows as unknown as { date: string; races: number }[]))
  }, [user])

  if (!user) return null

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
          <h1 className="font-mono text-xl text-ink-100">{profile.username}</h1>
          <p className="text-sm text-ink-500">
            Level {profile.level} · {profile.xp} XP · Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <ProfileUsernameEditor currentUsername={profile.username} onUpdated={(u) => setProfile({ ...profile, username: u })} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Stat label="races" value={profile.total_races} />
        <Stat label="wins" value={profile.wins} />
        <Stat label="avg wpm" value={Math.round(profile.average_wpm)} />
        <Stat label="best wpm" value={Math.round(profile.highest_wpm)} accent />
        <Stat label="avg accuracy" value={`${Math.round(profile.average_accuracy)}%`} />
      </div>

      <Card>
        <h2 className="mb-3 text-xs uppercase tracking-widest text-ink-500">Activity</h2>
        <ActivityHeatmap data={activity} />
      </Card>

      <div>
        <h2 className="mb-3 text-xs uppercase tracking-widest text-ink-500">Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {catalog.map((a) => (
            <AchievementBadge key={a.id} {...a} earned={earned.has(a.id)} />
          ))}
        </div>
      </div>

      <FriendsPanel userId={user.id} />
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
