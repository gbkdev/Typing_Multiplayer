import { useEffect, useMemo, useState } from 'react'
import { Crown, Loader2, Users, User as UserIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { countryFlag } from '@/lib/flag'
import { useAuth } from '@/contexts/AuthContext'
import { listFriends } from '@/services/friends'
import { fetchLeaderboard, type LeaderboardMode, type LeaderboardPeriod, type LeaderboardRow } from '@/services/leaderboard'

const periods: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all_time', label: 'All-time' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'daily', label: 'Daily' },
]

const testConfigs: { key: string; mode: LeaderboardMode; duration?: number; wordCount?: number; label: string }[] = [
  { key: 'time-15', mode: 'time', duration: 15, label: 'time 15' },
  { key: 'time-30', mode: 'time', duration: 30, label: 'time 30' },
  { key: 'time-60', mode: 'time', duration: 60, label: 'time 60' },
  { key: 'words-25', mode: 'words', wordCount: 25, label: 'words 25' },
  { key: 'words-50', mode: 'words', wordCount: 50, label: 'words 50' },
]

interface FriendRow {
  requester_id: string
  addressee_id: string
  requester?: { id: string }
  addressee?: { id: string }
}

export function LeaderboardPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time')
  const [config, setConfig] = useState(testConfigs[0])
  const [scope, setScope] = useState<'everyone' | 'friends'>('everyone')
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchLeaderboard({ period, mode: config.mode, duration: config.duration, wordCount: config.wordCount, limit: 300 })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [period, config])

  useEffect(() => {
    if (!user) return
    listFriends(user.id)
      .then((data) => {
        const ids = ((data ?? []) as unknown as FriendRow[]).map((f) =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        )
        setFriendIds(new Set(ids))
      })
      .catch(() => setFriendIds(new Set()))
  }, [user])

  const displayRows = useMemo(
    () => (scope === 'friends' ? rows.filter((r) => r.user_id === user?.id || friendIds.has(r.user_id)) : rows),
    [rows, scope, friendIds, user]
  )

  const myIndex = useMemo(() => rows.findIndex((r) => r.user_id === user?.id), [rows, user])
  const myRow = myIndex >= 0 ? rows[myIndex] : null
  const myPercentile = myIndex >= 0 && rows.length > 0 ? Math.round(((myIndex + 1) / rows.length) * 100) : null

  const boardTitle = `${periods.find((p) => p.key === period)?.label} ${config.label} leaderboard`

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-mono text-xl text-ink-100">Leaderboard</h1>

      <div className="flex flex-wrap gap-3">
        <FilterGroup label="Period">
          {periods.map((p) => (
            <FilterPill key={p.key} active={period === p.key} onClick={() => setPeriod(p.key)}>
              {p.label}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="Scope">
          <FilterPill active={scope === 'everyone'} onClick={() => setScope('everyone')} icon={Users}>
            everyone
          </FilterPill>
          <FilterPill active={scope === 'friends'} onClick={() => setScope('friends')} icon={UserIcon}>
            friends only
          </FilterPill>
        </FilterGroup>

        <FilterGroup label="Test">
          {testConfigs.map((c) => (
            <FilterPill key={c.key} active={config.key === c.key} onClick={() => setConfig(c)}>
              {c.label}
            </FilterPill>
          ))}
        </FilterGroup>
      </div>

      <h2 className="border-l-2 border-caret pl-3 font-mono text-sm uppercase tracking-widest text-ink-300">
        {boardTitle}
      </h2>

      {user && myRow && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-caret/40 bg-caret/5">
          <div>
            <p className="font-mono text-sm text-ink-100">
              You <span className="text-ink-500">(top {myPercentile}%)</span>
            </p>
            <p className="text-[11px] text-ink-500">rank #{myIndex + 1} of {rows.length}</p>
          </div>
          <div className="flex gap-6 text-right font-mono text-sm">
            <Metric label="wpm" value={Math.round(myRow.best_wpm)} accent />
            <Metric label="raw" value={Math.round(myRow.best_raw_wpm)} />
            <Metric label="accuracy" value={`${Math.round(myRow.best_accuracy)}%`} />
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-ink-500 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : displayRows.length === 0 ? (
          <p className="p-6 text-sm text-ink-500">
            {scope === 'friends'
              ? 'None of your friends have a run in this category yet.'
              : 'No races recorded for this category yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[10px] uppercase tracking-widest text-ink-500">
                  <th className="px-4 py-3 font-normal">Rank</th>
                  <th className="px-4 py-3 font-normal">Player</th>
                  <th className="px-4 py-3 font-normal text-right">WPM</th>
                  <th className="px-4 py-3 font-normal text-right">Raw</th>
                  <th className="px-4 py-3 font-normal text-right">Accuracy</th>
                  <th className="px-4 py-3 font-normal text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r, i) => {
                  const flag = countryFlag(r.country)
                  const isMe = r.user_id === user?.id
                  return (
                    <tr
                      key={r.user_id}
                      className={cn('border-b border-ink-800/50 last:border-0', isMe && 'bg-caret/5')}
                    >
                      <td className="px-4 py-2.5 font-mono text-ink-400">
                        {i === 0 ? <Crown className="size-4 text-caret" /> : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-2.5 text-ink-100">
                        <span className="flex items-center gap-2">
                          {flag && <span aria-hidden="true">{flag}</span>}
                          {r.username}
                          <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
                            {r.level}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-caret">{Math.round(r.best_wpm)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-400">{Math.round(r.best_raw_wpm)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-300">
                        {Math.round(r.best_accuracy)}%
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-ink-500">
                        {new Date(r.achieved_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel flex flex-col gap-1 px-3 py-2">
      <span className="text-[9px] uppercase tracking-widest text-ink-500">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: typeof Users
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-mono transition-colors',
        active ? 'bg-caret text-ink-950' : 'text-ink-400 hover:text-ink-100 hover:bg-ink-800/60'
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </button>
  )
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <p className={cn('tabular-nums', accent ? 'text-caret' : 'text-ink-200')}>{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-ink-500">{label}</p>
    </div>
  )
}
