const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

let envDbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!envDbUrl && fs.existsSync(path.join(__dirname, '../.env.local'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const match = envContent.match(/SUPABASE_DATABASE_URL=(.+)/);
  if (match) envDbUrl = match[1].trim();
}

const client = envDbUrl
  ? new Client({ connectionString: envDbUrl, ssl: { rejectUnauthorized: false } })
  : new Client({
      host: process.env.PGHOST || 'aws-1-eu-west-1.pooler.supabase.com',
      port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
      user: process.env.PGUSER || 'postgres.uwigrkumdxeoshzlxpek',
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE || 'postgres',
      ssl: { rejectUnauthorized: false }
    });

const migrationSql = `
-- 1. Create QA schema tables
CREATE TABLE IF NOT EXISTS public.qa_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    platform TEXT NOT NULL DEFAULT 'Web',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.qa_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform TEXT DEFAULT 'Android',
    description TEXT,
    purpose TEXT,
    user_types TEXT[] DEFAULT '{}',
    entry_point TEXT,
    expected_outcome TEXT,
    context TEXT,
    advanced_context JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'draft',
    version TEXT DEFAULT '1.0',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES public.qa_features(id) ON DELETE CASCADE,
    screen_number INT NOT NULL,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    storage_path TEXT,
    description TEXT,
    state TEXT DEFAULT 'normal',
    user_action TEXT,
    expected_behavior TEXT,
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    pii_flagged BOOLEAN DEFAULT false,
    pii_redactions JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_journey_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES public.qa_features(id) ON DELETE CASCADE,
    screen_id UUID REFERENCES public.qa_screens(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'screen',
    label TEXT NOT NULL,
    position_x FLOAT NOT NULL DEFAULT 0,
    position_y FLOAT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_journey_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES public.qa_features(id) ON DELETE CASCADE,
    source_node_id UUID REFERENCES public.qa_journey_nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES public.qa_journey_nodes(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    condition TEXT,
    system_response TEXT,
    edge_type TEXT DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES public.qa_features(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'AI',
    confidence TEXT NOT NULL DEFAULT 'INFERRED',
    verification_status TEXT NOT NULL DEFAULT 'Needs Confirmation',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES public.qa_features(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    category TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    impact_analysis TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES public.qa_features(id) ON DELETE CASCADE,
    screen_id UUID REFERENCES public.qa_screens(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    test_steps TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    test_data_notes TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Not Run',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES public.qa_features(id) ON DELETE CASCADE,
    screen_id UUID REFERENCES public.qa_screens(id) ON DELETE SET NULL,
    node_id UUID REFERENCES public.qa_journey_nodes(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'Major',
    priority TEXT NOT NULL DEFAULT 'P1',
    expected_behavior TEXT,
    actual_behavior TEXT,
    evidence_url TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES public.qa_features(id) ON DELETE CASCADE,
    version_tag TEXT NOT NULL,
    snapshot_data JSONB NOT NULL,
    changelog TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qa_screen_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES public.qa_features(id) ON DELETE CASCADE,
    screen_a_id UUID REFERENCES public.qa_screens(id) ON DELETE CASCADE,
    screen_b_id UUID REFERENCES public.qa_screens(id) ON DELETE CASCADE,
    diff_summary TEXT,
    detected_changes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS and Permissive Policies
ALTER TABLE public.qa_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_journey_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_journey_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_screen_comparisons ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'qa_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "qa_all_access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "qa_all_access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 3. Grants for PostgREST
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 4. Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('qa_screenshots', 'qa_screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "qa_storage_public_access" ON storage.objects;
CREATE POLICY "qa_storage_public_access" ON storage.objects
FOR ALL USING (bucket_id = 'qa_screenshots') WITH CHECK (bucket_id = 'qa_screenshots');

-- 5. Notify PostgREST to reload schema cache

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
`;

async function run() {
  try {
    console.log('Connecting to uwigrkumdxeoshzlxpek pooler (aws-1-eu-west-1.pooler.supabase.com:5432)...');
    await client.connect();
    console.log('Connected! Executing schema creation & migration...');
    await client.query(migrationSql);
    console.log('SUCCESS! Migration completed on uwigrkumdxeoshzlxpek!');

    const res = await client.query(`
      SELECT 
        'qa_projects' AS t, count(*) AS c FROM public.qa_projects
      UNION ALL
      SELECT 'qa_features', count(*) FROM public.qa_features
      UNION ALL
      SELECT 'qa_screens', count(*) FROM public.qa_screens
      UNION ALL
      SELECT 'qa_journey_nodes', count(*) FROM public.qa_journey_nodes
      UNION ALL
      SELECT 'qa_knowledge_items', count(*) FROM public.qa_knowledge_items
      UNION ALL
      SELECT 'qa_checkpoints', count(*) FROM public.qa_checkpoints;
    `);
    console.log('Table verification counts on uwigrkumdxeoshzlxpek:');
    console.table(res.rows);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

run();
