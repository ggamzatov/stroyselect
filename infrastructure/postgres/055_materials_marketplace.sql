BEGIN;

CREATE TABLE IF NOT EXISTS public.material_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_name varchar(200) NOT NULL,
  legal_name varchar(240),
  inn varchar(12),
  status varchar(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','archived')),
  commission_bps integer NOT NULL DEFAULT 500 CHECK (commission_bps BETWEEN 0 AND 10000),
  integration_mode varchar(24) NOT NULL DEFAULT 'manual' CHECK (integration_mode IN ('manual','csv','api','xml','yml','1c','moysklad')),
  contact_email varchar(320),
  contact_phone varchar(40),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS material_suppliers_public_name_unique_idx
  ON public.material_suppliers(lower(trim(public_name)));
CREATE INDEX IF NOT EXISTS material_suppliers_status_idx ON public.material_suppliers(status);

CREATE TABLE IF NOT EXISTS public.material_supplier_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.material_suppliers(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  address text NOT NULL,
  region varchar(160),
  city varchar(160),
  latitude numeric(10,7),
  longitude numeric(10,7),
  phone varchar(40),
  loading_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_id,name,address)
);

CREATE TABLE IF NOT EXISTS public.material_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_key text NOT NULL UNIQUE,
  canonical_name varchar(320) NOT NULL,
  category_name varchar(200),
  brand varchar(160),
  model varchar(160),
  unit varchar(40) NOT NULL DEFAULT 'шт',
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS material_products_active_name_idx
  ON public.material_products(is_active,canonical_name);

CREATE TABLE IF NOT EXISTS public.material_supplier_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.material_suppliers(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.material_supplier_locations(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.material_products(id) ON DELETE RESTRICT,
  supplier_sku varchar(160) NOT NULL,
  raw_name varchar(400) NOT NULL,
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB' CHECK (currency = upper(currency)),
  stock_qty numeric(16,3) NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  min_order_qty numeric(16,3) NOT NULL DEFAULT 1 CHECK (min_order_qty > 0),
  lead_time_days integer NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  is_active boolean NOT NULL DEFAULT true,
  source varchar(24) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','csv','api','xml','yml','1c','moysklad')),
  external_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_id,supplier_sku)
);

CREATE INDEX IF NOT EXISTS material_supplier_offers_product_idx
  ON public.material_supplier_offers(product_id,is_active,price_minor);
CREATE INDEX IF NOT EXISTS material_supplier_offers_supplier_idx
  ON public.material_supplier_offers(supplier_id,is_active);

CREATE TABLE IF NOT EXISTS public.material_catalog_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.material_suppliers(id) ON DELETE CASCADE,
  source_type varchar(24) NOT NULL CHECK (source_type IN ('manual','csv','api','xml','yml','1c','moysklad')),
  file_name text,
  status varchar(24) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','partial','failed')),
  rows_total integer NOT NULL DEFAULT 0 CHECK (rows_total >= 0),
  rows_imported integer NOT NULL DEFAULT 0 CHECK (rows_imported >= 0),
  rows_rejected integer NOT NULL DEFAULT 0 CHECK (rows_rejected >= 0),
  error_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS material_catalog_imports_supplier_idx
  ON public.material_catalog_imports(supplier_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_material_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title varchar(240) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','requested','selected','ordered','cancelled','completed')),
  selected_quote_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_material_lists_project_idx
  ON public.project_material_lists(project_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_material_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.project_material_lists(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.material_products(id) ON DELETE SET NULL,
  description varchar(500) NOT NULL,
  quantity numeric(16,3) NOT NULL CHECK (quantity > 0),
  unit varchar(40) NOT NULL,
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_material_items_list_idx
  ON public.project_material_items(list_id,sort_order,created_at);

CREATE TABLE IF NOT EXISTS public.material_procurement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.project_material_lists(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status varchar(24) NOT NULL DEFAULT 'open' CHECK (status IN ('open','selected','cancelled','expired')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS material_procurement_requests_list_idx
  ON public.material_procurement_requests(list_id,requested_at DESC);

CREATE TABLE IF NOT EXISTS public.material_procurement_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.material_procurement_requests(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.material_suppliers(id) ON DELETE CASCADE,
  status varchar(24) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','declined','selected','expired')),
  goods_subtotal_minor bigint NOT NULL DEFAULT 0 CHECK (goods_subtotal_minor >= 0),
  delivery_minor bigint CHECK (delivery_minor IS NULL OR delivery_minor >= 0),
  missing_item_count integer NOT NULL DEFAULT 0 CHECK (missing_item_count >= 0),
  max_lead_time_days integer NOT NULL DEFAULT 0 CHECK (max_lead_time_days >= 0),
  currency varchar(3) NOT NULL DEFAULT 'RUB',
  valid_until timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id,supplier_id)
);

CREATE INDEX IF NOT EXISTS material_procurement_quotes_request_idx
  ON public.material_procurement_quotes(request_id,missing_item_count,goods_subtotal_minor);

CREATE TABLE IF NOT EXISTS public.material_procurement_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.material_procurement_quotes(id) ON DELETE CASCADE,
  material_item_id uuid NOT NULL REFERENCES public.project_material_items(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.material_supplier_offers(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.material_products(id) ON DELETE SET NULL,
  supplier_sku_snapshot varchar(160),
  product_name_snapshot varchar(500) NOT NULL,
  quantity_requested numeric(16,3) NOT NULL CHECK (quantity_requested > 0),
  quantity_available numeric(16,3) NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  unit_price_minor bigint CHECK (unit_price_minor IS NULL OR unit_price_minor >= 0),
  line_total_minor bigint CHECK (line_total_minor IS NULL OR line_total_minor >= 0),
  lead_time_days integer NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  availability_status varchar(24) NOT NULL CHECK (availability_status IN ('available','partial','missing')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quote_id,material_item_id)
);

ALTER TABLE public.project_material_lists
  DROP CONSTRAINT IF EXISTS project_material_lists_selected_quote_fk;
ALTER TABLE public.project_material_lists
  ADD CONSTRAINT project_material_lists_selected_quote_fk
  FOREIGN KEY(selected_quote_id) REFERENCES public.material_procurement_quotes(id) ON DELETE SET NULL;

COMMIT;
