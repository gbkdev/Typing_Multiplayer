import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { subscribeToRoom } from '@/services/rooms'
import type { Room, RoomPlayer } from '@/types'

interface RoomState {
  room: Room | null
  players: RoomPlayer[]
  loading: boolean
  error: string | null
}

export function useRoomState(roomId: string | undefined) {
  const [state, setState] = useState<RoomState>({ room: null, players: [], loading: true, error: null })

  const refetch = useCallback(async () => {
    if (!roomId) return
    try {
      const [{ data: room, error: roomError }, { data: players, error: playersError }] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase
          .from('room_players')
          .select('*, profile:profiles(*)')
          .eq('room_id', roomId)
          .order('joined_at', { ascending: true }),
      ])
      if (roomError) throw roomError
      if (playersError) throw playersError
      setState({
        room: room as unknown as Room,
        players: (players ?? []) as unknown as RoomPlayer[],
        loading: false,
        error: null,
      })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Failed to load room' }))
    }
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    refetch()
    const unsubscribe = subscribeToRoom(roomId, refetch)
    return () => {
      unsubscribe()
    }
  }, [roomId, refetch])

  return { ...state, refetch }
}
