'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  Project, 
  Feature, 
  ScreenItem, 
  JourneyNodeData, 
  JourneyEdgeData, 
  KnowledgeItem, 
  QACheckpoint, 
  QAObservation, 
  AIQuestion 
} from '@/lib/types';

import { ApplicationShell } from '@/components/shell/ApplicationShell';
import { FeatureOverviewView } from '@/components/dashboard/FeatureOverviewView';
import { ScreenDeckView } from '@/components/screens/ScreenDeckView';
import { VisualJourneyCanvas } from '@/components/journey/VisualJourneyCanvas';
import { KnowledgeBaseView } from '@/components/knowledge/KnowledgeBaseView';
import { AIQuestionsDeck } from '@/components/knowledge/AIQuestionsDeck';
import { QACheckpointMatrix } from '@/components/qa/QACheckpointMatrix';
import { ObservationTracker } from '@/components/observations/ObservationTracker';
import { ScreenComparisonStudio } from '@/components/compare/ScreenComparisonStudio';
import { ExportStudio } from '@/components/export/ExportStudio';
import { AskAICopilotDrawer } from '@/components/chat/AskAICopilotDrawer';
import { FeatureWizardModal } from '@/components/wizard/FeatureWizardModal';
import { SettingsModal } from '@/components/shell/SettingsModal';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const [project, setProject] = useState<Project | null>(null);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [screens, setScreens] = useState<ScreenItem[]>([]);
  const [nodes, setNodes] = useState<JourneyNodeData[]>([]);
  const [edges, setEdges] = useState<JourneyEdgeData[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [checkpoints, setCheckpoints] = useState<QACheckpoint[]>([]);
  const [observations, setObservations] = useState<QAObservation[]>([]);

  const [activeTab, setActiveTab] = useState('overview');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load active feature data from Supabase
  const loadFeatureData = useCallback(async (featureId?: string) => {
    try {
      // 1. Fetch Project
      const { data: projData } = await supabase.from('qa_projects').select('*').limit(1).single();
      if (projData) setProject(projData);

      // 2. Fetch Feature
      let featQuery = supabase.from('qa_features').select('*');
      if (featureId) {
        featQuery = featQuery.eq('id', featureId);
      }
      const { data: featData } = await featQuery.limit(1).single();
      if (!featData) {
        setIsLoading(false);
        return;
      }
      setFeature(featData);
      const targetFeatureId = featData.id;

      // 3. Fetch Screens
      const { data: scrs } = await supabase
        .from('qa_screens')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('screen_number', { ascending: true });
      setScreens(scrs || []);

      // 4. Fetch Journey Nodes
      const { data: nds } = await supabase
        .from('qa_journey_nodes')
        .select('*')
        .eq('feature_id', targetFeatureId);
      setNodes(nds || []);

      // 5. Fetch Journey Edges
      const { data: edgs } = await supabase
        .from('qa_journey_edges')
        .select('*')
        .eq('feature_id', targetFeatureId);
      setEdges(edgs || []);

      // 6. Fetch Knowledge Items
      const { data: knw } = await supabase
        .from('qa_knowledge_items')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('created_at', { ascending: true });
      setKnowledge(knw || []);

      // 7. Fetch AI Questions
      const { data: qst } = await supabase
        .from('qa_questions')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('created_at', { ascending: true });
      setQuestions(qst || []);

      // 8. Fetch QA Checkpoints
      const { data: cps } = await supabase
        .from('qa_checkpoints')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('created_at', { ascending: true });
      setCheckpoints(cps || []);

      // 9. Fetch QA Observations
      const { data: obs } = await supabase
        .from('qa_observations')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('created_at', { ascending: true });
      setObservations(obs || []);

    } catch (err) {
      console.error('Failed loading feature data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatureData();
  }, [loadFeatureData]);

  // AI Triggers
  const handleAnalyzeScreen = async (scr: ScreenItem) => {
    if (!feature) return;
    try {
      const res = await fetch('/api/screens/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screen_id: scr.id,
          feature_id: feature.id,
          image_url: scr.image_url,
          screen_number: scr.screen_number,
          existing_name: scr.name
        })
      });
      if (res.ok) {
        loadFeatureData(feature.id);
      }
    } catch (e) {
      console.error('Screen analysis error', e);
    }
  };

  const handleGenerateJourney = async () => {
    if (!feature) return;
    try {
      const res = await fetch('/api/journey/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: feature.id })
      });
      if (res.ok) {
        loadFeatureData(feature.id);
      }
    } catch (e) {
      console.error('Journey generation error', e);
    }
  };

  const handleGenerateKnowledge = async () => {
    if (!feature) return;
    try {
      const res = await fetch('/api/knowledge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: feature.id })
      });
      if (res.ok) {
        loadFeatureData(feature.id);
      }
    } catch (e) {
      console.error('Knowledge generation error', e);
    }
  };

  const handleGenerateCheckpoints = async () => {
    if (!feature) return;
    try {
      const res = await fetch('/api/qa/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: feature.id })
      });
      if (res.ok) {
        loadFeatureData(feature.id);
      }
    } catch (e) {
      console.error('Checkpoints error', e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-clinical-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-sm animate-spin">
            QA
          </div>
          <span className="text-xs font-mono font-semibold text-dark-chassis tracking-wider">
            INITIALIZING AETHER CLINICAL WORKSPACE...
          </span>
        </div>
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="min-h-screen bg-clinical-bg flex items-center justify-center p-4">
        <div className="bg-clinical-white p-8 rounded-[28px] border border-clinical-border shadow-modal max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neon/30 text-dark-chassis flex items-center justify-center mx-auto font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-dark-chassis">No Features Documented Yet</h2>
          <p className="text-xs text-txt-secondary">
            Get started by launching the guided feature creation wizard to upload screenshots and synthesize user journey intelligence.
          </p>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="w-full py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition shadow"
          >
            Create New Feature Journey
          </button>
          <FeatureWizardModal
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onFeatureCreated={(id) => loadFeatureData(id)}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <ApplicationShell
        currentProject={project}
        currentFeature={feature}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenWizard={() => setIsWizardOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        counts={{
          screens: screens.length,
          nodes: nodes.length,
          knowledge: knowledge.length,
          questions: questions.filter(q => q.status === 'Pending').length,
          checkpoints: checkpoints.length,
          observations: observations.length
        }}
      >
        {activeTab === 'overview' && (
          <FeatureOverviewView
            feature={feature}
            screens={screens}
            knowledge={knowledge}
            checkpoints={checkpoints}
            observations={observations}
            questions={questions}
            onNavigateTab={setActiveTab}
            onOpenWizard={() => setIsWizardOpen(true)}
          />
        )}

        {activeTab === 'screens' && (
          <ScreenDeckView
            screens={screens}
            featureId={feature.id}
            onRefresh={() => loadFeatureData(feature.id)}
            onAnalyzeScreen={handleAnalyzeScreen}
          />
        )}

        {activeTab === 'journey' && (
          <VisualJourneyCanvas
            nodes={nodes}
            edges={edges}
            screens={screens}
            feature={feature}
            onRefresh={() => loadFeatureData(feature.id)}
            onGenerateJourney={handleGenerateJourney}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseView
            items={knowledge}
            feature={feature}
            onRefresh={() => loadFeatureData(feature.id)}
            onGenerateKnowledge={handleGenerateKnowledge}
          />
        )}

        {activeTab === 'questions' && (
          <AIQuestionsDeck
            questions={questions}
            feature={feature}
            onRefresh={() => loadFeatureData(feature.id)}
          />
        )}

        {activeTab === 'checkpoints' && (
          <QACheckpointMatrix
            checkpoints={checkpoints}
            feature={feature}
            onRefresh={() => loadFeatureData(feature.id)}
            onGenerateCheckpoints={handleGenerateCheckpoints}
          />
        )}

        {activeTab === 'defects' && (
          <ObservationTracker
            observations={observations}
            screens={screens}
            feature={feature}
            onRefresh={() => loadFeatureData(feature.id)}
          />
        )}

        {activeTab === 'compare' && (
          <ScreenComparisonStudio
            screens={screens}
            feature={feature}
          />
        )}

        {activeTab === 'export' && (
          <ExportStudio
            feature={feature}
            screens={screens}
            nodes={nodes}
            edges={edges}
            knowledge={knowledge}
            checkpoints={checkpoints}
            observations={observations}
            questions={questions}
          />
        )}
      </ApplicationShell>

      {/* Slide-out Grounded Ask AI Drawer */}
      <AskAICopilotDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        feature={feature}
      />

      {/* Feature Creation Wizard Modal */}
      <FeatureWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onFeatureCreated={(id) => loadFeatureData(id)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
