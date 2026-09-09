'use client';

import React, { useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { 
  JourneyNodeData, 
  JourneyEdgeData, 
  ScreenItem, 
  Feature 
} from '@/lib/types';
import { 
  GitBranch, 
  Maximize2, 
  RotateCcw, 
  BrainCircuit, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  ShieldAlert,
  Play
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface VisualJourneyCanvasProps {
  nodes: JourneyNodeData[];
  edges: JourneyEdgeData[];
  screens: ScreenItem[];
  feature: Feature;
  onRefresh: () => void;
  onGenerateJourney: () => void;
}

// 1. Custom QA Screen Node
function QAScreenNodeComponent({ data }: { data: any }) {
  return (
    <div className="w-64 bg-clinical-white rounded-2xl border-2 border-dark-chassis shadow-card overflow-hidden text-xs">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-dark-chassis" />
      
      {/* Node Header */}
      <div className="p-2.5 bg-dark-chassis text-white flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="w-2 h-2 rounded-full bg-neon" />
          <span>#{data.metadata?.screen_number || 1}</span>
          <span className="text-neon font-semibold">{data.label}</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-dark-secondary text-txt-muted uppercase">
          {data.metadata?.state || 'Normal'}
        </span>
      </div>

      {/* Screen Thumbnail */}
      {data.metadata?.image_url && (
        <div className="h-28 bg-clinical-warm overflow-hidden relative border-b border-clinical-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.metadata.image_url} alt={data.label} className="w-full h-full object-cover" />
        </div>
      )}

      {/* User Action & System Response Card Body */}
      <div className="p-2.5 space-y-1.5 bg-clinical-white">
        <div className="bg-clinical-warm p-1.5 rounded-lg border border-clinical-border">
          <span className="text-[9px] font-bold text-dark-chassis uppercase tracking-wider block">User Action:</span>
          <p className="text-[11px] text-txt-primary font-medium">{data.metadata?.user_action || 'User interacts with UI'}</p>
        </div>

        <div className="bg-clinical-surface p-1.5 rounded-lg border border-clinical-border/60">
          <span className="text-[9px] font-bold text-txt-secondary uppercase tracking-wider block">System Response:</span>
          <p className="text-[10px] text-txt-secondary">{data.metadata?.system_response || 'Validates and transitions'}</p>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-dark-chassis" />
    </div>
  );
}

// 2. Custom Decision Node
function DecisionNodeComponent({ data }: { data: any }) {
  return (
    <div className="w-56 bg-clinical-white rounded-2xl border-2 border-neon shadow-card p-3 text-xs">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-neon" />
      
      <div className="flex items-center gap-1.5 text-dark-chassis font-bold text-[11px] mb-1">
        <GitBranch className="w-3.5 h-3.5 text-dark-chassis" />
        <span>Decision Logic</span>
      </div>

      <p className="text-xs font-semibold text-dark-chassis mb-2">{data.label}</p>
      
      {data.metadata?.condition && (
        <div className="bg-clinical-warm p-2 rounded-lg border border-clinical-border text-[10px] text-txt-secondary">
          <span className="font-bold text-dark-chassis">Rule:</span> {data.metadata.condition}
        </div>
      )}

      <Handle type="source" position={Position.Right} id="success" className="!w-2.5 !h-2.5 !bg-status-positive" />
      <Handle type="source" position={Position.Bottom} id="failure" className="!w-2.5 !h-2.5 !bg-status-critical" />
      {/* Default source handle fallback */}
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !opacity-0" />
    </div>
  );
}

// 3. Custom Error / Exception State Node
function ErrorStateNodeComponent({ data }: { data: any }) {
  return (
    <div className="w-56 bg-status-critical/10 rounded-2xl border-2 border-status-critical shadow-card p-3 text-xs">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-status-critical" />
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-status-critical" />
      
      <div className="flex items-center gap-1.5 text-status-critical font-bold text-[11px] mb-1">
        <ShieldAlert className="w-3.5 h-3.5 text-status-critical" />
        <span>Failure / Error State</span>
      </div>

      <p className="text-xs font-semibold text-dark-chassis mb-1.5">{data.label}</p>
      
      <div className="bg-clinical-white p-2 rounded-lg border border-status-critical/30 text-[10px] text-txt-secondary">
        <span className="font-bold text-status-critical">Recovery:</span> {data.metadata?.system_response || 'Prompts inline retry'}
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-status-critical" />
    </div>
  );
}

// 4. Custom Entry / Exit Nodes
function BoundaryNodeComponent({ data }: { data: any }) {
  const isEntry = data.type === 'entry';
  return (
    <div className={`w-48 rounded-full border-2 px-4 py-2.5 shadow-subtle flex items-center gap-2 text-xs font-semibold ${
      isEntry 
        ? 'bg-dark-chassis text-neon border-dark-chassis' 
        : 'bg-status-positive/20 text-dark-chassis border-status-positive'
    }`}>
      {isEntry ? <Play className="w-3.5 h-3.5 fill-neon" /> : <CheckCircle className="w-3.5 h-3.5 text-status-positive" />}
      <span className="truncate">{data.label}</span>
      
      {isEntry && <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-neon" />}
      {!isEntry && <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-status-positive" />}
    </div>
  );
}

export function VisualJourneyCanvas({ 
  nodes: initialNodes, 
  edges: initialEdges, 
  screens, 
  feature, 
  onRefresh, 
  onGenerateJourney 
}: VisualJourneyCanvasProps) {

  const nodeTypes = useMemo(() => ({
    screen: QAScreenNodeComponent,
    decision: DecisionNodeComponent,
    error_state: ErrorStateNodeComponent,
    entry: BoundaryNodeComponent,
    exit: BoundaryNodeComponent
  }), []);

  // Transform database nodes to ReactFlow nodes
  const formattedNodes: Node[] = useMemo(() => {
    return initialNodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.position_x, y: n.position_y },
      data: {
        label: n.label,
        type: n.type,
        screen_id: n.screen_id,
        metadata: n.metadata
      }
    }));
  }, [initialNodes]);

  // Transform database edges to ReactFlow edges
  const formattedEdges: Edge[] = useMemo(() => {
    return initialEdges.map((e) => {
      const isSuccess = e.edge_type === 'success';
      const isFailure = e.edge_type === 'failure';
      const isRecovery = e.edge_type === 'recovery';

      return {
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        label: e.action,
        animated: isSuccess || isRecovery,
        type: 'smoothstep',
        style: {
          stroke: isFailure ? '#E56B68' : isSuccess ? '#9BD3B5' : '#1D1E1C',
          strokeWidth: 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isFailure ? '#E56B68' : isSuccess ? '#9BD3B5' : '#1D1E1C'
        },
        labelStyle: {
          fontSize: 10,
          fontWeight: 600,
          fill: '#171816'
        },
        labelBgStyle: {
          fill: '#FFFFFF',
          fillOpacity: 0.95,
          rx: 6,
          ry: 6
        }
      };
    });
  }, [initialEdges]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(formattedNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(formattedEdges);
  const hasAutoFixedRef = React.useRef(false);

  const onConnect = useCallback(
    async (params: Connection) => {
      setRfEdges((eds) => addEdge(params, eds));
      if (params.source && params.target) {
        await supabase.from('qa_journey_edges').insert({
          feature_id: feature.id,
          source_node_id: params.source,
          target_node_id: params.target,
          action: 'User transition',
          system_response: 'Transitions forward',
          edge_type: 'default'
        });
        onRefresh();
      }
    },
    [feature.id, onRefresh, setRfEdges]
  );

  // Helper to get precise node bounding box dimensions per type
  const getNodeDimensions = useCallback((type?: string) => {
    switch (type) {
      case 'screen':
        return { width: 280, height: 340 };
      case 'decision':
      case 'error_state':
        return { width: 250, height: 180 };
      case 'entry':
      case 'exit':
        return { width: 220, height: 70 };
      default:
        return { width: 260, height: 220 };
    }
  }, []);

  // Dagre Auto Layout Engine (Guarantees nodes NEVER touch or overlap)
  const autoLayout = useCallback(async (persistToDb = true) => {
    if (formattedNodes.length === 0) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ 
      rankdir: 'LR', 
      nodesep: 140, // 140px vertical separation between branch rows
      ranksep: 200, // 200px horizontal separation between columns
      marginx: 80, 
      marginy: 80 
    });

    formattedNodes.forEach((node) => {
      const dim = getNodeDimensions(node.type);
      dagreGraph.setNode(node.id, { width: dim.width, height: dim.height });
    });

    formattedEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = formattedNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const dim = getNodeDimensions(node.type);
      if (!nodeWithPosition) return node;

      return {
        ...node,
        position: {
          x: Math.round(nodeWithPosition.x - dim.width / 2),
          y: Math.round(nodeWithPosition.y - dim.height / 2),
        },
      };
    });

    setRfNodes(layoutedNodes);

    if (persistToDb) {
      try {
        await Promise.all(
          layoutedNodes.map((n) =>
            supabase
              .from('qa_journey_nodes')
              .update({
                position_x: Math.round(n.position.x),
                position_y: Math.round(n.position.y),
              })
              .eq('id', n.id)
          )
        );
      } catch (err) {
        console.warn('Failed persisting auto-layout to database:', err);
      }
    }
  }, [formattedNodes, formattedEdges, setRfNodes, getNodeDimensions]);

  // Sync state if props change, and auto-separate if overlaps detected
  React.useEffect(() => {
    setRfNodes(formattedNodes);
    setRfEdges(formattedEdges);

    // Overlap detector: runs once on mount to auto-heal existing colliding nodes
    if (!hasAutoFixedRef.current && formattedNodes.length > 1) {
      const hasOverlap = formattedNodes.some((a, i) => {
        const aDim = getNodeDimensions(a.type);
        const aR = a.position.x + aDim.width;
        const aB = a.position.y + aDim.height;

        return formattedNodes.slice(i + 1).some((b) => {
          const bDim = getNodeDimensions(b.type);
          const bR = b.position.x + bDim.width;
          const bB = b.position.y + bDim.height;
          // Flag if distance between nodes is less than 30px
          return (a.position.x < bR + 30 && aR + 30 > b.position.x && a.position.y < bB + 30 && aB + 30 > b.position.y);
        });
      });

      if (hasOverlap) {
        hasAutoFixedRef.current = true;
        autoLayout(true);
      }
    }
  }, [formattedNodes, formattedEdges, autoLayout, getNodeDimensions, setRfNodes, setRfEdges]);

  // Persist dragged node position to Supabase
  const onNodeDragStop = useCallback(
    async (_: any, node: Node) => {
      try {
        await supabase
          .from('qa_journey_nodes')
          .update({
            position_x: Math.round(node.position.x),
            position_y: Math.round(node.position.y),
          })
          .eq('id', node.id);
      } catch (err) {
        console.warn('Failed saving dragged node position:', err);
      }
    },
    []
  );

  return (
    <div className="w-full h-full min-h-[600px] flex-1 relative bg-clinical-warm flex flex-col">
      
      {/* Canvas Top Bar */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
        
        {/* Left Status Pill */}
        <div className="pointer-events-auto bg-clinical-white/95 backdrop-blur-md px-3.5 py-2 rounded-pill border border-clinical-border shadow-card flex items-center justify-between sm:justify-start gap-2 text-xs font-semibold text-dark-chassis">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon animate-pulse" />
            <span className="hidden sm:inline">VISUAL JOURNEY GRAPH</span>
            <span className="sm:hidden text-[11px] font-bold">JOURNEY GRAPH</span>
          </div>
          <div className="flex items-center gap-1.5 text-txt-muted font-mono text-[11px]">
            <span className="text-clinical-border">•</span>
            <span>{rfNodes.length} Nodes</span>
            <span className="hidden xs:inline">/ {rfEdges.length} Transitions</span>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="pointer-events-auto flex items-center gap-2 justify-end">
          <button
            onClick={() => autoLayout(true)}
            className="flex-1 sm:flex-none min-h-[38px] sm:min-h-0 px-3.5 py-1.5 rounded-pill bg-clinical-white hover:bg-clinical-surface text-dark-chassis text-xs font-semibold border border-clinical-border shadow-subtle flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Auto-Layout</span>
          </button>

          <button
            onClick={onGenerateJourney}
            className="flex-1 sm:flex-none min-h-[38px] sm:min-h-0 px-4 py-1.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold shadow-card flex items-center justify-center gap-1.5 transition active:scale-95 whitespace-nowrap"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Regenerate Journey with AI</span>
            <span className="sm:hidden">Regenerate</span>
          </button>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="w-full h-full min-h-[600px] flex-1 relative">
        {rfNodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-clinical-white p-8 rounded-2xl border border-clinical-border shadow-card text-center max-w-sm space-y-3">
              <GitBranch className="w-8 h-8 text-txt-muted mx-auto opacity-40" />
              <h4 className="text-sm font-bold text-dark-chassis">No Journey Graph Generated</h4>
              <p className="text-xs text-txt-secondary">
                Synthesize your sequenced screens into an interactive directed acyclic graph (DAG) with explicit decision branches and error recovery states.
              </p>
              <button
                onClick={onGenerateJourney}
                className="px-4 py-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold shadow transition"
              >
                Generate Journey Map
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full">
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.05}
              maxZoom={1.5}
              style={{ width: '100%', height: '100%' }}
            >
              <Background color="#DCDDD6" gap={24} size={1.5} />
              <Controls 
                className="!bg-clinical-white !border !border-clinical-border !rounded-2xl !shadow-card overflow-hidden !bottom-4 !left-4" 
              />
              <MiniMap 
                className="!hidden sm:!block !bg-clinical-white !border !border-clinical-border !rounded-2xl !shadow-card !bottom-4 !right-4"
                nodeColor={(n) => {
                  if (n.type === 'decision') return '#F2F52A';
                  if (n.type === 'error_state') return '#E56B68';
                  if (n.type === 'exit') return '#9BD3B5';
                  return '#1D1E1C';
                }}
              />
            </ReactFlow>
          </div>
        )}
      </div>

    </div>
  );
}
