import { supabase } from '@/lib/supabase'
import type { RoomSettings, RoomVisibility } from '@/types'

export async function createRoom(_hostId: string, visibility: RoomVisibility, settings: RoomSettings) {
  const { data, error } = await supabase.rpc('create_room', {
    p_visibility: visibility,
    p_settings: settings as unknown as never,
  })
  if (error) throw error
  return data
}

export async function joinRoom(roomId: string, userId: string) {
  const { data, error } = await supabase
    .from('room_players')
    .upsert({ room_id: roomId, user_id: userId }, { onConflict: 'room_id,user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function joinRoomByCode(code: string, userId: string) {
  const { data, error } = await supabase.rpc('find_room_by_code', { p_code: code })
  if (error) throw error
  const room = data?.[0]
  if (!room) throw new Error('No room found with that code.')
  await joinRoom(room.id, userId)
  return room
}

export async function leaveRoom(roomId: string, userId: string) {
  const { error } = await supabase.from('room_players').delete().match({ room_id: roomId, user_id: userId })
  if (error) throw error
}

export async function setReady(roomId: string, userId: string, ready: boolean) {
  const { error } = await supabase
    .from('room_players')
    .update({ ready })
    .match({ room_id: roomId, user_id: userId })
  if (error) throw error
}

export async function startRace(roomId: string) {
  const { error } = await supabase.from('rooms').update({ status: 'countdown' }).eq('id', roomId)
  if (error) throw error
}

export async function updateProgress(
  roomId: string,
  userId: string,
  progress: { progress: number; wpm: number; accuracy: number; finished?: boolean; position?: number }
) {
  const { error } = await supabase.from('room_players').update(progress).match({ room_id: roomId, user_id: userId })
  if (error) throw error
}

export async function listPublicRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('visibility', 'public')
    .in('status', ['lobby', 'countdown'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function subscribeToRoom(roomId: string, onChange: () => void) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, onChange)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      onChange
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
