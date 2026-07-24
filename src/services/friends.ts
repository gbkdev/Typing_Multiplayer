import { supabase } from '@/lib/supabase'

export async function sendFriendRequest(requesterId: string, addresseeUsername: string) {
  const { data: target, error: findError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', addresseeUsername)
    .single()
  if (findError || !target) throw new Error('User not found.')

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: target.id })
  if (error) throw error
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  if (accept) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', friendshipId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
    if (error) throw error
  }
}

export async function removeFriend(friendshipId: string) {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  if (error) throw error
}

export async function listFriends(userId: string) {
  const { data, error } = await supabase
    .from('friendships')
    .select('*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')
  if (error) throw error
  return data
}

export async function listPendingRequests(userId: string) {
  const { data, error } = await supabase
    .from('friendships')
    .select('*, requester:profiles!friendships_requester_id_fkey(*)')
    .eq('addressee_id', userId)
    .eq('status', 'pending')
  if (error) throw error
  return data
}
