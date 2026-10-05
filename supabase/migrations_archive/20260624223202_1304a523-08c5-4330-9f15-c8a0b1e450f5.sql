
-- VEHICLES
CREATE TABLE public.drive_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apelido TEXT NOT NULL,
  modelo TEXT,
  ano INT,
  placa TEXT,
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_vehicles TO authenticated;
GRANT ALL ON public.drive_vehicles TO service_role;
ALTER TABLE public.drive_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_vehicles owner" ON public.drive_vehicles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REFUELS
CREATE TABLE public.drive_refuels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  km INT NOT NULL,
  litros NUMERIC(8,3) NOT NULL,
  combustivel TEXT NOT NULL DEFAULT 'gasolina',
  preco_litro NUMERIC(8,3),
  total NUMERIC(10,2),
  posto TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_refuels TO authenticated;
GRANT ALL ON public.drive_refuels TO service_role;
ALTER TABLE public.drive_refuels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_refuels owner" ON public.drive_refuels FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_drive_refuels_vehicle ON public.drive_refuels(vehicle_id, ocorrido_em DESC);

-- OIL CHANGES
CREATE TABLE public.drive_oil_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  km INT NOT NULL,
  durabilidade_km INT NOT NULL DEFAULT 10000,
  tipo_oleo TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_oil_changes TO authenticated;
GRANT ALL ON public.drive_oil_changes TO service_role;
ALTER TABLE public.drive_oil_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_oil_changes owner" ON public.drive_oil_changes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_drive_oil_vehicle ON public.drive_oil_changes(vehicle_id, ocorrido_em DESC);

-- EXPENSES
CREATE TABLE public.drive_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  categoria TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_expenses TO authenticated;
GRANT ALL ON public.drive_expenses TO service_role;
ALTER TABLE public.drive_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_expenses owner" ON public.drive_expenses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_drive_expenses_user ON public.drive_expenses(user_id, ocorrido_em DESC);

-- TRIPS
CREATE TABLE public.drive_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  destino TEXT,
  km_inicial INT NOT NULL,
  km_final INT,
  pedagio NUMERIC(10,2),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_trips TO authenticated;
GRANT ALL ON public.drive_trips TO service_role;
ALTER TABLE public.drive_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_trips owner" ON public.drive_trips FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PARKINGS
CREATE TABLE public.drive_parkings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  local TEXT NOT NULL,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  custo NUMERIC(10,2),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_parkings TO authenticated;
GRANT ALL ON public.drive_parkings TO service_role;
ALTER TABLE public.drive_parkings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_parkings owner" ON public.drive_parkings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DOCS
CREATE TABLE public.drive_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.drive_vehicles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  vence_em DATE NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drive_docs TO authenticated;
GRANT ALL ON public.drive_docs TO service_role;
ALTER TABLE public.drive_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drive_docs owner" ON public.drive_docs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE TRIGGER trg_drive_vehicles_upd BEFORE UPDATE ON public.drive_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_refuels_upd BEFORE UPDATE ON public.drive_refuels
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_oil_upd BEFORE UPDATE ON public.drive_oil_changes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_expenses_upd BEFORE UPDATE ON public.drive_expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_trips_upd BEFORE UPDATE ON public.drive_trips
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_parkings_upd BEFORE UPDATE ON public.drive_parkings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drive_docs_upd BEFORE UPDATE ON public.drive_docs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
