'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Trash2, 
  Copy, 
  MoveUp, 
  MoveDown, 
  BrainCircuit, 
  Check, 
  Smartphone, 
  ShieldAlert, 
  Plus, 
  Sliders,
  Image as ImageIcon,
  ChevronDown,
  Folder,
  Camera,
  Video
} from 'lucide-react';
import { PlatformType, UserRole, AdvancedFeatureContext } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { getStoredGeminiApiKey } from '@/lib/settings';
import { LiveScreenCaptureModal } from '@/components/capture/LiveScreenCaptureModal';

interface FeatureWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeatureCreated: (featureId: string) => void;
  defaultProjectId?: string;
}

interface UploadedScreen {
  id: string;
  file?: File;
  previewUrl: string;
  name: string;
  userAction: string;
  expectedBehavior: string;
}

interface ProjectOption {
  id: string;
  name: string;
  platform: PlatformType;
  description?: string;
}

export function FeatureWizardModal({ isOpen, onClose, onFeatureCreated, defaultProjectId }: FeatureWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing Products in Database
  const [existingProjects, setExistingProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Step 1: Feature Context
  const [featureName, setFeatureName] = useState('');
  const [application, setApplication] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('Web');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [userTypes, setUserTypes] = useState<UserRole[]>(['Customer']);
  const [startingPoint, setStartingPoint] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  // Step 2: Advanced Context
  const [advancedContext, setAdvancedContext] = useState<AdvancedFeatureContext>({
    known_business_rules: '',
    known_limitations: '',
    known_dependencies: '',
    known_apis: '',
    known_notifications: '',
    known_permissions: '',
    known_edge_cases: ''
  });

  // Step 3 & 4: Uploaded Screens (Clean user-uploaded screens only)
  const [screens, setScreens] = useState<UploadedScreen[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLiveCaptureOpen, setIsLiveCaptureOpen] = useState(false);

  // Step 5: Execution Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');

  // Load existing products on modal open
  useEffect(() => {
    if (!isOpen) return;
    const fetchExistingProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const { data, error } = await supabase
          .from('qa_projects')
          .select('id, name, platform, description')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          // Deduplicate projects by case-insensitive trimmed name
          const uniqueProjects: ProjectOption[] = [];
          const seenNames = new Set<string>();
          for (const p of data as ProjectOption[]) {
            const norm = p.name.trim().toLowerCase();
            if (!seenNames.has(norm)) {
              seenNames.add(norm);
              uniqueProjects.push(p);
            }
          }
          setExistingProjects(uniqueProjects);

          // Target project: prioritize defaultProjectId if specified and exists
          const targetProj = (defaultProjectId && defaultProjectId !== 'all' && uniqueProjects.find(p => p.id === defaultProjectId))
            || uniqueProjects.find(p => p.id === selectedProjectId)
            || uniqueProjects[0];

          if (targetProj) {
            setSelectedProjectId(targetProj.id);
            setApplication(targetProj.name);
            if (targetProj.platform) {
              setPlatform(targetProj.platform as PlatformType);
            }
            setIsCreatingNewProduct(false);
          }
        } else {
          setExistingProjects([]);
          setSelectedProjectId('new');
          setIsCreatingNewProduct(true);
        }
      } catch (err) {
        console.error('Failed to load projects in wizard:', err);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchExistingProjects();
  }, [isOpen]);

  // Handle clipboard paste (Ctrl+V / Cmd+V) for screenshots when on Step 3
  useEffect(() => {
    if (!isOpen || step !== 3) return;
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const imageFiles: File[] = [];
      items.forEach((item) => {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
            const renamed = new File([file], `Pasted-Screen-${timeStr}.png`, { type: file.type });
            imageFiles.push(renamed);
          }
        }
      });
      if (imageFiles.length > 0) {
        e.preventDefault();
        handleFileUpload(imageFiles);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, step, screens.length]);

  if (!isOpen) return null;

  const platforms: PlatformType[] = ['Android', 'iOS', 'Web', 'Mobile Web', 'Other'];
  const allUserRoles: UserRole[] = ['Customer', 'Merchant', 'Rider', 'Admin', 'Staff', 'Guest', 'Other'];

  const toggleUserType = (role: UserRole) => {
    if (userTypes.includes(role)) {
      if (userTypes.length > 1) setUserTypes(userTypes.filter(r => r !== role));
    } else {
      setUserTypes([...userTypes, role]);
    }
  };

  const handleFileUpload = (files: FileList | File[] | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    const validImages = fileArray.filter(f => f.type.startsWith('image/'));
    if (validImages.length === 0) return;
    const newItems: UploadedScreen[] = [];
    validImages.forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const isRaw = /^(screenshot|img|image|screen)[\s_-]?\d*/i.test(rawName) || /\d{8}/.test(rawName);
      const initialName = isRaw ? `Step ${screens.length + idx + 1}: Screen View` : rawName;

      newItems.push({
        id: `upload-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl: url,
        name: initialName,
        userAction: `User interacts with Step ${screens.length + idx + 1}`,
        expectedBehavior: 'System validates input and advances'
      });
    });
    setScreens(prev => [...prev, ...newItems]);
  };

  const moveScreen = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === screens.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const next = [...screens];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setScreens(next);
  };

  const deleteScreen = (index: number) => {
    setScreens(screens.filter((_, i) => i !== index));
  };

  const duplicateScreen = (index: number) => {
    const item = screens[index];
    const clone = { ...item, id: `clone-${Date.now()}`, name: `${item.name} (Copy)` };
    const next = [...screens];
    next.splice(index + 1, 0, clone);
    setScreens(next);
  };

  // Final submit & pipeline execution
  const executePipeline = async () => {
    setIsProcessing(true);
    try {
      setProcessingStage('1/5 Initializing Project and Feature in Supabase...');

      // 1. Get or create project
      let projectId = '';
      if (!isCreatingNewProduct && selectedProjectId && selectedProjectId !== 'new') {
        projectId = selectedProjectId;
      } else {
        const { data: existingProjectsList } = await supabase
          .from('qa_projects')
          .select('id')
          .ilike('name', application.trim())
          .limit(1);

        if (existingProjectsList && existingProjectsList.length > 0) {
          projectId = existingProjectsList[0].id;
        } else {
          const { data: newProj, error: pErr } = await supabase
            .from('qa_projects')
            .insert({ name: application.trim(), platform, description: `${application.trim()} Product Workspace` })
            .select('id')
            .single();
          if (pErr) throw pErr;
          projectId = newProj.id;
        }
      }

      // 2. Create feature
      const { data: newFeature, error: fErr } = await supabase
        .from('qa_features')
        .insert({
          project_id: projectId,
          name: featureName,
          description,
          purpose,
          user_types: userTypes,
          entry_point: startingPoint,
          expected_outcome: expectedOutcome,
          context: additionalContext,
          advanced_context: advancedContext,
          status: 'analyzing',
          version: '1.0'
        })
        .select('id')
        .single();

      if (fErr) throw fErr;
      const featureId = newFeature.id;

      // 3. Upload & Insert Screens
      setProcessingStage(`2/5 Storing ${screens.length} screenshots in Supabase Storage...`);
      for (let i = 0; i < screens.length; i++) {
        const scr = screens[i];
        let finalImageUrl = scr.previewUrl;
        let storagePath: string | null = null;

        if (scr.file) {
          const fileExt = scr.file.name.split('.').pop() || 'png';
          const filePath = `${featureId}/screen-${i + 1}-${Date.now()}.${fileExt}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('qa_screenshots')
            .upload(filePath, scr.file, {
              cacheControl: '3600',
              upsert: true
            });

          if (!uploadErr && uploadData) {
            storagePath = uploadData.path;
            const { data: publicUrlData } = supabase.storage
              .from('qa_screenshots')
              .getPublicUrl(uploadData.path);
            if (publicUrlData?.publicUrl) {
              finalImageUrl = publicUrlData.publicUrl;
            }
          } else if (uploadErr) {
            console.warn('Supabase storage upload error:', uploadErr);
          }
        }

        await supabase.from('qa_screens').insert({
          feature_id: featureId,
          screen_number: i + 1,
          name: scr.name,
          image_url: finalImageUrl,
          storage_path: storagePath,
          user_action: scr.userAction,
          expected_behavior: scr.expectedBehavior,
          state: i === screens.length - 1 ? 'success' : i === screens.length - 2 ? 'authentication' : 'normal'
        });
      }

      // Read API Key if configured in Settings
      const apiKey = getStoredGeminiApiKey();

      // 4. Trigger AI Auto-Naming for Screenshots
      setProcessingStage('2/6 AI Analyzing Screenshots & Generating Semantic Titles...');
      await fetch('/api/screens/auto-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: featureId, api_key: apiKey, force_all: true })
      });

      // 5. Trigger AI Journey DAG Generation
      setProcessingStage('3/6 Reconstructing Visual User Journey DAG & Decision Nodes...');
      await fetch('/api/journey/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: featureId })
      });

      // 6. Trigger 7-Pillar Knowledge Generation
      setProcessingStage('4/6 Synthesizing 7 Core Knowledge Pillars with Anti-Hallucination Confidence...');
      await fetch('/api/knowledge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: featureId })
      });

      // 7. Trigger QA Checkpoint Generation
      setProcessingStage('5/6 Generating QA Field, Navigation and Failure Checkpoints...');
      await fetch('/api/qa/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: featureId })
      });

      // 8. Trigger Exploratory Testing (ET) Charters Generation
      setProcessingStage('6/6 Synthesizing Exploratory Testing (ET) Charters...');
      await fetch('/api/charters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: featureId, api_key: apiKey })
      });

      // Update feature status
      await supabase.from('qa_features').update({ status: 'documented' }).eq('id', featureId);

      onFeatureCreated(featureId);
      onClose();
    } catch (err: any) {
      console.error('Pipeline error:', err);
      alert('Error initializing feature: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Modal Chassis */}
      <div className="w-full max-w-4xl bg-clinical-surface rounded-[28px] border border-clinical-border shadow-modal overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-dark-chassis text-white flex items-center justify-between border-b border-dark-secondary">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neon animate-pulse" />
            <h2 className="font-semibold text-sm tracking-tight text-white">
              Feature Setup Wizard <span className="text-neon">//</span> Step {step} of 5
            </h2>
          </div>
          <button onClick={onClose} className="text-txt-muted hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Step Progress Tracker */}
        <div className="px-6 py-3 bg-clinical-warm border-b border-clinical-border flex items-center justify-between text-xs">
          {[
            { s: 1, label: 'Feature Context' },
            { s: 2, label: 'Advanced Rules' },
            { s: 3, label: 'Upload Screens' },
            { s: 4, label: 'Sequence Ordering' },
            { s: 5, label: 'AI Synthesis' }
          ].map((item) => (
            <div 
              key={item.s} 
              className={`flex items-center gap-1.5 font-medium cursor-pointer transition ${
                step === item.s 
                  ? 'text-dark-chassis font-bold' 
                  : step > item.s 
                  ? 'text-status-positive' 
                  : 'text-txt-muted'
              }`}
              onClick={() => !isProcessing && setStep(item.s as any)}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === item.s 
                  ? 'bg-dark-chassis text-neon font-bold' 
                  : step > item.s 
                  ? 'bg-status-positive text-white' 
                  : 'bg-clinical-border text-txt-muted'
              }`}>
                {step > item.s ? <Check className="w-3 h-3" /> : item.s}
              </div>
              <span className="hidden sm:inline">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Wizard Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 text-txt-primary space-y-6">
          
          {/* STEP 1: Feature Context */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base font-semibold text-dark-chassis">Step 1 — Feature Context</h3>
                <p className="text-xs text-txt-secondary">
                  Provide foundational context before uploading screenshots. The AI uses this context to ground all observations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-dark-chassis mb-1">
                    Feature Name <span className="text-status-critical">*</span>
                  </label>
                  <input
                    type="text"
                    value={featureName}
                    onChange={(e) => setFeatureName(e.target.value)}
                    placeholder="e.g. Send Money"
                    className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-sm focus:outline-none focus:border-dark-chassis"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-dark-chassis">
                      Product / Application <span className="text-status-critical">*</span>
                    </label>
                    {existingProjects.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isCreatingNewProduct) {
                            setIsCreatingNewProduct(false);
                            const proj = existingProjects.find(p => p.id === selectedProjectId) || existingProjects[0];
                            setSelectedProjectId(proj.id);
                            setApplication(proj.name);
                            if (proj.platform) setPlatform(proj.platform as PlatformType);
                          } else {
                            setIsCreatingNewProduct(true);
                            setSelectedProjectId('new');
                            setApplication('');
                          }
                        }}
                        className="text-[11px] font-semibold text-txt-secondary hover:text-dark-chassis transition underline cursor-pointer"
                      >
                        {isCreatingNewProduct ? '← Select existing' : '+ Add new'}
                      </button>
                    )}
                  </div>

                  {!isCreatingNewProduct && existingProjects.length > 0 ? (
                    <div className="relative">
                      <select
                        value={selectedProjectId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'new') {
                            setIsCreatingNewProduct(true);
                            setSelectedProjectId('new');
                            setApplication('');
                          } else {
                            setSelectedProjectId(val);
                            const proj = existingProjects.find(p => p.id === val);
                            if (proj) {
                              setApplication(proj.name);
                              if (proj.platform) setPlatform(proj.platform as PlatformType);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-sm font-medium text-dark-chassis focus:outline-none focus:border-dark-chassis appearance-none cursor-pointer pr-8"
                      >
                        {existingProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.platform || 'General'})
                          </option>
                        ))}
                        <option value="new">+ Add New Product / Application...</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-txt-muted">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={application}
                        onChange={(e) => setApplication(e.target.value)}
                        placeholder="e.g. Hubtel, Driver App, Merchant Portal"
                        className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-sm focus:outline-none focus:border-dark-chassis"
                        autoFocus={isCreatingNewProduct && existingProjects.length > 0}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-chassis mb-1">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition ${
                        platform === p 
                          ? 'bg-dark-chassis text-white border-dark-chassis' 
                          : 'bg-clinical-white text-txt-secondary border-clinical-border hover:bg-clinical-warm'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-chassis mb-1">
                  Feature Description <span className="text-status-critical">*</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe what this feature does..."
                  className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-sm focus:outline-none focus:border-dark-chassis"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-chassis mb-1">Primary Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="What is the primary purpose of this feature?"
                  className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-sm focus:outline-none focus:border-dark-chassis"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-chassis mb-1">User Types (Multi-select)</label>
                <div className="flex flex-wrap gap-2">
                  {allUserRoles.map(role => {
                    const isSelected = userTypes.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleUserType(role)}
                        className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-neon text-dark-chassis border-neon font-semibold'
                            : 'bg-clinical-white text-txt-secondary border-clinical-border hover:bg-clinical-warm'
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-dark-chassis mb-1">Starting Point</label>
                  <input
                    type="text"
                    value={startingPoint}
                    onChange={(e) => setStartingPoint(e.target.value)}
                    placeholder="e.g. Home → Payments → Send Money"
                    className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-sm focus:outline-none focus:border-dark-chassis"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-chassis mb-1">Expected Outcome</label>
                  <input
                    type="text"
                    value={expectedOutcome}
                    onChange={(e) => setExpectedOutcome(e.target.value)}
                    placeholder="e.g. Transaction settled with receipt ID"
                    className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-sm focus:outline-none focus:border-dark-chassis"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-chassis mb-1">Additional Context (Optional)</label>
                <textarea
                  rows={2}
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Provide anything the AI should know before analyzing the screenshots..."
                  className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-sm focus:outline-none focus:border-dark-chassis"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Advanced Context */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base font-semibold text-dark-chassis">Step 2 — Optional Advanced Context</h3>
                <p className="text-xs text-txt-secondary">
                  Provide known requirements, integrations, or constraints. The AI strictly distinguishes user-provided facts from inferred assumptions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-dark-chassis mb-1">Known Business Rules</label>
                  <textarea
                    rows={2}
                    value={advancedContext.known_business_rules || ''}
                    onChange={(e) => setAdvancedContext({ ...advancedContext, known_business_rules: e.target.value })}
                    placeholder="e.g. Max 3 transfers per day; zero duplicate submissions within 60s"
                    className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-chassis mb-1">Known Limitations</label>
                  <textarea
                    rows={2}
                    value={advancedContext.known_limitations || ''}
                    onChange={(e) => setAdvancedContext({ ...advancedContext, known_limitations: e.target.value })}
                    placeholder="e.g. Not supported in offline mode; minimum balance GHS 5 required"
                    className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-chassis mb-1">Known APIs & Services</label>
                  <textarea
                    rows={2}
                    value={advancedContext.known_apis || ''}
                    onChange={(e) => setAdvancedContext({ ...advancedContext, known_apis: e.target.value })}
                    placeholder="e.g. Core Ledger API, Telco Money Gateway"
                    className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-chassis mb-1">Known Notifications</label>
                  <textarea
                    rows={2}
                    value={advancedContext.known_notifications || ''}
                    onChange={(e) => setAdvancedContext({ ...advancedContext, known_notifications: e.target.value })}
                    placeholder="e.g. Immediate SMS receipt dispatch, In-app push alert"
                    className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-chassis mb-1">Known Permissions & Security</label>
                  <textarea
                    rows={2}
                    value={advancedContext.known_permissions || ''}
                    onChange={(e) => setAdvancedContext({ ...advancedContext, known_permissions: e.target.value })}
                    placeholder="e.g. Requires 4-digit transaction PIN, KYC Tier-2 verified"
                    className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-chassis mb-1">Known Edge Cases</label>
                  <textarea
                    rows={2}
                    value={advancedContext.known_edge_cases || ''}
                    onChange={(e) => setAdvancedContext({ ...advancedContext, known_edge_cases: e.target.value })}
                    placeholder="e.g. Network drops right after PIN entry"
                    className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Screenshot Upload */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base font-semibold text-dark-chassis">Step 3 — Screenshot Upload</h3>
                <p className="text-xs text-txt-secondary">
                  Capture live screens from your iOS Simulator, Android Emulator, or Web App, or upload existing screenshot files.
                </p>
              </div>

              {/* Live Screen Share & Capture Banner */}
              <div className="p-4 sm:p-5 rounded-[22px] bg-dark-chassis text-white border border-dark-secondary shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-neon/15 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-3.5 z-10 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold shrink-0 shadow-sm shadow-neon/30">
                    <Video className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">Live Screen Share & Simulator Capture</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neon/20 text-neon border border-neon/30">
                        Zero Install • iOS & Android
                      </span>
                    </div>
                    <p className="text-xs text-txt-muted truncate sm:whitespace-normal">
                      Share your iOS Simulator, Android Studio AVD, or Web App window to snap screens directly into the flow.
                    </p>
                  </div>
                </div>

                <div className="z-10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsLiveCaptureOpen(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow-sm shadow-neon/40 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 stroke-[2.5]" />
                    <span>Start Screen Capture</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-clinical-border" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-txt-muted font-semibold">
                  Or Upload / Paste Files
                </span>
                <div className="flex-1 h-px bg-clinical-border" />
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files);
                  }
                }}
                className={`border-2 border-dashed rounded-[20px] p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-dark-chassis bg-clinical-warm ring-2 ring-neon scale-[1.01]'
                    : 'border-clinical-border hover:border-dark-chassis bg-clinical-white/60 hover:bg-clinical-white'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  isDragging ? 'bg-neon text-dark-chassis animate-bounce' : 'bg-clinical-warm text-dark-chassis'
                }`}>
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-medium text-sm text-dark-chassis">
                  {isDragging ? 'Drop screenshots here now' : 'Click to select screenshots or drag and drop here'}
                </div>
                <p className="text-xs text-txt-muted">
                  Supports PNG, JPG, JPEG, WEBP • Multiple selection & Clipboard paste (Cmd+V / Ctrl+V) supported
                </p>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>

              {/* Uploaded Cards Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-dark-chassis">
                  <span>Uploaded Screenshots ({screens.length})</span>
                  <span className="text-txt-muted">Drag to reorder in next step</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {screens.map((scr, idx) => (
                    <div key={scr.id} className="bg-clinical-white p-2 rounded-2xl border border-clinical-border shadow-subtle flex flex-col gap-2 relative group">
                      <div className="aspect-[9/16] bg-clinical-warm rounded-xl overflow-hidden relative border border-clinical-border/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={scr.previewUrl} alt={scr.name} className="w-full h-full object-cover" />
                        <span className="absolute top-1.5 left-1.5 bg-dark-chassis/80 backdrop-blur-sm text-neon font-mono text-[10px] px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="text-center">
                        <input
                          type="text"
                          value={scr.name}
                          onChange={(e) => {
                            const next = [...screens];
                            next[idx].name = e.target.value;
                            setScreens(next);
                          }}
                          className="w-full text-center text-xs font-medium text-dark-chassis bg-transparent border-b border-transparent hover:border-clinical-border focus:border-dark-chassis focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => deleteScreen(idx)}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-status-critical text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Screen Ordering & Actions */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base font-semibold text-dark-chassis">Step 4 — Screen Ordering & Transition Actions</h3>
                <p className="text-xs text-txt-secondary">
                  The system never assumes upload order is final. Review the exact sequence, assign user transition actions, and adjust ordering.
                </p>
              </div>

              <div className="space-y-3">
                {screens.length === 0 ? (
                  <div className="p-8 bg-clinical-white rounded-2xl border border-clinical-border text-center space-y-3">
                    <ImageIcon className="w-8 h-8 text-txt-muted mx-auto opacity-40" />
                    <p className="text-sm font-bold text-dark-chassis">No Screenshots Uploaded</p>
                    <p className="text-xs text-txt-secondary">
                      Please go back to Step 3 and upload at least one screenshot for this journey.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-4 py-2 rounded-pill bg-dark-chassis text-white text-xs font-semibold hover:bg-dark-secondary transition"
                    >
                      Go to Step 3 (Upload)
                    </button>
                  </div>
                ) : (
                  screens.map((scr, idx) => (
                  <div key={scr.id} className="p-3 bg-clinical-white rounded-2xl border border-clinical-border shadow-subtle flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    
                    {/* Screen Thumbnail */}
                    <div className="w-14 h-20 rounded-xl bg-clinical-warm overflow-hidden border border-clinical-border flex-shrink-0 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={scr.previewUrl} alt={scr.name} className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-dark-chassis text-neon text-[9px] px-1 py-0.2 rounded font-mono">
                        #{idx + 1}
                      </div>
                    </div>

                    {/* Details Inputs */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full text-xs">
                      <div>
                        <label className="text-[10px] font-semibold text-txt-secondary block">Screen Name</label>
                        <input
                          type="text"
                          value={scr.name}
                          onChange={(e) => {
                            const next = [...screens];
                            next[idx].name = e.target.value;
                            setScreens(next);
                          }}
                          className="w-full px-2.5 py-1.5 bg-clinical-warm border border-clinical-border rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-txt-secondary block">User Action on Screen</label>
                        <input
                          type="text"
                          value={scr.userAction}
                          onChange={(e) => {
                            const next = [...screens];
                            next[idx].userAction = e.target.value;
                            setScreens(next);
                          }}
                          placeholder="e.g. User taps 'Continue'"
                          className="w-full px-2.5 py-1.5 bg-clinical-warm border border-clinical-border rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-txt-secondary block">Expected Behavior / System Response</label>
                        <input
                          type="text"
                          value={scr.expectedBehavior}
                          onChange={(e) => {
                            const next = [...screens];
                            next[idx].expectedBehavior = e.target.value;
                            setScreens(next);
                          }}
                          placeholder="e.g. System validates amount and advances"
                          className="w-full px-2.5 py-1.5 bg-clinical-warm border border-clinical-border rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* Reorder Buttons */}
                    <div className="flex sm:flex-col items-center gap-1">
                      <button
                        onClick={() => moveScreen(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded bg-clinical-warm hover:bg-clinical-border disabled:opacity-30 text-dark-chassis"
                        title="Move Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveScreen(idx, 'down')}
                        disabled={idx === screens.length - 1}
                        className="p-1 rounded bg-clinical-warm hover:bg-clinical-border disabled:opacity-30 text-dark-chassis"
                        title="Move Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => duplicateScreen(idx)}
                        className="p-1 rounded bg-clinical-warm hover:bg-clinical-border text-dark-chassis"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteScreen(idx)}
                        className="p-1 rounded bg-clinical-warm hover:bg-status-critical hover:text-white text-txt-muted"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          )}

          {/* STEP 5: AI Synthesis Review & Execution */}
          {step === 5 && (
            <div className="space-y-6 text-center py-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-neon/20 border-2 border-neon flex items-center justify-center mx-auto text-dark-chassis">
                <BrainCircuit className="w-8 h-8 text-dark-chassis" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-dark-chassis">Ready to Generate Feature Intelligence</h3>
                <p className="text-xs text-txt-secondary max-w-md mx-auto mt-1">
                  The system will analyze all {screens.length} screens, construct the complete User Journey DAG, extract the 7 core knowledge categories, and generate test checkpoints.
                </p>
              </div>

              <div className="max-w-md mx-auto bg-clinical-white p-4 rounded-2xl border border-clinical-border text-left text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-clinical-border">
                  <span className="text-txt-muted">Feature Name:</span>
                  <span className="font-semibold text-dark-chassis">{featureName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-clinical-border">
                  <span className="text-txt-muted">Application & Platform:</span>
                  <span className="font-semibold text-dark-chassis">{application} ({platform})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-clinical-border">
                  <span className="text-txt-muted">Ordered Screens:</span>
                  <span className="font-semibold text-dark-chassis">{screens.length} screens in sequence</span>
                </div>
                <div className="flex justify-between py-1 border-b border-clinical-border">
                  <span className="text-txt-muted">User Roles:</span>
                  <span className="font-semibold text-dark-chassis">{userTypes.join(', ')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-txt-muted">Anti-Hallucination:</span>
                  <span className="font-semibold text-status-positive">Active (CONFIRMED / INFERRED / UNKNOWN)</span>
                </div>
              </div>

              {isProcessing && (
                <div className="max-w-md mx-auto p-4 bg-dark-chassis text-white rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-neon animate-ping" />
                    <span className="text-xs font-mono text-neon">{processingStage}</span>
                  </div>
                  <div className="w-full bg-dark-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-neon h-full w-3/4 animate-pulse rounded-full" />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-clinical-warm border-t border-clinical-border flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((Math.max(1, step - 1)) as any)}
            disabled={step === 1 || isProcessing}
            className="px-4 py-2 rounded-pill text-xs font-medium border border-clinical-border bg-clinical-white text-dark-chassis hover:bg-clinical-surface disabled:opacity-40 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((Math.min(5, step + 1)) as any)}
                disabled={
                  (step === 1 && (!featureName.trim() || !application.trim() || !description.trim())) ||
                  (step === 3 && screens.length === 0) ||
                  (step === 4 && screens.length === 0)
                }
                className="px-5 py-2 rounded-pill text-xs font-semibold bg-dark-chassis text-white hover:bg-dark-secondary disabled:opacity-40 flex items-center gap-1.5 transition shadow-sm"
              >
                Next Step
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={executePipeline}
                disabled={isProcessing || screens.length === 0 || !featureName.trim()}
                className="px-6 py-2.5 rounded-pill text-xs font-bold bg-neon hover:bg-neon-bright text-dark-chassis flex items-center gap-2 transition shadow-md disabled:opacity-50"
              >
                <BrainCircuit className="w-4 h-4" />
                {isProcessing ? 'Synthesizing...' : 'Analyze & Generate Feature'}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Live Screen Capture Studio Modal */}
      <LiveScreenCaptureModal
        isOpen={isLiveCaptureOpen}
        onClose={() => setIsLiveCaptureOpen(false)}
        onScreensCaptured={(captured) => {
          const files = captured.map((c) => c.file);
          handleFileUpload(files);
          setIsLiveCaptureOpen(false);
        }}
        title={`Live Capture — ${featureName.trim() || 'New Feature'}`}
        description="Share your iOS Simulator, Android Studio AVD, or Web App window to snap screens into this flow."
      />
    </div>
  );
}
