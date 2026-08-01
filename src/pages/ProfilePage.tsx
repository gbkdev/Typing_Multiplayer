import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, Target } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { countryFlag } from '@/lib/flag'
import { AchievementBadge } from '@/features/profile/AchievementBadge'
import { ActivityHeatmap } from '@/features/profile/ActivityHeatmap'
import { FriendsPanel } from '@/features/profile/FriendsPanel'
import { ProfileUsernameEditor } from '@/features/profile/ProfileUsernameEditor'
import { AccountSettingsPanel } from '@/features/profile/AccountSettingsPanel'
import { BlockedUsersPanel } from '@/features/profile/BlockedUsersPanel'
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

const tabs = [
  { key: 'stats', label: 'User stats' },
  { key: 'friends', label: 'Friends' },
  { key: 'settings', label: 'Account settings' },
] as const

type TabKey = (typeof tabs)[number]['key']

export function ProfilePage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [catalog, setCatalog] = useState<AchievementCatalogItem[]>([])
  const [earned, setEarned] = useState<Set<string>>(new Set())
  const [activity, setActivity] = useState<{ date: string; races: number }[]>([])

  const tabParam = searchParams.get('tab')
  const activeTab: TabKey = tabs.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'stats'

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

  const weakKeys = Object.entries(profile.key_mistake_stats ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

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

      <div className="flex gap-1 glass-panel w-fit px-1.5 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSearchParams({ tab: t.key })}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-mono transition-colors',
              activeTab === t.key ? 'bg-caret text-ink-950' : 'text-ink-400 hover:text-ink-100'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && (
        <>
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

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest text-ink-500">Weak keys</h2>
              {weakKeys.length > 0 && (
                <Link to="/?practice=weak" className="flex items-center gap-1.5 text-xs text-caret hover:underline">
                  <Target className="size-3.5" /> Practice these
                </Link>
              )}
            </div>
            {weakKeys.length === 0 ? (
              <p className="text-sm text-ink-500">
                Not enough data yet — keep typing and we'll spot the keys that trip you up most.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {weakKeys.map(([char, count]) => (
                  <span
                    key={char}
                    className="flex items-center gap-1.5 rounded-lg bg-ink-800 px-2.5 py-1 font-mono text-sm text-ink-100"
                  >
                    {char === ' ' ? '␣' : char}
                    <span className="text-[10px] text-ink-500">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </Card>

          <div>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-ink-500">Achievements</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {catalog.map((a) => (
                <AchievementBadge key={a.id} {...a} earned={earned.has(a.id)} />
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'friends' && <FriendsPanel userId={user.id} />}

      {activeTab === 'settings' && (
        <>
          <ProfileUsernameEditor
            currentUsername={profile.username}
            onUpdated={(u) => setProfile({ ...profile, username: u })}
          />
          <AccountSettingsPanel profile={profile} onUpdated={(updates) => setProfile({ ...profile, ...updates })} />
          <BlockedUsersPanel userId={user.id} />
        </>
      )}
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
