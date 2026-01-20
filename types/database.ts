// types/database.ts - Supabase Database Types

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  language: string;
  daily_sessions_count: number;
  last_session_date: string | null;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  transcript: string | null;
  summary: string | null;
  blocker: string | null;
  mood: string | null;
  tasks: TaskItem[];
  audio_duration_seconds: number | null;
  created_at: string;
}

export interface TaskItem {
  id: string;
  title: string;
  duration: number;
  completed: boolean;
  completedAt?: string;
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Session>;
      };
    };
  };
}
