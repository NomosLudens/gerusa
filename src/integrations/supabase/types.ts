export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      codice_margens: {
        Row: {
          created_at: string;
          id: string;
          livro_id: string | null;
          localizacao: Json;
          nota: string;
          tags: string[];
          trecho: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          livro_id?: string | null;
          localizacao?: Json;
          nota: string;
          tags?: string[];
          trecho?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          livro_id?: string | null;
          localizacao?: Json;
          nota?: string;
          tags?: string[];
          trecho?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "codice_margens_livro_id_fkey";
            columns: ["livro_id"];
            isOneToOne: false;
            referencedRelation: "livros";
            referencedColumns: ["id"];
          },
        ];
      };
      business_contexts: {
        Row: {
          created_at: string;
          formas_pagamento: Json;
          id: string;
          limites_decisao: Json;
          nome: string;
          observacoes: string | null;
          pix_chave: string | null;
          precos: Json;
          regras_agenda: Json;
          regras_escalonamento: Json;
          servicos: Json;
          tipo: string | null;
          tom_voz: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          formas_pagamento?: Json;
          id?: string;
          limites_decisao?: Json;
          nome: string;
          observacoes?: string | null;
          pix_chave?: string | null;
          precos?: Json;
          regras_agenda?: Json;
          regras_escalonamento?: Json;
          servicos?: Json;
          tipo?: string | null;
          tom_voz?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          formas_pagamento?: Json;
          id?: string;
          limites_decisao?: Json;
          nome?: string;
          observacoes?: string | null;
          pix_chave?: string | null;
          precos?: Json;
          regras_agenda?: Json;
          regras_escalonamento?: Json;
          servicos?: Json;
          tipo?: string | null;
          tom_voz?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      kuanyin_guardians: {
        Row: {
          admin_user_id: string | null;
          business_context_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          public_slug: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_user_id?: string | null;
          business_context_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          public_slug: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_user_id?: string | null;
          business_context_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          public_slug?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kuanyin_guardians_business_context_id_fkey";
            columns: ["business_context_id"];
            isOneToOne: true;
            referencedRelation: "business_contexts";
            referencedColumns: ["id"];
          },
        ];
      };
      camara_segmentos: {
        Row: {
          audio_path: string | null;
          created_at: string;
          erro: string | null;
          fim_seg: number;
          id: string;
          inicio_seg: number;
          ordem: number;
          sessao_id: string;
          status: string;
          transcricao: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          audio_path?: string | null;
          created_at?: string;
          erro?: string | null;
          fim_seg: number;
          id?: string;
          inicio_seg: number;
          ordem: number;
          sessao_id: string;
          status?: string;
          transcricao?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          audio_path?: string | null;
          created_at?: string;
          erro?: string | null;
          fim_seg?: number;
          id?: string;
          inicio_seg?: number;
          ordem?: number;
          sessao_id?: string;
          status?: string;
          transcricao?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "camara_segmentos_sessao_id_fkey";
            columns: ["sessao_id"];
            isOneToOne: false;
            referencedRelation: "camara_sessoes";
            referencedColumns: ["id"];
          },
        ];
      };
      camara_sessoes: {
        Row: {
          analise: Json | null;
          analise_at: string | null;
          created_at: string;
          id: string;
          modo: string;
          status: string;
          texto_rapido: string | null;
          titulo: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          analise?: Json | null;
          analise_at?: string | null;
          created_at?: string;
          id?: string;
          modo: string;
          status?: string;
          texto_rapido?: string | null;
          titulo: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          analise?: Json | null;
          analise_at?: string | null;
          created_at?: string;
          id?: string;
          modo?: string;
          status?: string;
          texto_rapido?: string | null;
          titulo?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string;
          derived_from: string[];
          id: string;
          role: string;
          source_channel: string | null;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          derived_from?: string[];
          id?: string;
          role: string;
          source_channel?: string | null;
          thread_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          derived_from?: string[];
          id?: string;
          role?: string;
          source_channel?: string | null;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "chat_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      telegram_channel_updates: {
        Row: {
          update_id: number;
          telegram_user_id: number;
          telegram_chat_id: number;
          supabase_user_id: string;
          thread_id: string;
          user_message_id: string | null;
          assistant_message_id: string | null;
          status: string;
          telegram_response_message_id: number | null;
          error_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          update_id: number;
          telegram_user_id: number;
          telegram_chat_id: number;
          supabase_user_id: string;
          thread_id: string;
          user_message_id: string | null;
          assistant_message_id: string | null;
          status: string;
          telegram_response_message_id?: number | null;
          error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          update_id?: number;
          telegram_user_id?: number;
          telegram_chat_id?: number;
          supabase_user_id?: string;
          thread_id?: string;
          user_message_id?: string | null;
          assistant_message_id?: string | null;
          status?: string;
          telegram_response_message_id?: number | null;
          error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      telegram_dialogues: {
        Row: {
          id: string;
          chat_id: number;
          kallistis_message_id: number | null;
          status: string;
          expires_at: string;
          created_at: string;
          processing_at: string | null;
          completed_at: string | null;
          error_code: string | null;
          final_assistant_message_id: string | null;
          user_id: string | null;
          thread_id: string | null;
        };
        Insert: {
          id?: string;
          chat_id: number;
          kallistis_message_id?: number | null;
          status: string;
          expires_at: string;
          created_at?: string;
          processing_at?: string | null;
          completed_at?: string | null;
          error_code?: string | null;
          final_assistant_message_id?: string | null;
          user_id?: string | null;
          thread_id?: string | null;
        };
        Update: {
          id?: string;
          chat_id?: number;
          kallistis_message_id?: number | null;
          status?: string;
          expires_at?: string;
          created_at?: string;
          processing_at?: string | null;
          completed_at?: string | null;
          error_code?: string | null;
          final_assistant_message_id?: string | null;
          user_id?: string | null;
          thread_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "telegram_dialogues_final_assistant_message_id_fkey";
            columns: ["final_assistant_message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "telegram_dialogues_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "chat_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_threads: {
        Row: {
          created_at: string;
          facet: Database["public"]["Enums"]["chat_facet"];
          id: string;
          last_sedimentado_at: string | null;
          surface: string;
          title: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          facet?: Database["public"]["Enums"]["chat_facet"];
          id?: string;
          last_sedimentado_at?: string | null;
          surface?: string;
          title?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          facet?: Database["public"]["Enums"]["chat_facet"];
          id?: string;
          last_sedimentado_at?: string | null;
          surface?: string;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      contexto_externo: {
        Row: {
          ativo: boolean;
          conteudo: string;
          created_at: string;
          id: string;
          tipo: string;
          titulo: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ativo?: boolean;
          conteudo: string;
          created_at?: string;
          id?: string;
          tipo?: string;
          titulo: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ativo?: boolean;
          conteudo?: string;
          created_at?: string;
          id?: string;
          tipo?: string;
          titulo?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      corpo_sinais: {
        Row: {
          created_at: string;
          id: string;
          intensidade: number | null;
          nota: string | null;
          registrado_em: string;
          tipo: Database["public"]["Enums"]["sinal_tipo"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          intensidade?: number | null;
          nota?: string | null;
          registrado_em?: string;
          tipo: Database["public"]["Enums"]["sinal_tipo"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          intensidade?: number | null;
          nota?: string | null;
          registrado_em?: string;
          tipo?: Database["public"]["Enums"]["sinal_tipo"];
          user_id?: string;
        };
        Relationships: [];
      };
      drive_docs: {
        Row: {
          created_at: string;
          id: string;
          observacao: string | null;
          tipo: string;
          updated_at: string;
          user_id: string;
          vehicle_id: string;
          vence_em: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          observacao?: string | null;
          tipo: string;
          updated_at?: string;
          user_id: string;
          vehicle_id: string;
          vence_em: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          observacao?: string | null;
          tipo?: string;
          updated_at?: string;
          user_id?: string;
          vehicle_id?: string;
          vence_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drive_docs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "drive_vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      drive_expenses: {
        Row: {
          categoria: string;
          created_at: string;
          descricao: string | null;
          id: string;
          ocorrido_em: string;
          updated_at: string;
          user_id: string;
          valor: number;
          vehicle_id: string | null;
        };
        Insert: {
          categoria: string;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          ocorrido_em?: string;
          updated_at?: string;
          user_id: string;
          valor: number;
          vehicle_id?: string | null;
        };
        Update: {
          categoria?: string;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          ocorrido_em?: string;
          updated_at?: string;
          user_id?: string;
          valor?: number;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "drive_expenses_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "drive_vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      drive_oil_changes: {
        Row: {
          created_at: string;
          durabilidade_km: number;
          id: string;
          km: number;
          observacao: string | null;
          ocorrido_em: string;
          tipo_oleo: string | null;
          updated_at: string;
          user_id: string;
          vehicle_id: string;
        };
        Insert: {
          created_at?: string;
          durabilidade_km?: number;
          id?: string;
          km: number;
          observacao?: string | null;
          ocorrido_em?: string;
          tipo_oleo?: string | null;
          updated_at?: string;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          created_at?: string;
          durabilidade_km?: number;
          id?: string;
          km?: number;
          observacao?: string | null;
          ocorrido_em?: string;
          tipo_oleo?: string | null;
          updated_at?: string;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drive_oil_changes_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "drive_vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      drive_parkings: {
        Row: {
          created_at: string;
          custo: number | null;
          expira_em: string | null;
          finalizado_em: string | null;
          id: string;
          iniciado_em: string;
          local: string;
          observacao: string | null;
          updated_at: string;
          user_id: string;
          vehicle_id: string | null;
        };
        Insert: {
          created_at?: string;
          custo?: number | null;
          expira_em?: string | null;
          finalizado_em?: string | null;
          id?: string;
          iniciado_em?: string;
          local: string;
          observacao?: string | null;
          updated_at?: string;
          user_id: string;
          vehicle_id?: string | null;
        };
        Update: {
          created_at?: string;
          custo?: number | null;
          expira_em?: string | null;
          finalizado_em?: string | null;
          id?: string;
          iniciado_em?: string;
          local?: string;
          observacao?: string | null;
          updated_at?: string;
          user_id?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "drive_parkings_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "drive_vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      drive_refuels: {
        Row: {
          combustivel: string;
          created_at: string;
          id: string;
          km: number;
          litros: number;
          observacao: string | null;
          ocorrido_em: string;
          posto: string | null;
          preco_litro: number | null;
          total: number | null;
          updated_at: string;
          user_id: string;
          vehicle_id: string;
        };
        Insert: {
          combustivel?: string;
          created_at?: string;
          id?: string;
          km: number;
          litros: number;
          observacao?: string | null;
          ocorrido_em?: string;
          posto?: string | null;
          preco_litro?: number | null;
          total?: number | null;
          updated_at?: string;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          combustivel?: string;
          created_at?: string;
          id?: string;
          km?: number;
          litros?: number;
          observacao?: string | null;
          ocorrido_em?: string;
          posto?: string | null;
          preco_litro?: number | null;
          total?: number | null;
          updated_at?: string;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drive_refuels_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "drive_vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      drive_trips: {
        Row: {
          created_at: string;
          destino: string | null;
          finalizado_em: string | null;
          id: string;
          iniciado_em: string;
          km_final: number | null;
          km_inicial: number;
          observacao: string | null;
          pedagio: number | null;
          updated_at: string;
          user_id: string;
          vehicle_id: string;
        };
        Insert: {
          created_at?: string;
          destino?: string | null;
          finalizado_em?: string | null;
          id?: string;
          iniciado_em?: string;
          km_final?: number | null;
          km_inicial: number;
          observacao?: string | null;
          pedagio?: number | null;
          updated_at?: string;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          created_at?: string;
          destino?: string | null;
          finalizado_em?: string | null;
          id?: string;
          iniciado_em?: string;
          km_final?: number | null;
          km_inicial?: number;
          observacao?: string | null;
          pedagio?: number | null;
          updated_at?: string;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drive_trips_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "drive_vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      drive_vehicles: {
        Row: {
          ano: number | null;
          apelido: string;
          ativo: boolean;
          created_at: string;
          foto_url: string | null;
          id: string;
          modelo: string | null;
          placa: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ano?: number | null;
          apelido: string;
          ativo?: boolean;
          created_at?: string;
          foto_url?: string | null;
          id?: string;
          modelo?: string | null;
          placa?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ano?: number | null;
          apelido?: string;
          ativo?: boolean;
          created_at?: string;
          foto_url?: string | null;
          id?: string;
          modelo?: string | null;
          placa?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      eventos: {
        Row: {
          created_at: string;
          descricao: string | null;
          fim: string | null;
          id: string;
          inicio: string;
          local: string | null;
          tipo: Database["public"]["Enums"]["evento_tipo"];
          titulo: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          descricao?: string | null;
          fim?: string | null;
          id?: string;
          inicio: string;
          local?: string | null;
          tipo?: Database["public"]["Enums"]["evento_tipo"];
          titulo: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          descricao?: string | null;
          fim?: string | null;
          id?: string;
          inicio?: string;
          local?: string | null;
          tipo?: Database["public"]["Enums"]["evento_tipo"];
          titulo?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      jardim_memorias: {
        Row: {
          archived_at: string | null;
          body: string;
          category: string;
          created_at: string;
          ease: number;
          id: string;
          importance: number;
          interval_days: number;
          last_reviewed_at: string | null;
          next_review_at: string;
          review_count: number;
          source: string | null;
          source_ref: string | null;
          tags: string[];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          body: string;
          category?: string;
          created_at?: string;
          ease?: number;
          id?: string;
          importance?: number;
          interval_days?: number;
          last_reviewed_at?: string | null;
          next_review_at?: string;
          review_count?: number;
          source?: string | null;
          source_ref?: string | null;
          tags?: string[];
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          body?: string;
          category?: string;
          created_at?: string;
          ease?: number;
          id?: string;
          importance?: number;
          interval_days?: number;
          last_reviewed_at?: string | null;
          next_review_at?: string;
          review_count?: number;
          source?: string | null;
          source_ref?: string | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      jurisprudencia: {
        Row: {
          conteudo: string | null;
          created_at: string;
          ementa: string | null;
          fonte_url: string | null;
          id: string;
          numero: string | null;
          tags: string[] | null;
          tribunal: string | null;
          user_id: string;
        };
        Insert: {
          conteudo?: string | null;
          created_at?: string;
          ementa?: string | null;
          fonte_url?: string | null;
          id?: string;
          numero?: string | null;
          tags?: string[] | null;
          tribunal?: string | null;
          user_id: string;
        };
        Update: {
          conteudo?: string | null;
          created_at?: string;
          ementa?: string | null;
          fonte_url?: string | null;
          id?: string;
          numero?: string | null;
          tags?: string[] | null;
          tribunal?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      kuanyin_appointment_reminders: {
        Row: {
          appointment_id: string;
          channel: string;
          created_at: string;
          id: string;
          payload: Json;
          send_at: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          appointment_id: string;
          channel?: string;
          created_at?: string;
          id?: string;
          payload?: Json;
          send_at: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          appointment_id?: string;
          channel?: string;
          created_at?: string;
          id?: string;
          payload?: Json;
          send_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kuanyin_appointment_reminders_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "kuanyin_appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      kuanyin_appointments: {
        Row: {
          business_context_id: string | null;
          client_id: string | null;
          created_at: string;
          ends_at: string | null;
          evento_id: string | null;
          id: string;
          metadata: Json;
          notes: string | null;
          price_cents: number | null;
          service_name: string;
          starts_at: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          business_context_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          ends_at?: string | null;
          evento_id?: string | null;
          id?: string;
          metadata?: Json;
          notes?: string | null;
          price_cents?: number | null;
          service_name: string;
          starts_at: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_context_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          ends_at?: string | null;
          evento_id?: string | null;
          id?: string;
          metadata?: Json;
          notes?: string | null;
          price_cents?: number | null;
          service_name?: string;
          starts_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kuanyin_appointments_business_context_id_fkey";
            columns: ["business_context_id"];
            isOneToOne: false;
            referencedRelation: "business_contexts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kuanyin_appointments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "kuanyin_clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kuanyin_appointments_evento_id_fkey";
            columns: ["evento_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
        ];
      };
      kuanyin_clients: {
        Row: {
          business_context_id: string | null;
          created_at: string;
          email: string | null;
          id: string;
          linked_user_id: string | null;
          metadata: Json;
          nome: string;
          notas: string | null;
          preferencias: Json;
          status: string;
          telefone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          business_context_id?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          linked_user_id?: string | null;
          metadata?: Json;
          nome: string;
          notas?: string | null;
          preferencias?: Json;
          status?: string;
          telefone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_context_id?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          linked_user_id?: string | null;
          metadata?: Json;
          nome?: string;
          notas?: string | null;
          preferencias?: Json;
          status?: string;
          telefone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kuanyin_clients_business_context_id_fkey";
            columns: ["business_context_id"];
            isOneToOne: false;
            referencedRelation: "business_contexts";
            referencedColumns: ["id"];
          },
        ];
      };
      kuanyin_integrity_logs: {
        Row: {
          category: string;
          created_at: string;
          excerpt: string | null;
          id: string;
          note: string | null;
          severity: string;
          thread_id: string | null;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          note?: string | null;
          severity: string;
          thread_id?: string | null;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          note?: string | null;
          severity?: string;
          thread_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      kuanyin_orders: {
        Row: {
          business_context_id: string | null;
          client_id: string | null;
          created_at: string;
          description: string;
          id: string;
          items: Json;
          metadata: Json;
          price_cents: number | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          business_context_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          items?: Json;
          metadata?: Json;
          price_cents?: number | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_context_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          items?: Json;
          metadata?: Json;
          price_cents?: number | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kuanyin_orders_business_context_id_fkey";
            columns: ["business_context_id"];
            isOneToOne: false;
            referencedRelation: "business_contexts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kuanyin_orders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "kuanyin_clients";
            referencedColumns: ["id"];
          },
        ];
      };
      kuanyin_payments: {
        Row: {
          amount_cents: number;
          appointment_id: string | null;
          comprovante_ref: string | null;
          created_at: string;
          fraud_alert_note: string | null;
          id: string;
          metadata: Json;
          method: string | null;
          order_id: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          appointment_id?: string | null;
          comprovante_ref?: string | null;
          created_at?: string;
          fraud_alert_note?: string | null;
          id?: string;
          metadata?: Json;
          method?: string | null;
          order_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          appointment_id?: string | null;
          comprovante_ref?: string | null;
          created_at?: string;
          fraud_alert_note?: string | null;
          id?: string;
          metadata?: Json;
          method?: string | null;
          order_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kuanyin_payments_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "kuanyin_appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kuanyin_payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "kuanyin_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      kuanyin_public_chat_messages: {
        Row: {
          content: string;
          created_at: string;
          guardian_id: string;
          id: string;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          guardian_id: string;
          id?: string;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          guardian_id?: string;
          id?: string;
          role?: string;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kuanyin_public_chat_messages_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "kuanyin_guardians";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kuanyin_public_chat_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "kuanyin_public_chat_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      kuanyin_public_chat_threads: {
        Row: {
          business_context_id: string | null;
          created_at: string;
          guardian_id: string;
          id: string;
          status: string;
          updated_at: string;
          user_id: string;
          visitor_key: string | null;
          visitor_name: string | null;
        };
        Insert: {
          business_context_id?: string | null;
          created_at?: string;
          guardian_id: string;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          visitor_key?: string | null;
          visitor_name?: string | null;
        };
        Update: {
          business_context_id?: string | null;
          created_at?: string;
          guardian_id?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          visitor_key?: string | null;
          visitor_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "kuanyin_public_chat_threads_business_context_id_fkey";
            columns: ["business_context_id"];
            isOneToOne: false;
            referencedRelation: "business_contexts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kuanyin_public_chat_threads_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "kuanyin_guardians";
            referencedColumns: ["id"];
          },
        ];
      };
      kuanyin_portal_tokens: {
        Row: {
          appointment_id: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          label: string | null;
          order_id: string | null;
          revoked_at: string | null;
          scope: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          appointment_id?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          label?: string | null;
          order_id?: string | null;
          revoked_at?: string | null;
          scope: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          appointment_id?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          label?: string | null;
          order_id?: string | null;
          revoked_at?: string | null;
          scope?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kuanyin_portal_tokens_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "kuanyin_appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kuanyin_portal_tokens_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "kuanyin_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_chunks: {
        Row: {
          created_at: string;
          document_id: string;
          id: string;
          level: string;
          ordinal: number;
          parent_id: string | null;
          path: string;
          revised_at: string | null;
          source_url: string | null;
          status: string;
          text: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          document_id: string;
          id?: string;
          level: string;
          ordinal?: number;
          parent_id?: string | null;
          path: string;
          revised_at?: string | null;
          source_url?: string | null;
          status?: string;
          text: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          document_id?: string;
          id?: string;
          level?: string;
          ordinal?: number;
          parent_id?: string | null;
          path?: string;
          revised_at?: string | null;
          source_url?: string | null;
          status?: string;
          text?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "legal_chunks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "legal_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "legal_chunks_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "legal_chunks";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_documents: {
        Row: {
          ano: number | null;
          created_at: string;
          editorial_notes: string | null;
          id: string;
          imported_at: string | null;
          imported_by: string | null;
          jurisdicao: string;
          kind: string;
          numero: string | null;
          slug: string;
          source_url: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          ano?: number | null;
          created_at?: string;
          editorial_notes?: string | null;
          id?: string;
          imported_at?: string | null;
          imported_by?: string | null;
          jurisdicao?: string;
          kind: string;
          numero?: string | null;
          slug: string;
          source_url?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          ano?: number | null;
          created_at?: string;
          editorial_notes?: string | null;
          id?: string;
          imported_at?: string | null;
          imported_by?: string | null;
          jurisdicao?: string;
          kind?: string;
          numero?: string | null;
          slug?: string;
          source_url?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      legislacao: {
        Row: {
          artigo: string | null;
          created_at: string;
          fonte_url: string | null;
          id: string;
          texto: string | null;
          tipo: string | null;
          titulo: string;
          user_id: string;
        };
        Insert: {
          artigo?: string | null;
          created_at?: string;
          fonte_url?: string | null;
          id?: string;
          texto?: string | null;
          tipo?: string | null;
          titulo: string;
          user_id: string;
        };
        Update: {
          artigo?: string | null;
          created_at?: string;
          fonte_url?: string | null;
          id?: string;
          texto?: string | null;
          tipo?: string | null;
          titulo?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      livros: {
        Row: {
          arquivo_ext: string | null;
          arquivo_local_mime: string | null;
          arquivo_local_nome: string | null;
          arquivo_mime: string | null;
          arquivo_nome: string | null;
          arquivo_path: string | null;
          armazenamento_origem: string;
          autor: string | null;
          created_at: string;
          file_size: number | null;
          google_drive_file_id: string | null;
          google_drive_modified_time: string | null;
          google_drive_web_view_link: string | null;
          id: string;
          infografico_url: string | null;
          leitura_percentual: number;
          leitura_posicao: Json;
          metadata: Json;
          mime_type: string | null;
          origem: string | null;
          resumo: string | null;
          storage_bucket: string | null;
          storage_path: string | null;
          texto_extraido: string | null;
          titulo: string;
          ultimo_acesso_em: string | null;
          user_id: string;
        };
        Insert: {
          arquivo_ext?: string | null;
          arquivo_local_mime?: string | null;
          arquivo_local_nome?: string | null;
          arquivo_mime?: string | null;
          arquivo_nome?: string | null;
          arquivo_path?: string | null;
          armazenamento_origem?: string;
          autor?: string | null;
          created_at?: string;
          file_size?: number | null;
          google_drive_file_id?: string | null;
          google_drive_modified_time?: string | null;
          google_drive_web_view_link?: string | null;
          id?: string;
          infografico_url?: string | null;
          leitura_percentual?: number;
          leitura_posicao?: Json;
          metadata?: Json;
          mime_type?: string | null;
          origem?: string | null;
          resumo?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          texto_extraido?: string | null;
          titulo: string;
          ultimo_acesso_em?: string | null;
          user_id: string;
        };
        Update: {
          arquivo_ext?: string | null;
          arquivo_local_mime?: string | null;
          arquivo_local_nome?: string | null;
          arquivo_mime?: string | null;
          arquivo_nome?: string | null;
          arquivo_path?: string | null;
          armazenamento_origem?: string;
          autor?: string | null;
          created_at?: string;
          file_size?: number | null;
          google_drive_file_id?: string | null;
          google_drive_modified_time?: string | null;
          google_drive_web_view_link?: string | null;
          id?: string;
          infografico_url?: string | null;
          leitura_percentual?: number;
          leitura_posicao?: Json;
          metadata?: Json;
          mime_type?: string | null;
          origem?: string | null;
          resumo?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          texto_extraido?: string | null;
          titulo?: string;
          ultimo_acesso_em?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      presenca_regimes: {
        Row: {
          state: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          state: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          state?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profile_initial_contexts: {
        Row: {
          admin_notes: string | null;
          created_at: string | null;
          created_by: string;
          id: string;
          important_context: string | null;
          initial_seeds: string | null;
          limits_and_cautions: string | null;
          main_goal: string | null;
          response_preferences: string | null;
          tone: string | null;
          treatment_name: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          admin_notes?: string | null;
          created_at?: string | null;
          created_by: string;
          id?: string;
          important_context?: string | null;
          initial_seeds?: string | null;
          limits_and_cautions?: string | null;
          main_goal?: string | null;
          response_preferences?: string | null;
          tone?: string | null;
          treatment_name?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string | null;
          created_by?: string;
          id?: string;
          important_context?: string | null;
          initial_seeds?: string | null;
          limits_and_cautions?: string | null;
          main_goal?: string | null;
          response_preferences?: string | null;
          tone?: string | null;
          treatment_name?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          assigned_facet: string | null;
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          gender: string | null;
          id: string;
          pronouns: string | null;
          initial_surface: string;
          role: string;
        };
        Insert: {
          assigned_facet?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          gender?: string | null;
          id: string;
          pronouns?: string | null;
          initial_surface?: string;
          role?: string;
        };
        Update: {
          assigned_facet?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          gender?: string | null;
          id?: string;
          pronouns?: string | null;
          initial_surface?: string;
          role?: string;
        };
        Relationships: [];
      };
      registro_vivo: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          mood: number | null;
          occurred_at: string;
          tags: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          kind: string;
          mood?: number | null;
          occurred_at?: string;
          tags?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          mood?: number | null;
          occurred_at?: string;
          tags?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reunioes: {
        Row: {
          audio_path: string | null;
          created_at: string;
          id: string;
          infografico_url: string | null;
          resumo: string | null;
          titulo: string;
          transcricao: string | null;
          user_id: string;
        };
        Insert: {
          audio_path?: string | null;
          created_at?: string;
          id?: string;
          infografico_url?: string | null;
          resumo?: string | null;
          titulo: string;
          transcricao?: string | null;
          user_id: string;
        };
        Update: {
          audio_path?: string | null;
          created_at?: string;
          id?: string;
          infografico_url?: string | null;
          resumo?: string | null;
          titulo?: string;
          transcricao?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      sedimentos: {
        Row: {
          confianca: number;
          created_at: string;
          hipotese: string;
          id: string;
          nivel: Database["public"]["Enums"]["sedimento_nivel"];
          promovido_para: string | null;
          promovido_tipo: string | null;
          resumo: string | null;
          revisado_at: string | null;
          source_ids: string[];
          source_kind: string;
          status: Database["public"]["Enums"]["sedimento_status"];
          thread_id: string;
          user_id: string;
        };
        Insert: {
          confianca?: number;
          created_at?: string;
          hipotese: string;
          id?: string;
          nivel?: Database["public"]["Enums"]["sedimento_nivel"];
          promovido_para?: string | null;
          promovido_tipo?: string | null;
          resumo?: string | null;
          revisado_at?: string | null;
          source_ids?: string[];
          source_kind?: string;
          status?: Database["public"]["Enums"]["sedimento_status"];
          thread_id: string;
          user_id: string;
        };
        Update: {
          confianca?: number;
          created_at?: string;
          hipotese?: string;
          id?: string;
          nivel?: Database["public"]["Enums"]["sedimento_nivel"];
          promovido_para?: string | null;
          promovido_tipo?: string | null;
          resumo?: string | null;
          revisado_at?: string | null;
          source_ids?: string[];
          source_kind?: string;
          status?: Database["public"]["Enums"]["sedimento_status"];
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sedimentos_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "chat_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      treino_series: {
        Row: {
          concluida: boolean;
          descanso_segundos: number | null;
          id: string;
          ordem: number;
          peso: number | null;
          registrada_em: string;
          reps: number | null;
          rir: number | null;
          sessao_exercicio_id: string;
          user_id: string;
        };
        Insert: {
          concluida?: boolean;
          descanso_segundos?: number | null;
          id?: string;
          ordem?: number;
          peso?: number | null;
          registrada_em?: string;
          reps?: number | null;
          rir?: number | null;
          sessao_exercicio_id: string;
          user_id: string;
        };
        Update: {
          concluida?: boolean;
          descanso_segundos?: number | null;
          id?: string;
          ordem?: number;
          peso?: number | null;
          registrada_em?: string;
          reps?: number | null;
          rir?: number | null;
          sessao_exercicio_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "treino_series_sessao_exercicio_id_fkey";
            columns: ["sessao_exercicio_id"];
            isOneToOne: false;
            referencedRelation: "treino_sessao_exercicios";
            referencedColumns: ["id"];
          },
        ];
      };
      treino_sessao_exercicios: {
        Row: {
          created_at: string;
          grupo_muscular: string | null;
          id: string;
          nome: string;
          notas: string | null;
          ordem: number;
          sessao_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          grupo_muscular?: string | null;
          id?: string;
          nome: string;
          notas?: string | null;
          ordem?: number;
          sessao_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          grupo_muscular?: string | null;
          id?: string;
          nome?: string;
          notas?: string | null;
          ordem?: number;
          sessao_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "treino_sessao_exercicios_sessao_id_fkey";
            columns: ["sessao_id"];
            isOneToOne: false;
            referencedRelation: "treino_sessoes";
            referencedColumns: ["id"];
          },
        ];
      };
      treino_sessoes: {
        Row: {
          created_at: string;
          duracao_segundos: number | null;
          encerrada_em: string | null;
          id: string;
          iniciada_em: string;
          notas: string | null;
          semaforo: Database["public"]["Enums"]["semaforo_fisico"];
          status: Database["public"]["Enums"]["sessao_status"];
          template_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duracao_segundos?: number | null;
          encerrada_em?: string | null;
          id?: string;
          iniciada_em?: string;
          notas?: string | null;
          semaforo?: Database["public"]["Enums"]["semaforo_fisico"];
          status?: Database["public"]["Enums"]["sessao_status"];
          template_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          duracao_segundos?: number | null;
          encerrada_em?: string | null;
          id?: string;
          iniciada_em?: string;
          notas?: string | null;
          semaforo?: Database["public"]["Enums"]["semaforo_fisico"];
          status?: Database["public"]["Enums"]["sessao_status"];
          template_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "treino_sessoes_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "treino_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      treino_template_exercicios: {
        Row: {
          created_at: string;
          grupo_muscular: string | null;
          id: string;
          nome: string;
          notas: string | null;
          ordem: number;
          reps_alvo: string | null;
          series_alvo: number | null;
          template_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          grupo_muscular?: string | null;
          id?: string;
          nome: string;
          notas?: string | null;
          ordem?: number;
          reps_alvo?: string | null;
          series_alvo?: number | null;
          template_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          grupo_muscular?: string | null;
          id?: string;
          nome?: string;
          notas?: string | null;
          ordem?: number;
          reps_alvo?: string | null;
          series_alvo?: number | null;
          template_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "treino_template_exercicios_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "treino_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      treino_templates: {
        Row: {
          created_at: string;
          descricao: string | null;
          dias_semana: number[];
          id: string;
          nome: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          descricao?: string | null;
          dias_semana?: number[];
          id?: string;
          nome: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          descricao?: string | null;
          dias_semana?: number[];
          id?: string;
          nome?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      workspace_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          modules: string[];
          owner_id: string;
          status: string;
          token: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          modules?: string[];
          owner_id: string;
          status?: string;
          token: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          modules?: string[];
          owner_id?: string;
          status?: string;
          token?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          created_at: string;
          id: string;
          member_id: string;
          modules: string[];
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_id: string;
          modules?: string[];
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_id?: string;
          modules?: string[];
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_memory_candidate_atomic: {
        Args: {
          p_candidate_id: string;
          p_title: string;
          p_content: string;
          p_domain: string;
          p_sensitivity: string;
          p_tags: string[];
          p_importance: number;
        };
        Returns: Json;
      };
      can_access_workspace: {
        Args: { _module: string; _owner: string };
        Returns: boolean;
      };
      confirm_sediment_atomic: {
        Args: {
          p_sedimento_id: string;
          p_title: string;
          p_content: string;
          p_importance: number;
          p_tags: string[];
        };
        Returns: Json;
      };
      complete_telegram_dialogue_with_candidate: {
        Args: {
          p_assistant_message_id: string;
          p_dialogue_id: string;
          p_thread_id: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      create_handoff_candidate_atomic: {
        Args: {
          p_event_type: string;
          p_source_app: string;
          p_occurred_at: string;
          p_title: string;
          p_body: string;
          p_payload: Json;
        };
        Returns: Json;
      };
      current_workspace_owner: { Args: never; Returns: string };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      promote_sediment_batch_atomic: {
        Args: {
          p_thread_id: string;
          p_next_level: string;
          p_source_ids: string[];
          p_hipotese: string;
          p_resumo: string;
          p_confianca: number;
          p_parent_status?: string;
          p_new_status?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "member";
      chat_facet: "kallistis" | "kharis" | "kuanyin";
      evento_tipo: "compromisso" | "aula" | "reuniao" | "evento" | "prazo" | "outro";
      sedimento_nivel:
        | "iconic"
        | "echoic"
        | "short_term"
        | "working"
        | "prospective"
        | "episodic"
        | "semantic"
        | "procedural";
      sedimento_status: "rascunho" | "em_revisao" | "confirmado" | "descartado";
      semaforo_fisico: "green" | "yellow" | "red" | "blue" | "neutral";
      sessao_status: "em_andamento" | "concluida" | "abandonada";
      sinal_tipo: "sono" | "energia" | "dor" | "humor" | "fome" | "estresse" | "outro";
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "member"],
      chat_facet: ["kallistis", "kharis", "kuanyin"],
      evento_tipo: ["compromisso", "aula", "reuniao", "evento", "prazo", "outro"],
      sedimento_nivel: [
        "iconic",
        "echoic",
        "short_term",
        "working",
        "prospective",
        "episodic",
        "semantic",
        "procedural",
      ],
      sedimento_status: ["rascunho", "em_revisao", "confirmado", "descartado"],
      semaforo_fisico: ["green", "yellow", "red", "blue", "neutral"],
      sessao_status: ["em_andamento", "concluida", "abandonada"],
      sinal_tipo: ["sono", "energia", "dor", "humor", "fome", "estresse", "outro"],
    },
  },
} as const;
