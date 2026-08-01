import { supabase } from '@/lib/supabase'
import { generateTimedText, generateWords } from '@/features/typing/textBank'
import type { RoomSettings } from '@/types'

export async function beginRaceForRoom(roomId: string) {
  const { data: currentRoom, error: roomFetchError } = await supabase
    .from('rooms')
    .select('settings')
    .eq('id', roomId)
    .single()
  if (roomFetchError) throw roomFetchError

  const settings = currentRoom.settings as unknown as RoomSettings

  // 'time' and 'words' races need text sized to the race itself — a short
  // fixed quote runs out well before a "time 15" (or even "time 120") race
  // is over for anyone typing above ~20 wpm, leaving the timer running with
  // nothing left to type. Generate a properly-sized buffer instead, same as
  // solo practice already does.
  let content: string
  let textId: string | null = null

  if (settings.textMode === 'words') {
    content = generateWords(settings.wordCount ?? 25)
  } else if (settings.textMode === 'time') {
    // Scale the buffer to the duration so even a very fast typist (~300 wpm)
    // never runs out of text before the clock does. 5 words/sec ≈ 300 wpm.
    const wordsNeeded = Math.max(200, Math.ceil((settings.duration ?? 30) * 5))
    content = generateWords(wordsNeeded)
  } else {
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
    content = pick.content
    textId = pick.id
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      room_id: roomId,
      text_id: textId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (matchError) throw matchError

  const mergedSettings = { ...settings, currentText: content, currentMatchId: match.id }

  const { error: roomError } = await supabase
    .from('rooms')
    .update({ status: 'racing', settings: mergedSettings as never })
    .eq('id', roomId)
  if (roomError) throw roomError

  return { match, text: content }
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
  mode: 'time' | 'words'
  duration?: number
  wordCount?: number
  keyMistakes?: Record<string, number>
  textSnapshot?: string
  progressSnapshot?: { t: number; progress: number }[]
}) {
  const { error } = await supabase.rpc('record_practice_result', {
    p_wpm: result.wpm,
    p_raw_wpm: result.rawWpm,
    p_accuracy: result.accuracy,
    p_mistakes: result.mistakes,
    p_mode: result.mode,
    p_duration: result.duration ?? null,
    p_word_count: result.wordCount ?? null,
    p_key_mistakes: result.keyMistakes ?? {},
    p_text_snapshot: result.textSnapshot ?? null,
    p_progress_snapshot: result.progressSnapshot ?? null,
  })
  if (error) throw error
}

export interface GhostCandidate {
  id: string
  wpm: number
  accuracy: number
  duration: number | null
  word_count: number | null
  text_snapshot: string
  progress_snapshot: { t: number; progress: number }[]
  created_at: string
}

export async function listGhostCandidates(params: {
  mode: 'time' | 'words'
  duration?: number
  wordCount?: number
}): Promise<GhostCandidate[]> {
  const { data, error } = await supabase.rpc('list_ghost_candidates', {
    p_mode: params.mode,
    p_duration: params.mode === 'time' ? (params.duration ?? null) : null,
    p_word_count: params.mode === 'words' ? (params.wordCount ?? null) : null,
    p_limit: 5,
  })
  if (error) throw error
  return (data ?? []) as GhostCandidate[]
}
