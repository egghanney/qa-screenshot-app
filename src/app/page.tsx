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
  AIQuestion,
  QACharter,
  QATestRun
} from '@/lib/types';

import { ApplicationShell } from '@/components/shell/ApplicationShell';
import { FeatureOverviewView } from '@/components/dashboard/FeatureOverviewView';
import { ScreenDeckView } from '@/components/screens/ScreenDeckView';
import { VisualJourneyCanvas } from '@/components/journey/VisualJourneyCanvas';
import { KnowledgeBaseView } from '@/components/knowledge/KnowledgeBaseView';
import { AIQuestionsDeck } from '@/components/knowledge/AIQuestionsDeck';
import { QACheckpointMatrix } from '@/components/qa/QACheckpointMatrix';
import { ExploratoryChartersView } from '@/components/charters/ExploratoryChartersView';
import { ObservationTracker } from '@/components/observations/ObservationTracker';
import { ScreenComparisonStudio } from '@/components/compare/ScreenComparisonStudio';
import { ExportStudio } from '@/components/export/ExportStudio';
import { AskAICopilotDrawer } from '@/components/chat/AskAICopilotDrawer';
import { FeatureWizardModal } from '@/components/wizard/FeatureWizardModal';
import { SettingsModal } from '@/components/shell/SettingsModal';
import { AppsHubLandingView } from '@/components/apps/AppsHubLandingView';
import { MultiCharterRunnerModal } from '@/components/charters/MultiCharterRunnerModal';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { LoginView } from '@/components/auth/LoginView';
import { AdminGovernanceView } from '@/components/admin/AdminGovernanceView';
import { BrainCircuit, Smartphone } from 'lucide-react';

function MainAppContent() {
  const { user, profile, loading: authLoading, isAdmin, signOut } = useAuth();
  const [isAdminView, setIsAdminView] = useState(false);

  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [feature, setFeature] = useState<Feature | null>(null);
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [screens, setScreens] = useState<ScreenItem[]>([]);
  const [nodes, setNodes] = useState<JourneyNodeData[]>([]);
  const [edges, setEdges] = useState<JourneyEdgeData[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [checkpoints, setCheckpoints] = useState<QACheckpoint[]>([]);
  const [charters, setCharters] = useState<QACharter[]>([]);
  const [observations, setObservations] = useState<QAObservation[]>([]);

  // Apps Hub & Runner Navigation State
  const [isAppsHubView, setIsAppsHubView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qa_active_view');
      if (saved === 'workspace') return false;
      if (saved === 'hub') return true;
    }
    return true; // Default to Apps Hub landing page
  });
  const [isMultiRunnerOpen, setIsMultiRunnerOpen] = useState(false);
  const [runnerTargetProject, setRunnerTargetProject] = useState<Project | null>(null);
  const [activeResumeRun, setActiveResumeRun] = useState<QATestRun | null>(null);
  const [chartersCountByProject, setChartersCountByProject] = useState<Record<string, number>>({});
  const [scenariosCountByProject, setScenariosCountByProject] = useState<Record<string, number>>({});

  const [activeTab, setActiveTab] = useState('overview');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);

  // Load active feature data from Supabase
  const loadFeatureData = useCallback(async (featureId?: string, targetProjId?: string) => {
    try {
      // 1. Fetch all Projects from DB
      const { data: projs } = await supabase
        .from('qa_projects')
        .select('*')
        .order('name', { ascending: true });
      const projectList = (projs || []) as Project[];
      setAllProjects(projectList);

      // 2. Fetch all Features from DB
      const { data: allFeats } = await supabase
        .from('qa_features')
        .select('*')
        .order('created_at', { ascending: false });

      const featureList = (allFeats || []) as Feature[];
      setAllFeatures(featureList);

      // Fetch charter and scenario metrics for all projects
      try {
        const { data: allProjectCharters } = await supabase
          .from('qa_charters')
          .select('id, feature_id, project_id');
        
        const charterList = allProjectCharters || [];
        const featProjMap = new Map(featureList.map(f => [f.id, f.project_id]));
        const cCounts: Record<string, number> = {};
        const charterProjMap = new Map<string, string>();

        charterList.forEach(c => {
          const pId = c.project_id || featProjMap.get(c.feature_id);
          if (pId) {
            cCounts[pId] = (cCounts[pId] || 0) + 1;
            charterProjMap.set(c.id, pId);
          }
        });
        setChartersCountByProject(cCounts);

        if (charterList.length > 0) {
          const { data: allScenarios } = await supabase
            .from('qa_charter_scenarios')
            .select('id, charter_id');

          const sCounts: Record<string, number> = {};
          (allScenarios || []).forEach(s => {
            const pId = charterProjMap.get(s.charter_id);
            if (pId) {
              sCounts[pId] = (sCounts[pId] || 0) + 1;
            }
          });
          setScenariosCountByProject(sCounts);
        } else {
          setScenariosCountByProject({});
        }
      } catch (metricsErr) {
        console.warn('Could not aggregate project charter metrics:', metricsErr);
      }

      const activeProjId = targetProjId !== undefined ? targetProjId : selectedProjectId;

      // Filter features based on active project selection if not 'all'
      const relevantFeatures = (activeProjId && activeProjId !== 'all')
        ? featureList.filter(f => f.project_id === activeProjId)
        : featureList;

      if (featureList.length === 0 && projectList.length === 0) {
        setFeature(null);
        setProject(null);
        setScreens([]);
        setNodes([]);
        setEdges([]);
        setKnowledge([]);
        setQuestions([]);
        setCheckpoints([]);
        setCharters([]);
        setObservations([]);
        setIsLoading(false);
        return;
      }

      // If a specific project was selected but it has no features yet
      if (activeProjId && activeProjId !== 'all' && relevantFeatures.length === 0) {
        const currentProj = projectList.find(p => p.id === activeProjId) || null;
        setProject(currentProj);
        setFeature(null);
        setScreens([]);
        setNodes([]);
        setEdges([]);
        setKnowledge([]);
        setQuestions([]);
        setCheckpoints([]);
        setCharters([]);
        setObservations([]);
        setIsLoading(false);
        return;
      }

      // If we are currently in Apps Hub mode and no specific feature or project was requested,
      // only retain project/feature lists and charter metrics. Do not eagerly fetch screens for a random feature.
      if (!featureId && !targetProjId && isAppsHubView) {
        setIsLoading(false);
        return;
      }

      // 3. Select target feature
      let targetFeat = relevantFeatures[0] || featureList[0];
      if (featureId) {
        const found = featureList.find(f => f.id === featureId);
        if (found) targetFeat = found;
      }
      setFeature(targetFeat);
      const targetFeatureId = targetFeat.id;

      // 4. Fetch Project for target feature
      if (targetFeat.project_id) {
        const foundProj = projectList.find(p => p.id === targetFeat.project_id);
        if (foundProj) {
          setProject(foundProj);
        } else {
          const { data: projData } = await supabase
            .from('qa_projects')
            .select('*')
            .eq('id', targetFeat.project_id)
            .single();
          if (projData) setProject(projData);
        }
      } else if (projectList.length > 0) {
        setProject(projectList[0]);
      }

      // 4. Fetch Screens
      const { data: scrs } = await supabase
        .from('qa_screens')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('screen_number', { ascending: true });
      setScreens(scrs || []);

      // 5. Fetch Journey Nodes
      const { data: nds } = await supabase
        .from('qa_journey_nodes')
        .select('*')
        .eq('feature_id', targetFeatureId);
      setNodes(nds || []);

      // 6. Fetch Journey Edges
      const { data: edgs } = await supabase
        .from('qa_journey_edges')
        .select('*')
        .eq('feature_id', targetFeatureId);
      setEdges(edgs || []);

      // 7. Fetch Knowledge Items
      const { data: knw } = await supabase
        .from('qa_knowledge_items')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('created_at', { ascending: true });
      setKnowledge(knw || []);

      // 8. Fetch AI Questions
      const { data: qst } = await supabase
        .from('qa_questions')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('created_at', { ascending: true });
      setQuestions(qst || []);

      // 9. Fetch QA Checkpoints
      const { data: cps } = await supabase
        .from('qa_checkpoints')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('created_at', { ascending: true });
      setCheckpoints(cps || []);

      // 10. Fetch QA Observations
      const { data: obs } = await supabase
        .from('qa_observations')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('created_at', { ascending: true });
      setObservations(obs || []);

      // 11. Fetch QA Exploratory Charters & Scenarios
      const { data: chtrs } = await supabase
        .from('qa_charters')
        .select('*')
        .eq('feature_id', targetFeatureId)
        .order('created_at', { ascending: true });

      if (chtrs && chtrs.length > 0) {
        const charterIds = chtrs.map(c => c.id);
        const { data: scns } = await supabase
          .from('qa_charter_scenarios')
          .select('*')
          .in('charter_id', charterIds)
          .order('sort_order', { ascending: true });

        const scenariosByCharter = (scns || []).reduce((acc: any, s: any) => {
          if (!acc[s.charter_id]) acc[s.charter_id] = [];
          acc[s.charter_id].push(s);
          return acc;
        }, {});

        setCharters(chtrs.map(c => ({
          ...c,
          scenarios: scenariosByCharter[c.id] || []
        })));
      } else {
        setCharters([]);
      }

    } catch (err) {
      console.error('Failed loading feature data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatureData();
  }, [loadFeatureData]);

  // Lightweight targeted refresh for active feature charters and scenarios (no full-screen loader)
  const refreshFeatureCharters = useCallback(async (targetFeatureId?: string) => {
    const featId = targetFeatureId || feature?.id;
    if (!featId) return;

    try {
      const { data: chtrs } = await supabase
        .from('qa_charters')
        .select('*')
        .eq('feature_id', featId)
        .order('created_at', { ascending: true });

      if (chtrs && chtrs.length > 0) {
        const charterIds = chtrs.map(c => c.id);
        const { data: scns } = await supabase
          .from('qa_charter_scenarios')
          .select('*')
          .in('charter_id', charterIds)
          .order('sort_order', { ascending: true });

        const scenariosByCharter = (scns || []).reduce((acc: any, s: any) => {
          if (!acc[s.charter_id]) acc[s.charter_id] = [];
          acc[s.charter_id].push(s);
          return acc;
        }, {});

        setCharters(chtrs.map(c => ({
          ...c,
          scenarios: scenariosByCharter[c.id] || []
        })));
      }
    } catch (err) {
      console.error('Error refreshing feature charters:', err);
    }
  }, [feature?.id]);

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

  const handleDeleteFeature = async (featureId: string) => {
    try {
      await supabase.from('qa_features').delete().eq('id', featureId);
      await loadFeatureData();
    } catch (e) {
      console.error('Failed to delete feature:', e);
    }
  };

  const handleSelectProject = (projId: string) => {
    setSelectedProjectId(projId);
    if (projId === 'all') {
      if (allFeatures.length > 0) {
        setFeature(allFeatures[0]);
        setScreens([]);
        setNodes([]);
        setEdges([]);
        setKnowledge([]);
        setQuestions([]);
        setCheckpoints([]);
        setCharters([]);
        setObservations([]);
        setIsWorkspaceLoading(true);
        loadFeatureData(allFeatures[0].id, 'all').finally(() => {
          setIsWorkspaceLoading(false);
        });
      }
    } else {
      const projFeatures = allFeatures.filter(f => f.project_id === projId);
      const currentProj = allProjects.find(p => p.id === projId) || null;
      setProject(currentProj);

      // Immediately clear stale artifacts to prevent flashing previous workspace
      setScreens([]);
      setNodes([]);
      setEdges([]);
      setKnowledge([]);
      setQuestions([]);
      setCheckpoints([]);
      setCharters([]);
      setObservations([]);

      if (projFeatures.length > 0) {
        setFeature(projFeatures[0]);
        setIsWorkspaceLoading(true);
        loadFeatureData(projFeatures[0].id, projId).finally(() => {
          setIsWorkspaceLoading(false);
        });
      } else {
        setFeature(null);
        setIsWorkspaceLoading(false);
      }
    }
  };

  const handleSelectFeature = (id: string) => {
    const target = allFeatures.find(f => f.id === id);
    if (target) {
      setFeature(target);
      if (target.project_id && selectedProjectId !== 'all' && target.project_id !== selectedProjectId) {
        setSelectedProjectId(target.project_id);
      }
      setScreens([]);
      setNodes([]);
      setEdges([]);
      setKnowledge([]);
      setQuestions([]);
      setCheckpoints([]);
      setCharters([]);
      setObservations([]);
      setIsWorkspaceLoading(true);
      loadFeatureData(id).finally(() => {
        setIsWorkspaceLoading(false);
      });
    }
  };

  const handleOpenAppsHub = () => {
    setIsAppsHubView(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qa_active_view', 'hub');
    }
  };

  const handleSelectProjectFromHub = (projId: string) => {
    const targetProj = allProjects.find(p => p.id === projId) || null;
    const projFeatures = allFeatures.filter(f => f.project_id === projId);

    // 1. Immediately synchronize project & purge old workspace state
    setProject(targetProj);
    setSelectedProjectId(projId);
    setScreens([]);
    setNodes([]);
    setEdges([]);
    setKnowledge([]);
    setQuestions([]);
    setCheckpoints([]);
    setCharters([]);
    setObservations([]);

    if (projFeatures.length > 0) {
      setFeature(projFeatures[0]);
      setIsWorkspaceLoading(true);
      loadFeatureData(projFeatures[0].id, projId).finally(() => {
        setIsWorkspaceLoading(false);
      });
    } else {
      setFeature(null);
      setIsWorkspaceLoading(false);
    }

    // 2. Switch view to workspace
    setIsAppsHubView(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qa_active_view', 'workspace');
    }
  };

  const handleRunAppChartersFromHub = (targetProj: Project) => {
    setActiveResumeRun(null);
    setRunnerTargetProject(targetProj);
    setIsMultiRunnerOpen(true);
  };

  const visibleFeatures = (selectedProjectId === 'all' || !selectedProjectId)
    ? allFeatures
    : allFeatures.filter(f => f.project_id === selectedProjectId);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#141513] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-sm animate-spin border border-neon/30">
            QA
          </div>
          <span className="text-xs font-mono font-semibold text-neon tracking-wider">
            AUTHENTICATING QA TEST STUDIO...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-qa-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-sm animate-spin">
            QA
          </div>
          <span className="text-xs font-mono font-semibold text-dark-chassis tracking-wider">
            INITIALIZING QA TEST STUDIO...
          </span>
        </div>
      </div>
    );
  }

  if (isAdminView) {
    return (
      <>
        <AdminGovernanceView
          onBack={() => setIsAdminView(false)}
          userEmail={user.email}
          userRole={profile?.role}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSignOut={signOut}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </>
    );
  }

  // Standalone Apps Hub Landing Page
  if (isAppsHubView) {
    return (
      <>
        <AppsHubLandingView
          projects={allProjects}
          features={allFeatures}
          chartersCountByProject={chartersCountByProject}
          scenariosCountByProject={scenariosCountByProject}
          onSelectProject={handleSelectProjectFromHub}
          onRunAppCharters={handleRunAppChartersFromHub}
          onResumeRun={(run) => {
            setActiveResumeRun(run);
            const targetProj = allProjects.find(p => p.id === run.project_id) || null;
            if (targetProj) setRunnerTargetProject(targetProj);
            setIsMultiRunnerOpen(true);
          }}
          onRefreshProjects={async () => { await loadFeatureData(); }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          userEmail={user.email}
          userRole={profile?.role}
          isAdmin={isAdmin}
          onOpenAdminPanel={() => setIsAdminView(true)}
          onSignOut={signOut}
        />

        {/* Multi-Feature & App-Wide Charter Runner Modal */}
        <MultiCharterRunnerModal
          isOpen={isMultiRunnerOpen}
          onClose={() => {
            setIsMultiRunnerOpen(false);
            setActiveResumeRun(null);
          }}
          initialRun={activeResumeRun}
          currentProject={runnerTargetProject || project}
          allProjects={allProjects}
          allFeatures={allFeatures}
          currentFeature={feature}
          onChartersUpdated={(updatedCharters) => {
            if (feature) {
              const featCharters = updatedCharters.filter(c => c.feature_id === feature.id);
              if (featCharters.length > 0) {
                setCharters(featCharters);
              }
            }
          }}
          onRefreshData={async () => {
            await refreshFeatureCharters();
          }}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </>
    );
  }

  if (allFeatures.length === 0 && allProjects.length === 0) {
    return (
      <div className="min-h-screen bg-qa-bg flex items-center justify-center p-4">
        <div className="bg-qa-white p-8 rounded-[28px] border border-qa-border shadow-modal max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neon/30 text-dark-chassis flex items-center justify-center mx-auto font-bold">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-dark-chassis">No Applications or Features Yet</h2>
          <p className="text-xs text-txt-secondary">
            Get started by launching the guided feature creation wizard to register your first application workspace and upload screenshots.
          </p>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="w-full py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition shadow"
          >
            Create First Feature Journey
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
        allFeatures={visibleFeatures}
        onSelectFeature={handleSelectFeature}
        allProjects={allProjects}
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        onOpenAppsHub={handleOpenAppsHub}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenWizard={() => setIsWizardOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        userEmail={user.email}
        userRole={profile?.role}
        isAdmin={isAdmin}
        onOpenAdminPanel={() => setIsAdminView(true)}
        onSignOut={signOut}
        counts={{
          screens: screens.length,
          nodes: nodes.length,
          knowledge: knowledge.length,
          questions: questions.filter(q => q.status === 'Pending').length,
          checkpoints: checkpoints.length,
          charters: charters.length,
          observations: observations.length
        }}
      >
        {isWorkspaceLoading ? (
          <div className="flex-1 flex items-center justify-center p-8 bg-qa-warm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-xs animate-spin">
                QA
              </div>
              <span className="text-xs font-mono font-semibold text-dark-chassis tracking-wider">
                LOADING WORKSPACE INTELLIGENCE...
              </span>
            </div>
          </div>
        ) : !feature ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-qa-white p-8 rounded-[28px] border border-qa-border shadow-card max-w-md text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-dark-chassis text-neon flex items-center justify-center mx-auto font-bold">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-dark-chassis">
                {project ? `No Features in ${project.name} Yet` : 'No Features in This Workspace'}
              </h2>
              <p className="text-xs text-txt-secondary leading-relaxed">
                {project
                  ? `This application workspace is configured for ${project.platform || 'General'}. Upload screenshots of your first user journey flow to synthesize comprehensive QA testing intelligence.`
                  : 'Select an application workspace above or create a new feature journey to begin.'}
              </p>
              <button
                onClick={() => setIsWizardOpen(true)}
                className="w-full py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition shadow"
              >
                + Create Feature {project ? `for ${project.name}` : ''}
              </button>
            </div>
          </div>
        ) : (
          <>
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
                onDeleteFeature={() => handleDeleteFeature(feature.id)}
              />
            )}

            {activeTab === 'screens' && (
              <ScreenDeckView
                screens={screens}
                featureId={feature.id}
                feature={feature}
                knowledgeItems={knowledge}
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

            {activeTab === 'charters' && (
              <ExploratoryChartersView
                currentFeature={feature}
                currentProject={project}
                allProjects={allProjects}
                allFeatures={allFeatures}
                charters={charters}
                onRefreshCharters={() => loadFeatureData(feature.id)}
                onOpenRunner={() => {
                  setActiveResumeRun(null);
                  setRunnerTargetProject(project);
                  setIsMultiRunnerOpen(true);
                }}
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
                charters={charters}
                observations={observations}
                questions={questions}
              />
            )}
          </>
        )}
      </ApplicationShell>

      {/* Slide-out Grounded Ask AI Drawer */}
      {feature && (
        <AskAICopilotDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          feature={feature}
        />
      )}

      {/* Feature Creation Wizard Modal */}
      <FeatureWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onFeatureCreated={(id) => loadFeatureData(id)}
        defaultProjectId={selectedProjectId !== 'all' ? selectedProjectId : undefined}
      />

      {/* Multi-Feature & App-Wide Charter Runner Modal */}
      <MultiCharterRunnerModal
        isOpen={isMultiRunnerOpen}
        onClose={() => {
          setIsMultiRunnerOpen(false);
          setActiveResumeRun(null);
        }}
        initialRun={activeResumeRun}
        currentProject={runnerTargetProject || project}
        allProjects={allProjects}
        allFeatures={allFeatures}
        currentFeature={feature}
        onChartersUpdated={(updatedCharters) => {
          if (feature) {
            const featCharters = updatedCharters.filter(c => c.feature_id === feature.id);
            if (featCharters.length > 0) {
              setCharters(featCharters);
            }
          }
        }}
        onRefreshData={async () => {
          await refreshFeatureCharters();
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
