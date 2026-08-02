/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Configuration Vite (.env.local)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabasekong-w6omo63vt2wnlhsuajxbzdm0.193.29.187.66.sslip.io';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoiYW5vbiJ9.8bzbLiILis-GR7UaXT0Ee2-kYgYXWYNtC4zwItLSnMw';

const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Types helper pour TypeScript basés sur votre schéma DB
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          parish: string | null
          baptism_year: number | null
          is_premium: boolean
          premium_expiration: string | null
          role: 'USER' | 'ADMIN'
          verification_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
          created_at: string
          gender: 'M' | 'F' | null
          looking_for: 'M' | 'F' | null
          phone: string | null
          interests: string[] | null
          bio: string | null
          location: string | null
          last_active: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          avatar_url?: string | null
          parish?: string | null
          baptism_year?: number | null
          is_premium?: boolean
          premium_expiration?: string | null
          role?: 'USER' | 'ADMIN'
          verification_status?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
          gender?: 'M' | 'F' | null
          looking_for?: 'M' | 'F' | null
          phone?: string | null
          interests?: string[] | null
          bio?: string | null
          location?: string | null
          last_active?: string | null
        }
        Update: {
          full_name?: string
          avatar_url?: string | null
          parish?: string | null
          baptism_year?: number | null
          is_premium?: boolean
          premium_expiration?: string | null
          role?: 'USER' | 'ADMIN'
          verification_status?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
          gender?: 'M' | 'F' | null
          looking_for?: 'M' | 'F' | null
          phone?: string | null
          interests?: string[] | null
          bio?: string | null
          location?: string | null
          last_active?: string | null
        }
      },
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          created_at: string
          is_read: boolean
        }
      }
      // Ajoutez les autres tables ici au fur et à mesure
    }
  }
}
