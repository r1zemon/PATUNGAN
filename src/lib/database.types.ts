
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bill_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_items: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          name: string
          quantity: number
          unit_price: number
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_participants: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          name: string
          profile_id: string | null
          total_share_amount: number | null
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          name: string
          profile_id?: string | null
          total_share_amount?: number | null
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          name?: string
          profile_id?: string | null
          total_share_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_participants_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          category_id: string | null
          created_at: string
          grand_total: number | null
          id: string
          name: string | null
          payer_participant_id: string | null
          role: "admin" | "pengguna" | null
          scheduled_at: string | null
          tax_amount: number | null
          tax_tip_split_strategy: "PAYER_PAYS_ALL" | "SPLIT_EQUALLY"
          tip_amount: number | null
          user_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          grand_total?: number | null
          id?: string
          name?: string | null
          payer_participant_id?: string | null
          role?: "admin" | "pengguna" | null
          scheduled_at?: string | null
          tax_amount?: number | null
          tax_tip_split_strategy?: "PAYER_PAYS_ALL" | "SPLIT_EQUALLY"
          tip_amount?: number | null
          user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          grand_total?: number | null
          id?: string
          name?: string | null
          payer_participant_id?: string | null
          role?: "admin" | "pengguna" | null
          scheduled_at?: string | null
          tax_amount?: number | null
          tax_tip_split_strategy?: "PAYER_PAYS_ALL" | "SPLIT_EQUALLY"
          tip_amount?: number | null
          user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "bill_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_payer_participant_id_fkey"
            columns: ["payer_participant_id"]
            isOneToOne: false
            referencedRelation: "bill_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_assignments: {
        Row: {
          assigned_quantity: number
          bill_item_id: string
          created_at: string
          id: string
          participant_id: string
        }
        Insert: {
          assigned_quantity: number
          bill_item_id: string
          created_at?: string
          id?: string
          participant_id: string
        }
        Update: {
          assigned_quantity?: number
          bill_item_id?: string
          created_at?: string
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_assignments_bill_item_id_fkey"
            columns: ["bill_item_id"]
            isOneToOne: false
            referencedRelation: "bill_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "bill_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string
          full_name: string | null
          id: string
          phone_number: string | null
          role: "admin" | "pengguna"
          updated_at: string | null
          username: string
          status: string
          created_at: string;
        }
        Insert: {
          avatar_url?: string | null
          email: string
          full_name?: string | null
          id: string
          phone_number?: string | null
          role?: "admin" | "pengguna"
          updated_at?: string | null
          username: string
          status?: string
          created_at?: string;
        }
        Update: {
          avatar_url?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          role?: "admin" | "pengguna"
          updated_at?: string | null
          username?: string
          status?: string
          created_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          from_participant_id: string
          id: string
          service_fee: number | null
          status: "unpaid" | "paid" | "pending" | "failed"
          to_participant_id: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string
          from_participant_id: string
          id?: string
          service_fee?: number | null
          status?: "unpaid" | "paid" | "pending" | "failed"
          to_participant_id: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          from_participant_id?: string
          id?: string
          service_fee?: number | null
          status?: "unpaid" | "paid" | "pending" | "failed"
          to_participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_from_participant_id_fkey"
            columns: ["from_participant_id"]
            isOneToOne: false
            referencedRelation: "bill_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_to_participant_id_fkey"
            columns: ["to_participant_id"]
            isOneToOne: false
            referencedRelation: "bill_participants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_distinct_paying_users: {
        Args: Record<string, unknown>
        Returns: number
      }
    }
    Enums: {
      user_role: "admin" | "pengguna"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
