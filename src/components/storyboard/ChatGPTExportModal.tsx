'use client';

import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  ExternalLink, 
  Bot, 
  Layers, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { StoryboardScreen, StoryboardExecutiveContext } from '@/lib/types';
import { 
  buildCompleteChatGptPromptPack, 
  buildSplitChatGptPromptPack 
} from '@/lib/storyboard/chatgptPromptPackGenerator';

interface ChatGPTExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowTitle: string;
  screens: StoryboardScreen[];
  executiveContext?: StoryboardExecutiveContext;
}

export function ChatGPTExportModal({
  isOpen,
  onClose,
  flowTitle,
  screens,
  executiveContext
}: ChatGPTExportModalProps) {
  const [copiedMode, setCopiedMode] = useState<'all' | 'part1' | 'part2' | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'split'>('all');

  if (!isOpen) return null;

  const completePack = buildCompleteChatGptPromptPack(flowTitle, screens, executiveContext);
  const { part1, part2, totalCharters, splitPoint } = buildSplitChatGptPromptPack(flowTitle, screens, executiveContext);
  const totalScreens = screens.length;
  const pad2 = (num: number) => String(num).padStart(2, '0');
  const isSingleTurnReady = totalCharters <= 18;

  const handleCopy = async (text: string, mode: 'all' | 'part1' | 'part2') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode(null), 2500);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  const handleDownloadMd = () => {
    const blob = new Blob([completePack], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(flowTitle || 'storyboard').toLowerCase().replace(/\s+/g, '-')}-chatgpt-prompt-pack.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#1D1E1C] text-white rounded-[28px] sm:rounded-[32px] border border-[#323531] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2C2E2A] flex items-center justify-between gap-3 bg-[#1D1E1C] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#10A37F] text-white flex items-center justify-center font-bold text-xs shadow-md shadow-[#10A37F]/30 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white">
                  ChatGPT Senior QA Prompt Pack
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F2F52A]/15 text-[#F2F52A] border border-[#F2F52A]/30">
                  {totalCharters} CHARTERS (ADAPTIVE)
                </span>
              </div>
              <p className="text-[11px] text-[#8F9489]">
                Ready-to-paste bundle coupling your {totalScreens}-screen evidence index with the Senior QA exploratory testing prompt.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#282A27] text-[#8F9489] hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 py-2.5 bg-[#242622] border-b border-[#2C2E2A] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#1D1E1C] p-1 rounded-full border border-[#323531]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#F2F52A] text-[#1D1E1C] shadow-sm'
                  : 'text-[#8F9489] hover:text-white'
              }`}
            >
              Complete Pack (All-in-One)
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-[#F2F52A] text-[#1D1E1C] shadow-sm'
                  : 'text-[#8F9489] hover:text-white'
              }`}
            >
              2-Part Split (Recommended for ChatGPT Web)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadMd}
              className="px-3 py-1.5 rounded-full bg-[#282A27] hover:bg-[#343733] text-xs font-semibold text-white border border-[#3B3E39] flex items-center gap-1.5 transition cursor-pointer"
              title="Download as Markdown file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download .md</span>
            </button>

            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full bg-[#10A37F] hover:bg-[#1A7F64] text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-[#10A37F]/30"
            >
              <span>Open ChatGPT</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Helpful Tip */}
          <div className="p-3 rounded-xl bg-[#282A27]/80 border border-[#3B3E39] flex items-start gap-2.5 text-xs text-[#D6D8D2]">
            <AlertCircle className="w-4 h-4 text-[#F2F52A] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Adaptive Charter Sizing: </span>
              {isSingleTurnReady ? (
                <span>
                  This feature has {totalScreens} screens ({totalCharters} exploratory charters total). It is lean enough to generate in a <strong>single turn</strong> without splitting! You can copy the Complete Pack directly, or use the 2-Part Split if you prefer staged review.
                </span>
              ) : (
                <span>
                  A full {totalCharters}-charter suite with &ge;6 scenarios each requires substantial output tokens. Using the <strong>2-Part Split</strong> guarantees ChatGPT outputs all {totalCharters} charters at maximum depth without truncation!
                </span>
              )}
            </div>
          </div>

          {activeTab === 'all' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Full Prompt Pack Preview ({completePack.length.toLocaleString()} characters)
                </span>
                <button
                  onClick={() => handleCopy(completePack, 'all')}
                  className="px-4 py-2 rounded-full bg-[#F2F52A] hover:bg-[#FAFCA5] active:scale-95 text-[#1D1E1C] font-extrabold text-xs flex items-center gap-1.5 transition shadow-md shadow-[#F2F52A]/20 cursor-pointer"
                >
                  {copiedMode === 'all' ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 stroke-[2.5]" />
                      <span>Copy Complete Pack</span>
                    </>
                  )}
                </button>
              </div>

              <div className="h-96 rounded-2xl bg-black border border-[#323531] p-3 overflow-y-auto font-mono text-[11px] text-[#A6AAA0] leading-relaxed select-all">
                <pre className="whitespace-pre-wrap">{completePack}</pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Part 1 Box */}
              <div className="p-4 rounded-2xl bg-[#242622] border border-[#323531] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#F2F52A] text-[#1D1E1C] font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <span className="font-bold text-xs text-white">
                      Part 1: Context, Journey & Charters 01 through {pad2(splitPoint)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(part1, 'part1')}
                    className="px-3.5 py-1.5 rounded-full bg-[#F2F52A] hover:bg-[#FAFCA5] active:scale-95 text-[#1D1E1C] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedMode === 'part1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMode === 'part1' ? 'Copied Part 1!' : 'Copy Part 1'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#8F9489]">
                  Paste this into ChatGPT first. ChatGPT will analyze your {totalScreens} screens and generate Charters 01 to {pad2(splitPoint)}, then stop.
                </p>
                <div className="h-36 rounded-xl bg-black/70 border border-[#323531] p-2.5 overflow-y-auto font-mono text-[10px] text-[#8F9489]">
                  <pre className="whitespace-pre-wrap">{part1.slice(0, 1500)}...</pre>
                </div>
              </div>

              {/* Part 2 Box */}
              <div className="p-4 rounded-2xl bg-[#242622] border border-[#323531] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#10A37F] text-white font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <span className="font-bold text-xs text-white">
                      Part 2: Charters {pad2(splitPoint + 1)} through {pad2(totalCharters)}, Cross-Cutting & Coverage
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(part2, 'part2')}
                    className="px-3.5 py-1.5 rounded-full bg-[#282A27] hover:bg-[#343733] text-white border border-[#3B3E39] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedMode === 'part2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMode === 'part2' ? 'Copied Part 2!' : 'Copy Part 2'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#8F9489]">
                  After ChatGPT finishes Part 1, send this Part 2 follow-up prompt to get the remaining Charters {pad2(splitPoint + 1)} through {pad2(totalCharters)} and coverage matrix.
                </p>
                <div className="h-28 rounded-xl bg-black/70 border border-[#323531] p-2.5 overflow-y-auto font-mono text-[10px] text-[#8F9489]">
                  <pre className="whitespace-pre-wrap">{part2}</pre>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2C2E2A] flex items-center justify-between gap-3 bg-[#1D1E1C] shrink-0">
          <span className="text-[11px] text-[#8F9489]">
            Compatible with ChatGPT Plus, ChatGPT Free (GPT-4o), and Custom GPTs.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[#282A27] hover:bg-[#343733] text-xs font-semibold text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
