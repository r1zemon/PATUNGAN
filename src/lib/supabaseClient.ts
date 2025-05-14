// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types'; // Akan kita buat nanti

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required. Please set them in your .env file.');
}

// Kita menggunakan `Database` generic type untuk type safety dengan tabel Supabase Anda
// Anda perlu generate tipe ini dari skema Supabase Anda.
// Untuk sekarang, kita bisa gunakan `any` atau tipe dasar.
// const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Untuk menggenerate tipe Database, Anda bisa menggunakan Supabase CLI:
// 1. Install Supabase CLI: npm install supabase --save-dev (atau global)
// 2. Login: supabase login
// 3. Link project: supabase link --project-ref YOUR_PROJECT_ID
// 4. Generate types: supabase gen types typescript --linked > src/lib/database.types.ts
// Jika Anda belum siap dengan CLI, kita bisa skip type `Database` untuk sementara.
