export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      booking_seats: {
        Row: {
          booking_id: string;
          created_at: string;
          id: string;
          price: number;
          seat_id: string;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          id?: string;
          price?: number;
          seat_id: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          id?: string;
          price?: number;
          seat_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_seats_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_seats_seat_id_fkey";
            columns: ["seat_id"];
            isOneToOne: false;
            referencedRelation: "seats";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          created_at: string;
          discount_amount: number;
          id: string;
          promo_code: string | null;
          show_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          total_amount: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          discount_amount?: number;
          id?: string;
          promo_code?: string | null;
          show_id: string;
          status?: Database["public"]["Enums"]["booking_status"];
          total_amount?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          discount_amount?: number;
          id?: string;
          promo_code?: string | null;
          show_id?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          total_amount?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_show_id_fkey";
            columns: ["show_id"];
            isOneToOne: false;
            referencedRelation: "shows";
            referencedColumns: ["id"];
          },
        ];
      };
      community_comments: {
        Row: {
          author_name: string;
          content: string;
          created_at: string;
          id: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          author_name?: string;
          content: string;
          created_at?: string;
          id?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          author_name?: string;
          content?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_members: {
        Row: {
          created_at: string;
          id: string;
          theatre_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          theatre_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          theatre_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_members_theatre_id_fkey";
            columns: ["theatre_id"];
            isOneToOne: false;
            referencedRelation: "theatres";
            referencedColumns: ["id"];
          },
        ];
      };
      community_posts: {
        Row: {
          author_name: string;
          content: string;
          created_at: string;
          id: string;
          theatre_id: string;
          user_id: string;
        };
        Insert: {
          author_name?: string;
          content: string;
          created_at?: string;
          id?: string;
          theatre_id: string;
          user_id: string;
        };
        Update: {
          author_name?: string;
          content?: string;
          created_at?: string;
          id?: string;
          theatre_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_posts_theatre_id_fkey";
            columns: ["theatre_id"];
            isOneToOne: false;
            referencedRelation: "theatres";
            referencedColumns: ["id"];
          },
        ];
      };
      food_items: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          image_url: string;
          is_available: boolean;
          is_veg: boolean;
          name: string;
          price: number;
        };
        Insert: {
          category?: string;
          created_at?: string;
          id?: string;
          image_url?: string;
          is_available?: boolean;
          is_veg?: boolean;
          name: string;
          price?: number;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          image_url?: string;
          is_available?: boolean;
          is_veg?: boolean;
          name?: string;
          price?: number;
        };
        Relationships: [];
      };
      food_orders: {
        Row: {
          booking_id: string;
          created_at: string;
          food_item_id: string;
          id: string;
          price_at_order: number;
          quantity: number;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          food_item_id: string;
          id?: string;
          price_at_order?: number;
          quantity?: number;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          food_item_id?: string;
          id?: string;
          price_at_order?: number;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "food_orders_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "food_orders_food_item_id_fkey";
            columns: ["food_item_id"];
            isOneToOne: false;
            referencedRelation: "food_items";
            referencedColumns: ["id"];
          },
        ];
      };
      movie_cast: {
        Row: {
          character_name: string;
          created_at: string;
          id: string;
          movie_id: string;
          name: string;
          role: string;
        };
        Insert: {
          character_name?: string;
          created_at?: string;
          id?: string;
          movie_id: string;
          name: string;
          role?: string;
        };
        Update: {
          character_name?: string;
          created_at?: string;
          id?: string;
          movie_id?: string;
          name?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movie_cast_movie_id_fkey";
            columns: ["movie_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
        ];
      };
      movie_reviews: {
        Row: {
          created_at: string;
          id: string;
          movie_id: string;
          rating: number;
          review: string;
          reviewer_name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          movie_id: string;
          rating: number;
          review?: string;
          reviewer_name?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          movie_id?: string;
          rating?: number;
          review?: string;
          reviewer_name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movie_reviews_movie_id_fkey";
            columns: ["movie_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
        ];
      };
      movies: {
        Row: {
          cast_members: string;
          certificate: string;
          created_at: string;
          description: string;
          duration_min: number;
          formats: string;
          genre: string;
          id: string;
          language: string;
          poster_url: string;
          rating: number;
          release_date: string;
          status: Database["public"]["Enums"]["movie_status"];
          title: string;
          trailer_url: string;
        };
        Insert: {
          cast_members?: string;
          certificate?: string;
          created_at?: string;
          description?: string;
          duration_min?: number;
          formats?: string;
          genre?: string;
          id?: string;
          language?: string;
          poster_url?: string;
          rating?: number;
          release_date?: string;
          status?: Database["public"]["Enums"]["movie_status"];
          title: string;
          trailer_url?: string;
        };
        Update: {
          cast_members?: string;
          certificate?: string;
          created_at?: string;
          description?: string;
          duration_min?: number;
          formats?: string;
          genre?: string;
          id?: string;
          language?: string;
          poster_url?: string;
          rating?: number;
          release_date?: string;
          status?: Database["public"]["Enums"]["movie_status"];
          title?: string;
          trailer_url?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          booking_id: string;
          id: string;
          method: string;
          paid_at: string;
          status: string;
          transaction_ref: string;
        };
        Insert: {
          amount?: number;
          booking_id: string;
          id?: string;
          method?: string;
          paid_at?: string;
          status?: string;
          transaction_ref?: string;
        };
        Update: {
          amount?: number;
          booking_id?: string;
          id?: string;
          method?: string;
          paid_at?: string;
          status?: string;
          transaction_ref?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_options: {
        Row: {
          created_at: string;
          id: string;
          movie_id: string;
          poll_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          movie_id: string;
          poll_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          movie_id?: string;
          poll_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_options_movie_id_fkey";
            columns: ["movie_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_options_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "theatre_polls";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_votes: {
        Row: {
          created_at: string;
          id: string;
          option_id: string;
          poll_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          option_id: string;
          poll_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          option_id?: string;
          poll_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "poll_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "theatre_polls";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          phone: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string;
          id: string;
          phone?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          phone?: string;
        };
        Relationships: [];
      };
      promo_codes: {
        Row: {
          code: string;
          created_at: string;
          description: string;
          discount_type: string;
          discount_value: number;
          id: string;
          is_active: boolean;
          max_discount: number | null;
          max_uses: number | null;
          min_order: number;
          used_count: number;
          valid_until: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string;
          discount_type?: string;
          discount_value: number;
          id?: string;
          is_active?: boolean;
          max_discount?: number | null;
          max_uses?: number | null;
          min_order?: number;
          used_count?: number;
          valid_until?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string;
          discount_type?: string;
          discount_value?: number;
          id?: string;
          is_active?: boolean;
          max_discount?: number | null;
          max_uses?: number | null;
          min_order?: number;
          used_count?: number;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      screens: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          theatre_id: string;
          total_seats: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          theatre_id: string;
          total_seats?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          theatre_id?: string;
          total_seats?: number;
        };
        Relationships: [
          {
            foreignKeyName: "screens_theatre_id_fkey";
            columns: ["theatre_id"];
            isOneToOne: false;
            referencedRelation: "theatres";
            referencedColumns: ["id"];
          },
        ];
      };
      seats: {
        Row: {
          id: string;
          is_aisle_gap: boolean;
          row_label: string;
          screen_id: string;
          seat_number: number;
          seat_type: Database["public"]["Enums"]["seat_type"];
        };
        Insert: {
          id?: string;
          is_aisle_gap?: boolean;
          row_label: string;
          screen_id: string;
          seat_number: number;
          seat_type?: Database["public"]["Enums"]["seat_type"];
        };
        Update: {
          id?: string;
          is_aisle_gap?: boolean;
          row_label?: string;
          screen_id?: string;
          seat_number?: number;
          seat_type?: Database["public"]["Enums"]["seat_type"];
        };
        Relationships: [
          {
            foreignKeyName: "seats_screen_id_fkey";
            columns: ["screen_id"];
            isOneToOne: false;
            referencedRelation: "screens";
            referencedColumns: ["id"];
          },
        ];
      };
      show_seats: {
        Row: {
          booking_id: string | null;
          created_at: string;
          id: string;
          locked_by: string | null;
          locked_until: string | null;
          seat_id: string;
          show_id: string;
          status: Database["public"]["Enums"]["show_seat_status"];
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          locked_by?: string | null;
          locked_until?: string | null;
          seat_id: string;
          show_id: string;
          status: Database["public"]["Enums"]["show_seat_status"];
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          locked_by?: string | null;
          locked_until?: string | null;
          seat_id?: string;
          show_id?: string;
          status?: Database["public"]["Enums"]["show_seat_status"];
        };
        Relationships: [
          {
            foreignKeyName: "show_seats_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "show_seats_seat_id_fkey";
            columns: ["seat_id"];
            isOneToOne: false;
            referencedRelation: "seats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "show_seats_show_id_fkey";
            columns: ["show_id"];
            isOneToOne: false;
            referencedRelation: "shows";
            referencedColumns: ["id"];
          },
        ];
      };
      shows: {
        Row: {
          base_price: number;
          created_at: string;
          gold_price: number | null;
          id: string;
          movie_id: string;
          premium_price: number | null;
          screen_id: string;
          show_date: string;
          show_time: string;
        };
        Insert: {
          base_price?: number;
          created_at?: string;
          gold_price?: number | null;
          id?: string;
          movie_id: string;
          premium_price?: number | null;
          screen_id: string;
          show_date: string;
          show_time: string;
        };
        Update: {
          base_price?: number;
          created_at?: string;
          gold_price?: number | null;
          id?: string;
          movie_id?: string;
          premium_price?: number | null;
          screen_id?: string;
          show_date?: string;
          show_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shows_movie_id_fkey";
            columns: ["movie_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shows_screen_id_fkey";
            columns: ["screen_id"];
            isOneToOne: false;
            referencedRelation: "screens";
            referencedColumns: ["id"];
          },
        ];
      };
      theatre_polls: {
        Row: {
          created_at: string;
          description: string;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          theatre_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          theatre_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          theatre_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "theatre_polls_theatre_id_fkey";
            columns: ["theatre_id"];
            isOneToOne: false;
            referencedRelation: "theatres";
            referencedColumns: ["id"];
          },
        ];
      };
      theatres: {
        Row: {
          address: string;
          city: string;
          created_at: string;
          id: string;
          image_url: string;
          latitude: number | null;
          longitude: number | null;
          name: string;
          video_url: string;
        };
        Insert: {
          address?: string;
          city?: string;
          created_at?: string;
          id?: string;
          image_url?: string;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          video_url?: string;
        };
        Update: {
          address?: string;
          city?: string;
          created_at?: string;
          id?: string;
          image_url?: string;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          video_url?: string;
        };
        Relationships: [];
      };
      theatre_admin_assignments: {
        Row: {
          created_at: string;
          id: string;
          theatre_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          theatre_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          theatre_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "theatre_admin_assignments_theatre_id_fkey";
            columns: ["theatre_id"];
            isOneToOne: false;
            referencedRelation: "theatres";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          theatre_id: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          theatre_id?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          theatre_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_theatre_id_fkey";
            columns: ["theatre_id"];
            isOneToOne: false;
            referencedRelation: "theatres";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      lock_show_seats: {
        Args: { _seat_ids: string[]; _show_id: string; _ttl_minutes?: number };
        Returns: Json;
      };
      redeem_promo_code: {
        Args: { _code: string; _order_total: number };
        Returns: Json;
      };
      release_expired_locks: { Args: never; Returns: undefined };
      validate_promo_code: {
        Args: { _code: string; _order_total: number };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "theatre_admin" | "customer";
      booking_status: "pending" | "confirmed" | "cancelled";
      movie_status: "now_showing" | "upcoming";
      seat_type: "silver" | "gold" | "premium";
      show_seat_status: "locked" | "booked";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "theatre_admin", "customer"],
      booking_status: ["pending", "confirmed", "cancelled"],
      movie_status: ["now_showing", "upcoming"],
      seat_type: ["silver", "gold", "premium"],
      show_seat_status: ["locked", "booked"],
    },
  },
} as const;
