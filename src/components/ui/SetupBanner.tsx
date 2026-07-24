import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useSupabaseReady() {
  const [ready, setReady] = useState<boolean | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      const { error: rpcError } = await supabase.rpc('ensure_profile', { p_username: null })
      if (rpcError?.message.includes('Could not find the function')) {
        setReady(false)
        setMessage(
          'Database setup incomplete. Open Supabase Dashboard → SQL Editor, paste and run supabase/migrations/0008_fix_rls_recursion.sql, then refresh. Or add SUPABASE_DB_URL to .env and run: npm run db:fix'
        )
        return
      }

      const { error: roomsError } = await supabase.from('rooms').select('id').limit(1)
      if (roomsError?.message.includes('infinite recursion')) {
        setReady(false)
        setMessage(
          'Database RLS needs updating. Run supabase/migrations/0008_fix_rls_recursion.sql in Supabase SQL Editor, then refresh.'
        )
        return
      }

      setReady(true)
    }

    check()
  }, [])

  return { ready, message }
}

export function SetupBanner() {
  const { ready, message } = useSupabaseReady()
  if (ready !== false || !message) return null

  return (
    <div className="border-b border-caret/30 bg-caret/10 px-4 py-2 text-center text-xs text-caret">
      {message}
    </div>
  )
}
