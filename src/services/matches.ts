import { supabase } from '@/lib/supabase'
import { generateTimedText } from '@/features/typing/textBank'

export async function beginRaceForRoom(roomId: string) {
  const { data: texts, error: textError } = await supabase
    .from('texts')
    .select('id, content')
    .order('id')
    .limit(50)
  if (textError) throw textError

  const pick =
    texts && texts.length > 0
      ? texts[Math.floor(Math.random() * texts.length)]
      : { id: null, content: generateTimedText() }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      room_id: roomId,
      text_id: pick.id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (matchError) throw matchError

  const { data: currentRoom } = await supabase.from('rooms').select('settings').eq('id', roomId).single()
  const mergedSettings = { ...(currentRoom?.settings as object), currentText: pick.content, currentMatchId: match.id }

  const { error: roomError } = await supabase
    .from('rooms')
    .update({ status: 'racing', settings: mergedSettings as never })
    .eq('id', roomId)
  if (roomError) throw roomError

  return { match, text: pick.content }
}

export async function submitMatchResult(
  matchId: string,
  result: { wpm: number; rawWpm: number; accuracy: number; mistakes: number }
) {
  const { data, error } = await supabase.rpc('submit_match_result', {
    p_match_id: matchId,
    p_wpm: result.wpm,
    p_raw_wpm: result.rawWpm,
    p_accuracy: result.accuracy,
    p_mistakes: result.mistakes,
  })
  if (error) throw error
  return data as number
}

export async function tryFinishRoom(roomId: string) {
  const { data, error } = await supabase.rpc('try_finish_room', { p_room_id: roomId })
  if (error) throw error
  return data as boolean
}

export async function finishRoom(roomId: string) {
  const { error } = await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId)
  if (error) throw error
}

export async function resetRoomToLobby(roomId: string) {
  const { error } = await supabase.rpc('reset_room_to_lobby', { p_room_id: roomId })
  if (error) throw error
}

export async function recordPracticeResult(result: {
  wpm: number
  rawWpm: number
  accuracy: number
  mistakes: number
}) {
  const { error } = await supabase.rpc('record_practice_result', {
    p_wpm: result.wpm,
    p_raw_wpm: result.rawWpm,
    p_accuracy: result.accuracy,
    p_mistakes: result.mistakes,
  })
  if (error) throw error
}
