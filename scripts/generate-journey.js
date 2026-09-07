const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const featureId = 'f551a745-d69e-41f3-b747-a46b48f537f4';
  
  const { data: feature, error: fErr } = await supabase
    .from('qa_features')
    .select('*')
    .eq('id', featureId)
    .single();

  if (fErr || !feature) {
    console.error('Feature not found:', fErr);
    process.exit(1);
  }

  const { data: screens, error: sErr } = await supabase
    .from('qa_screens')
    .select('*')
    .eq('feature_id', featureId)
    .order('screen_number', { ascending: true });

  if (sErr || !screens || screens.length === 0) {
    console.error('Screens not found:', sErr);
    process.exit(1);
  }

  console.log(`Found feature "${feature.name}" with ${screens.length} screens.`);

  const nodes = [];
  const edges = [];

  // 1. Entry node
  const entryId = crypto.randomUUID();
  nodes.push({
    id: entryId,
    feature_id: feature.id,
    screen_id: null,
    type: 'entry',
    label: feature.entry_point || 'Journey Entry Point',
    position_x: 60,
    position_y: 200,
    metadata: {
      user_action: 'Initiates feature journey',
      system_response: 'Loads initial screen and dependencies'
    }
  });

  let previousNodeId = entryId;

  screens.forEach((screen, index) => {
    const nodeId = crypto.randomUUID();
    const x = 360 * (index + 1);
    const y = 200;

    const action = screen.user_action || screen.ai_analysis?.suggested_user_action || `Interacts with ${screen.name}`;
    const response = screen.expected_behavior || screen.ai_analysis?.suggested_system_response || 'Validates and transitions';

    nodes.push({
      id: nodeId,
      feature_id: feature.id,
      screen_id: screen.id,
      type: 'screen',
      label: screen.name || `Screen ${index + 1}`,
      position_x: x,
      position_y: y,
      metadata: {
        screen_number: screen.screen_number || index + 1,
        image_url: screen.image_url,
        state: screen.state,
        user_action: action,
        system_response: response
      }
    });

    edges.push({
      id: crypto.randomUUID(),
      feature_id: feature.id,
      source_node_id: previousNodeId,
      target_node_id: nodeId,
      action: action,
      system_response: response,
      edge_type: 'default'
    });

    // Decision & error state before authorization screen
    if (index === screens.length - 2 && screens.length >= 3) {
      const decisionId = crypto.randomUUID();
      const errorId = crypto.randomUUID();

      nodes.push({
        id: decisionId,
        feature_id: feature.id,
        screen_id: null,
        type: 'decision',
        label: 'Validation & Authorization Check',
        position_x: x + 180,
        position_y: 100,
        metadata: {
          condition: 'Balance adequate & PIN/OTP valid?',
          notes: 'Evaluates account limits and identity'
        }
      });

      nodes.push({
        id: errorId,
        feature_id: feature.id,
        screen_id: null,
        type: 'error_state',
        label: 'Authorization Failure / Re-entry',
        position_x: x + 180,
        position_y: 360,
        metadata: {
          state: 'error',
          system_response: 'Displays inline error prompt and allows 3 retries'
        }
      });

      edges.push({
        id: crypto.randomUUID(),
        feature_id: feature.id,
        source_node_id: nodeId,
        target_node_id: decisionId,
        action: 'Submits credentials / PIN',
        system_response: 'Validates with backend banking gateway',
        edge_type: 'default'
      });

      edges.push({
        id: crypto.randomUUID(),
        feature_id: feature.id,
        source_node_id: decisionId,
        target_node_id: errorId,
        action: 'Invalid input or limit exceeded',
        system_response: 'Triggers security lockout warning',
        edge_type: 'failure'
      });

      edges.push({
        id: crypto.randomUUID(),
        feature_id: feature.id,
        source_node_id: errorId,
        target_node_id: nodeId,
        action: 'User taps Retry',
        system_response: 'Resets form state and re-prompts',
        edge_type: 'recovery'
      });
    }

    previousNodeId = nodeId;
  });

  // Exit node
  const exitId = crypto.randomUUID();
  nodes.push({
    id: exitId,
    feature_id: feature.id,
    screen_id: null,
    type: 'exit',
    label: feature.expected_outcome || 'Journey Completed',
    position_x: 360 * (screens.length + 1),
    position_y: 200,
    metadata: {
      system_response: 'Dispatches confirmation alert and returns to main app shell'
    }
  });

  edges.push({
    id: crypto.randomUUID(),
    feature_id: feature.id,
    source_node_id: previousNodeId,
    target_node_id: exitId,
    action: 'User acknowledges completion',
    system_response: 'Updates customer state and stores receipt',
    edge_type: 'success'
  });

  console.log(`Generated ${nodes.length} nodes and ${edges.length} edges.`);

  // Delete previous
  await supabase.from('qa_journey_edges').delete().eq('feature_id', featureId);
  await supabase.from('qa_journey_nodes').delete().eq('feature_id', featureId);

  // Insert nodes first
  const { error: nErr } = await supabase.from('qa_journey_nodes').insert(nodes);
  if (nErr) {
    console.error('Error inserting nodes:', nErr);
    process.exit(1);
  }
  console.log('Successfully inserted nodes!');

  // Insert edges
  const { error: eErr } = await supabase.from('qa_journey_edges').insert(edges);
  if (eErr) {
    console.error('Error inserting edges:', eErr);
    process.exit(1);
  }
  console.log('Successfully inserted edges!');

  // Verify
  const { count: nodeCount } = await supabase.from('qa_journey_nodes').select('*', { count: 'exact', head: true }).eq('feature_id', featureId);
  const { count: edgeCount } = await supabase.from('qa_journey_edges').select('*', { count: 'exact', head: true }).eq('feature_id', featureId);
  console.log(`Verification: qa_journey_nodes has ${nodeCount} rows, qa_journey_edges has ${edgeCount} rows.`);
}

run();
