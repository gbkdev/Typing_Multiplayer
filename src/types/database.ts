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
          type: 'friend_request' | 'friend_accepted' | 'room_invite' | 'achievement' | 'system'
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
        }
        Returns: undefined
      }
      find_room_by_code: {
        Args: { p_code: string }
        Returns: { id: string; status: string; visibility: string; settings: Json }[]
      }
      generate_room_code: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
