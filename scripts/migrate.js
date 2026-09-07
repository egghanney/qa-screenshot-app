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

-- 5. Seed Hubtel Send Money Feature
DO $$
DECLARE
    v_project_id UUID;
    v_feature_id UUID;
    v_s1 UUID; v_s2 UUID; v_s3 UUID; v_s4 UUID; v_s5 UUID;
    v_n1 UUID; v_n2 UUID; v_n3 UUID; v_n4 UUID; v_n5 UUID; v_nd UUID; v_ne UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.qa_projects LIMIT 1) THEN
        INSERT INTO public.qa_projects (name, description, platform)
        VALUES ('Hubtel', 'Leading omni-channel commerce and payment platform', 'Android')
        RETURNING id INTO v_project_id;

        INSERT INTO public.qa_features (
            project_id, name, platform, description, purpose, user_types, entry_point, expected_outcome, context, advanced_context, status, version
        )
        VALUES (
            v_project_id,
            'Send Money',
            'Android',
            'Enables customers to send money instantly to mobile wallets and bank accounts.',
            'Allow customers to send money to another user seamlessly with real-time receipt generation.',
            ARRAY['Customer', 'Merchant'],
            'Home → Payments → Send Money',
            'Transaction settled with receipt ID and SMS dispatch',
            'Key mobile financial service within the Hubtel super-app.',
            '{"known_business_rules": "Zero duplicate transactions within 60-second window. Daily cap enforced per KYC tier.", "known_limitations": "Cross-network transfers incur 1% fee.", "known_dependencies": "Core Banking Ledger, Carrier SMS Gateway"}'::jsonb,
            'documented',
            '1.0'
        )
        RETURNING id INTO v_feature_id;

        INSERT INTO public.qa_screens (feature_id, screen_number, name, image_url, description, state, user_action, expected_behavior, notes)
        VALUES 
        (v_feature_id, 1, 'Home & Payments Hub', 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=60', 'Main landing screen with quick action icons', 'normal', 'User taps "Send Money"', 'System opens recipient selection directory', 'Entry node of feature journey')
        RETURNING id INTO v_s1;

        INSERT INTO public.qa_screens (feature_id, screen_number, name, image_url, description, state, user_action, expected_behavior, notes)
        VALUES 
        (v_feature_id, 2, 'Select Recipient & Network', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=60', 'Contact search and mobile network selector', 'normal', 'User selects recipient from contacts', 'System queries recipient name and account status', 'Validates active phone number')
        RETURNING id INTO v_s2;

        INSERT INTO public.qa_screens (feature_id, screen_number, name, image_url, description, state, user_action, expected_behavior, notes)
        VALUES 
        (v_feature_id, 3, 'Enter Amount & Reference', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=60', 'Numeric keypad and transfer note input', 'normal', 'User enters amount and taps "Continue"', 'System validates balance and computes transfer fees', 'Key boundary validation screen')
        RETURNING id INTO v_s3;

        INSERT INTO public.qa_screens (feature_id, screen_number, name, image_url, description, state, user_action, expected_behavior, notes)
        VALUES 
        (v_feature_id, 4, 'Review & Security Authorization', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60', 'Summary card with fee breakdown and PIN prompt', 'authentication', 'User enters 4-digit PIN and authorizes', 'System submits payload to banking gateway', 'High security risk checkpoint')
        RETURNING id INTO v_s4;

        INSERT INTO public.qa_screens (feature_id, screen_number, name, image_url, description, state, user_action, expected_behavior, notes)
        VALUES 
        (v_feature_id, 5, 'Transaction Receipt & Confirmation', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60', 'Success receipt with transaction reference ID', 'success', 'User taps "Done"', 'System displays reference ID and triggers confirmation SMS', 'Final success boundary')
        RETURNING id INTO v_s5;

        INSERT INTO public.qa_journey_nodes (feature_id, screen_id, type, label, position_x, position_y, metadata)
        VALUES 
        (v_feature_id, v_s1, 'screen', 'Screen 1: Home & Payments Hub', 100, 220, '{"screen_number": 1, "state": "normal"}'::jsonb)
        RETURNING id INTO v_n1;

        INSERT INTO public.qa_journey_nodes (feature_id, screen_id, type, label, position_x, position_y, metadata)
        VALUES 
        (v_feature_id, v_s2, 'screen', 'Screen 2: Select Recipient', 460, 220, '{"screen_number": 2, "state": "normal"}'::jsonb)
        RETURNING id INTO v_n2;

        INSERT INTO public.qa_journey_nodes (feature_id, screen_id, type, label, position_x, position_y, metadata)
        VALUES 
        (v_feature_id, v_s3, 'screen', 'Screen 3: Enter Amount', 820, 220, '{"screen_number": 3, "state": "normal"}'::jsonb)
        RETURNING id INTO v_n3;

        INSERT INTO public.qa_journey_nodes (feature_id, screen_id, type, label, position_x, position_y, metadata)
        VALUES 
        (v_feature_id, NULL, 'decision', 'Account Limit & Balance Check', 1180, 100, '{"condition": "Adequate balance & valid PIN?"}'::jsonb)
        RETURNING id INTO v_nd;

        INSERT INTO public.qa_journey_nodes (feature_id, screen_id, type, label, position_x, position_y, metadata)
        VALUES 
        (v_feature_id, NULL, 'error_state', 'Insufficient Funds / Error State', 1180, 360, '{"state": "error"}'::jsonb)
        RETURNING id INTO v_ne;

        INSERT INTO public.qa_journey_nodes (feature_id, screen_id, type, label, position_x, position_y, metadata)
        VALUES 
        (v_feature_id, v_s4, 'screen', 'Screen 4: Review & Security', 1540, 220, '{"screen_number": 4, "state": "authentication"}'::jsonb)
        RETURNING id INTO v_n4;

        INSERT INTO public.qa_journey_nodes (feature_id, screen_id, type, label, position_x, position_y, metadata)
        VALUES 
        (v_feature_id, v_s5, 'screen', 'Screen 5: Transaction Receipt', 1900, 220, '{"screen_number": 5, "state": "success"}'::jsonb)
        RETURNING id INTO v_n5;

        INSERT INTO public.qa_journey_edges (feature_id, source_node_id, target_node_id, action, system_response, edge_type)
        VALUES
        (v_feature_id, v_n1, v_n2, 'Tap "Send Money"', 'Navigates to recipient picker', 'default'),
        (v_feature_id, v_n2, v_n3, 'Select contact from list', 'Verifies name and prompts for amount', 'default'),
        (v_feature_id, v_n3, v_nd, 'Enter amount & tap Continue', 'Validates balance and limits', 'default'),
        (v_feature_id, v_nd, v_n4, 'Balance confirmed & below limit', 'Loads authorization screen', 'success'),
        (v_feature_id, v_nd, v_ne, 'Insufficient balance or exceeded cap', 'Displays error prompt', 'failure'),
        (v_feature_id, v_ne, v_n3, 'Tap "Edit Amount"', 'Returns to amount field', 'recovery'),
        (v_feature_id, v_n4, v_n5, 'Authorize with 4-digit PIN', 'Settles payment and generates receipt', 'success');

        INSERT INTO public.qa_knowledge_items (feature_id, category, title, content, source, confidence, verification_status, notes)
        VALUES
        (v_feature_id, 'Features & Services', 'Omni-channel Instant Transfers', 'Facilitates real-time money transfers to mobile wallets and bank accounts.', 'User', 'CONFIRMED', 'Verified', 'Core value proposition'),
        (v_feature_id, 'User Types', 'Customer & Merchant Roles', 'Tier-1 and Tier-2 verified customers with active Hubtel wallets.', 'User', 'CONFIRMED', 'Verified', 'Role definitions'),
        (v_feature_id, 'Journeys & Navigation', 'Linear 5-Step Traversal with Error Loop', 'Entry via Home → Payments → Send Money. Includes error recovery back to Amount screen.', 'Screenshot', 'CONFIRMED', 'Verified', 'Empirical flow'),
        (v_feature_id, 'Interaction & Configuration Reference', 'Form Validation & Keypad Behavior', 'Continue button activates only when amount is > 0 and recipient is verified.', 'Screenshot', 'CONFIRMED', 'Verified', 'UI state check'),
        (v_feature_id, 'Business Rules & Constraints', 'Duplicate Transaction Protection', 'System locks repeat submissions with identical parameters within 60 seconds.', 'User', 'CONFIRMED', 'Verified', 'Idempotency rule'),
        (v_feature_id, 'Business Rules & Constraints', 'Minimum Transaction Threshold', 'Minimum transfer amount is unknown from available screens.', 'AI', 'UNKNOWN', 'Needs Confirmation', 'Requires PM confirmation'),
        (v_feature_id, 'System & Failure States', 'Network Timeout during Settle Call', 'If socket closes before ACK, app enters pending inquiry state without double-debiting.', 'AI', 'INFERRED', 'Needs Confirmation', 'Resilience state'),
        (v_feature_id, 'Communications & Dependencies', 'Carrier SMS & In-App Push Delivery', 'Dispatches SMS receipt with transaction reference ID within 5 seconds.', 'AI', 'INFERRED', 'Needs Confirmation', 'External dependency');

        INSERT INTO public.qa_questions (feature_id, question, category, status, impact_analysis)
        VALUES
        (v_feature_id, 'What is the minimum single-transaction amount allowed for Send Money?', 'Business Rules & Constraints', 'Pending', 'Required for boundary testing (below minimum vs at minimum).'),
        (v_feature_id, 'Is biometric authorization (FaceID/Fingerprint) enabled alongside PIN?', 'Interaction & Configuration Reference', 'Pending', 'Affects authentication failure test scenarios.'),
        (v_feature_id, 'What is the exact timeout duration when waiting for mobile money carrier response?', 'System & Failure States', 'Pending', 'Defines gateway timeout threshold.');

        INSERT INTO public.qa_checkpoints (feature_id, category, title, test_steps, expected_result, priority, status)
        VALUES
        (v_feature_id, 'Field Validation', 'Amount Field — Empty Submission Check', '1. Open Send Money\n2. Leave amount empty\n3. Tap Continue', 'Continue button is disabled or highlights field in red.', 'Critical', 'Passed'),
        (v_feature_id, 'Field Validation', 'Amount Field — Maximum Daily Cap Exceeded', '1. Enter 100,000.00\n2. Tap Continue', 'System displays: "Transaction exceeds daily KYC limit".', 'High', 'Not Run'),
        (v_feature_id, 'Navigation', 'Back Traversal Data Retention', '1. Enter recipient and amount\n2. Advance to review\n3. Tap Back', 'Previous screen retains entered amount and recipient.', 'Medium', 'Not Run'),
        (v_feature_id, 'Transaction', 'Duplicate Submission Double-Click Test', '1. Double-tap Confirm in rapid succession (<200ms)', 'Only single transaction payload is processed.', 'Critical', 'Not Run'),
        (v_feature_id, 'Security & Failure', 'PIN Entry Lockout after 3 Failed Attempts', '1. Enter incorrect PIN 3 consecutive times', 'Account enters 15-minute security cooldown.', 'Critical', 'Not Run');

        INSERT INTO public.qa_observations (feature_id, type, title, description, severity, priority, status)
        VALUES
        (v_feature_id, 'UX Issue', 'Fee breakdown not explicitly displayed before PIN prompt', 'The transfer fee is omitted on Screen 3 and only appears on Screen 4.', 'Minor', 'P2', 'Open'),
        (v_feature_id, 'Bug', 'Keypad occasionally obscures the Continue button on small screens', 'On viewport height < 680px, the software keyboard covers the CTA button.', 'Major', 'P1', 'Open');
    END IF;
END $$;

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
