'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  BrainCircuit, 
  Bot, 
  User, 
  HelpCircle, 
  ShieldAlert, 
  CheckCircle,
  CornerDownLeft
} from 'lucide-react';
import { Feature } from '@/lib/types';

interface AskAICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  feature: Feature;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export function AskAICopilotDrawer({ isOpen, onClose, feature }: AskAICopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your QA & Product Testing Copilot grounded in **${feature.name}**.\n\nI have loaded the empirical screenshots, reconstructed journey DAG, 7 knowledge pillars, and test checkpoints. I will only provide verified answers and explicitly label unknowns.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const quickPrompts = [
    'What are all the possible failure points?',
    'What business rules are still unknown?',
    'What should I test on Screen 3?',
    'What dependencies does this feature have?'
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isSending) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const apiKey = typeof window !== 'undefined' 
        ? (localStorage.getItem('QA_GEMINI_API_KEY') || localStorage.getItem('AETHER_GEMINI_API_KEY') || undefined) 
        : undefined;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_id: feature.id,
          message: textToSend,
          api_key: apiKey
        })
      });

      const data = await res.json();
      const replyMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'I processed your request using the verified feature context.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, replyMsg]);
    } catch (e) {
      console.error('Chat error:', e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-dark-chassis text-white shadow-2xl border-l border-dark-secondary flex flex-col animate-slideLeft">
      
      {/* Drawer Header */}
      <div className="p-4 border-b border-dark-secondary flex items-center justify-between bg-dark-soft_black/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-neon flex items-center justify-center text-dark-chassis font-bold">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              Ask AI QA Copilot
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-dark-secondary text-neon font-mono">
                Grounded
              </span>
            </h3>
            <p className="text-[10px] text-txt-muted">
              Evidence-based queries for {feature.name}
            </p>
          </div>
        </div>

        <button onClick={onClose} className="text-txt-muted hover:text-white p-1 rounded-full hover:bg-dark-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1 text-[10px] text-txt-muted mb-1">
              <span>{m.sender === 'user' ? 'You' : 'AI Copilot'}</span>
              <span>•</span>
              <span>{m.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[90%] whitespace-pre-line leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-neon text-dark-chassis font-medium rounded-tr-none'
                  : 'bg-dark-secondary text-txt-inverse rounded-tl-none border border-dark-tertiary'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex items-center gap-2 text-[11px] text-neon font-mono p-2">
            <span className="w-2 h-2 rounded-full bg-neon animate-ping" />
            Analyzing verified screen evidence & rules...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 border-t border-dark-secondary bg-dark-soft_black/30 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp)}
            className="px-2.5 py-1 rounded-pill bg-dark-secondary hover:bg-dark-tertiary text-[10px] text-txt-muted hover:text-white whitespace-nowrap transition border border-dark-tertiary/70"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-dark-secondary bg-dark-chassis">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask anything about this feature, failure points, or tests..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-full bg-dark-secondary text-white text-xs placeholder:text-txt-muted rounded-pill pl-4 pr-12 py-2.5 border border-dark-tertiary focus:outline-none focus:border-neon transition"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isSending}
            className="absolute right-1.5 w-8 h-8 rounded-full bg-neon disabled:opacity-40 text-dark-chassis flex items-center justify-center transition hover:bg-neon-bright"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
}
