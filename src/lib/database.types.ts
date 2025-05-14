
// src/lib/database.types.ts
// File ini akan diisi dengan tipe yang di-generate oleh Supabase CLI
// supabase gen types typescript --linked > src/lib/database.types.ts
// Untuk sekarang, kita bisa biarkan kosong atau definisikan secara manual jika diperlukan.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bill_items: {
        Row: {
          bill_id: string
          created_at: string | null
          id: string
          name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          id?: string
          name: string
          quantity: number
          unit_price: number
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          id?: string
          name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            referencedRelation: "bills"
            referencedColumns: ["id"]
          }
        ]
      }
      bill_participants: {
        Row: {
          bill_id: string
          created_at: string | null
          id: string
          name: string
          total_share_amount: number | null
          // user_profile_id: string | null 
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          id?: string
          name: string
          total_share_amount?: number | null
          // user_profile_id?: string | null
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          id?: string
          name?: string
          total_share_amount?: number | null
          // user_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_participants_bill_id_fkey"
            columns: ["bill_id"]
            referencedRelation: "bills"
            referencedColumns: ["id"]
          }
          // {
          //   foreignKeyName: "bill_participants_user_profile_id_fkey"
          //   columns: ["user_profile_id"]
          //   referencedRelation: "profiles"
          //   referencedColumns: ["id"]
          // }
        ]
      }
      bills: {
        Row: {
          created_at: string | null
          grand_total: number | null
          id: string
          name: string | null
          payer_participant_id: string | null
          tax_amount: number | null
          tax_tip_split_strategy: string | null 
          tip_amount: number | null
          updated_at: string | null
          user_id: string | null 
        }
        Insert: {
          created_at?: string | null
          grand_total?: number | null
          id?: string
          name?: string | null
          payer_participant_id?: string | null
          tax_amount?: number | null
          tax_tip_split_strategy?: string | null
          tip_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          grand_total?: number | null
          id?: string
          name?: string | null
          payer_participant_id?: string | null
          tax_amount?: number | null
          tax_tip_split_strategy?: string | null
          tip_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_payer_participant_id_fkey"
            columns: ["payer_participant_id"]
            referencedRelation: "bill_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      item_assignments: {
        Row: {
          assigned_quantity: number
          bill_item_id: string
          created_at: string | null
          id: string
          participant_id: string
        }
        Insert: {
          assigned_quantity: number
          bill_item_id: string
          created_at?: string | null
          id?: string
          participant_id: string
        }
        Update: {
          assigned_quantity?: number
          bill_item_id?: string
          created_at?: string | null
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_assignments_bill_item_id_fkey"
            columns: ["bill_item_id"]
            referencedRelation: "bill_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_assignments_participant_id_fkey"
            columns: ["participant_id"]
            referencedRelation: "bill_participants"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string 
          updated_at: string | null
          username: string | null
          email: string | null 
          // date_of_birth: string | null // Dihapus
          phone_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          email?: string | null
          // date_of_birth?: string | null // Dihapus
          phone_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          email?: string | null
          // date_of_birth?: string | null // Dihapus
          phone_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users" 
            referencedColumns: ["id"]
          }
        ]
      }
      settlements: {
        Row: {
          amount: number
          bill_id: string
          created_at: string | null
          from_participant_id: string
          id: string
          to_participant_id: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string | null
          from_participant_id: string
          id?: string
          to_participant_id: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string | null
          from_participant_id?: string
          id?: string
          to_participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_bill_id_fkey"
            columns: ["bill_id"]
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_from_participant_id_fkey"
            columns: ["from_participant_id"]
            referencedRelation: "bill_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_to_participant_id_fkey"
            columns: ["to_participant_id"]
            referencedRelation: "bill_participants"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
