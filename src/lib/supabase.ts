import { createClient } from '@supabase/supabase-js';

// Use environment variables with fallback values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vsrywvqqvjoggxanfsvb.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzcnl3dnFxdmpvZ2d4YW5mc3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTA0MzIsImV4cCI6MjA3ODgyNjQzMn0.MhShiR-jiCbbku6xlrbsGBiXgUbEBRAN2Wdq2R8yaME';

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          group_id: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: 'admin' | 'member';
          created_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
      };
    };
  };
};