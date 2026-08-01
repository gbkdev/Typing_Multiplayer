// Types mirroring supabase/migrations/*.sql.
// Regenerate for a live project via:
//   supabase gen types typescript --project-id <id> > src/types/database.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          bio: string | null
          country: string | null
          total_races: number
          wins: number
          average_wpm: number
          highest_wpm: number
          average_accuracy: number
          xp: number
          level: number
          key_mistake_stats: Record<string, number>
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; username: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: []
      }
      texts: {
        Row: {
          id: string
          content: string
          difficulty: 'easy' | 'medium' | 'hard'
          language: string
          kind: 'words' | 'quote' | 'custom'
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['texts']['Row']> & { content: string }
        Update: Partial<Database['public']['Tables']['texts']['Row']>
        Relationships: []
      }
      rooms: {
        Row: {
          id: string
          host_id: string
          status: 'lobby' | 'countdown' | 'racing' | 'finished'
          room_code: string
          visibility: 'public' | 'private'
          settings: Json
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['rooms']['Row']> & { host_id: string; room_code: string }
        Update: Partial<Database['public']['Tables']['rooms']['Row']>
        Relationships: []
      }
      room_players: {
        Row: {
          id: string
          room_id: string
          user_id: string
          progress: number
          accuracy: number
          wpm: number
          finished: boolean
          position: number | null
          ready: boolean
          joined_at: string
        }
        Insert: Partial<Database['public']['Tables']['room_players']['Row']> & { room_id: string; user_id: string }
        Update: Partial<Database['public']['Tables']['room_players']['Row']>
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          room_id: string
          text_id: string | null
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['matches']['Row']> & { room_id: string }
        Update: Partial<Database['public']['Tables']['matches']['Row']>
        Relationships: []
      }
      match_results: {
        Row: {
          id: string
          match_id: string
          user_id: string
          wpm: number
          raw_wpm: number
          accuracy: number
          mistakes: number
          position: number
          xp: number
          mode: 'time' | 'words'
          duration: number | null
          word_count: number | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['match_results']['Row']> & {
          match_id: string
          user_id: string
          wpm: number
          raw_wpm: number
          accuracy: number
          position: number
        }
        Update: Partial<Database['public']['Tables']['match_results']['Row']>
        Relationships: []
      }
      practice_results: {
        Row: {
          id: string
          user_id: string
          wpm: number
          raw_wpm: number
          accuracy: number
          mistakes: number
          mode: 'time' | 'words'
          duration: number | null
          word_count: number | null
          text_snapshot: string | null
          progress_snapshot: { t: number; progress: number }[] | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['practice_results']['Row']> & {
          user_id: string
          wpm: number
          raw_wpm: number
          accuracy: number
        }
        Update: Partial<Database['public']['Tables']['practice_results']['Row']>
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted' | 'blocked'
          created_at: string
          responded_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['friendships']['Row']> & {
          requester_id: string
          addressee_id: string
        }
        Update: Partial<Database['public']['Tables']['friendships']['Row']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'friend_request' | 'friend_accepted' | 'room_invite' | 'achievement' | 'system' | 'direct_message'
          payload: Json
          read: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['notifications']['Row']> & {
          user_id: string
          type: Database['public']['Tables']['notifications']['Row']['type']
        }
        Update: Partial<Database['public']['Tables']['notifications']['Row']>
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          room_id: string
          user_id: string | null
          kind: 'chat' | 'system_join' | 'system_leave'
          content: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['messages']['Row']> & { room_id: string; content: string }
        Update: Partial<Database['public']['Tables']['messages']['Row']>
        Relationships: []
      }
      achievements: {
        Row: { id: string; title: string; description: string; icon: string }
        Insert: Database['public']['Tables']['achievements']['Row']
        Update: Partial<Database['public']['Tables']['achievements']['Row']>
        Relationships: []
      }
      user_achievements: {
        Row: { id: string; user_id: string; achievement_id: string; earned_at: string }
        Insert: Partial<Database['public']['Tables']['user_achievements']['Row']> & {
          user_id: string
          achievement_id: string
        }
        Update: Partial<Database['public']['Tables']['user_achievements']['Row']>
        Relationships: []
      }
      daily_stats: {
        Row: {
          id: string
          user_id: string
          date: string
          races: number
          average_wpm: number
          average_accuracy: number
          best_wpm: number
        }
        Insert: Partial<Database['public']['Tables']['daily_stats']['Row']> & { user_id: string; date: string }
        Update: Partial<Database['public']['Tables']['daily_stats']['Row']>
        Relationships: []
      }
      direct_messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          content: string
          attachment_path: string | null
          attachment_type: 'image' | 'gif' | 'file' | null
          attachment_name: string | null
          read_at: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['direct_messages']['Row']> & {
          sender_id: string
          recipient_id: string
        }
        Update: Partial<Database['public']['Tables']['direct_messages']['Row']>
        Relationships: []
      }
      blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['blocks']['Row']> & {
          blocker_id: string
          blocked_id: string
        }
        Update: Partial<Database['public']['Tables']['blocks']['Row']>
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_id: string
          reason: 'spam' | 'harassment' | 'inappropriate_content' | 'cheating' | 'other'
          details: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['reports']['Row']> & {
          reporter_id: string
          reported_id: string
          reason: 'spam' | 'harassment' | 'inappropriate_content' | 'cheating' | 'other'
        }
        Update: Partial<Database['public']['Tables']['reports']['Row']>
        Relationships: []
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          text: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['daily_challenges']['Row']> & { text: string }
        Update: Partial<Database['public']['Tables']['daily_challenges']['Row']>
        Relationships: []
      }
      daily_challenge_results: {
        Row: {
          id: string
          challenge_date: string
          user_id: string
          wpm: number
          raw_wpm: number
          accuracy: number
          mistakes: number
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['daily_challenge_results']['Row']> & {
          challenge_date: string
          user_id: string
          wpm: number
          raw_wpm: number
          accuracy: number
        }
        Update: Partial<Database['public']['Tables']['daily_challenge_results']['Row']>
        Relationships: []
      }
    }
    Views: {
      leaderboard_all_time: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          country: string | null
          highest_wpm: number
          average_accuracy: number
          wins: number
          xp: number
          level: number
        }
        Relationships: []
      }
      leaderboard_daily: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          country: string | null
          best_wpm: number
          average_accuracy: number
          races: number
        }
        Relationships: []
      }
      leaderboard_weekly: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          country: string | null
          best_wpm: number
          average_accuracy: number
          races: number
        }
        Relationships: []
      }
      leaderboard_monthly: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          country: string | null
          best_wpm: number
          average_accuracy: number
          races: number
        }
        Relationships: []
      }
    }
    Functions: {
      set_username: {
        Args: { p_username: string }
        Returns: undefined
      }
      ensure_profile_row: {
        Args: Record<string, never>
        Returns: undefined
      }
      create_room: {
        Args: { p_visibility: string; p_settings: Json }
        Returns: Database['public']['Tables']['rooms']['Row']
      }
      ensure_profile: {
        Args: { p_username: string | null }
        Returns: undefined
      }
      submit_match_result: {
        Args: {
          p_match_id: string
          p_wpm: number
          p_raw_wpm: number
          p_accuracy: number
          p_mistakes: number
        }
        Returns: number
      }
      try_finish_room: {
        Args: { p_room_id: string }
        Returns: boolean
      }
      reset_room_to_lobby: {
        Args: { p_room_id: string }
        Returns: undefined
      }
      record_practice_result: {
        Args: {
          p_wpm: number
          p_raw_wpm: number
          p_accuracy: number
          p_mistakes: number
          p_mode?: string
          p_duration?: number | null
          p_word_count?: number | null
          p_key_mistakes?: Record<string, number>
          p_text_snapshot?: string | null
          p_progress_snapshot?: { t: number; progress: number }[] | null
        }
        Returns: undefined
      }
      list_ghost_candidates: {
        Args: {
          p_mode: string
          p_duration?: number | null
          p_word_count?: number | null
          p_limit?: number
        }
        Returns: {
          id: string
          wpm: number
          accuracy: number
          duration: number | null
          word_count: number | null
          text_snapshot: string
          progress_snapshot: { t: number; progress: number }[]
          created_at: string
        }[]
      }
      get_daily_challenge: {
        Args: Record<string, never>
        Returns: { challenge_date: string; text: string; created_at: string }
      }
      submit_daily_challenge_result: {
        Args: {
          p_wpm: number
          p_raw_wpm: number
          p_accuracy: number
          p_mistakes: number
        }
        Returns: undefined
      }
      daily_challenge_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          user_id: string
          username: string
          avatar_url: string | null
          wpm: number
          accuracy: number
          created_at: string
        }[]
      }
      leaderboard_query: {
        Args: {
          p_period?: string
          p_mode?: string
          p_duration?: number | null
          p_word_count?: number | null
          p_limit?: number
        }
        Returns: {
          user_id: string
          username: string
          avatar_url: string | null
          country: string | null
          level: number
          best_wpm: number
          best_raw_wpm: number
          best_accuracy: number
          races: number
          achieved_at: string
        }[]
      }
      find_room_by_code: {
        Args: { p_code: string }
        Returns: { id: string; status: string; visibility: string; settings: Json }[]
      }
      generate_room_code: {
        Args: Record<string, never>
        Returns: string
      }
      list_conversations: {
        Args: Record<string, never>
        Returns: {
          other_user_id: string
          other_username: string
          other_avatar_url: string | null
          last_content: string
          last_attachment_type: 'image' | 'gif' | 'file' | null
          last_created_at: string
          last_sender_id: string
          unread_count: number
        }[]
      }
      mark_conversation_read: {
        Args: { p_other_user_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
