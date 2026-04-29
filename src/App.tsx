import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  ShieldAlert, 
  Activity, 
  Lock, 
  Cpu, 
  MessageSquare, 
  Settings, 
  Eye, 
  Mic, 
  Send,
  Wifi,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Menu,
  ChevronRight
} from 'lucide-react';
import { jarvisBrain, RiskLevel, ActionType, type AIResponse, type AIAction } from './services/aiService';
import { cn } from './lib/utils';
import ReactMarkdown from 'react-markdown';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'jarvis';
  content: string;
  timestamp: Date;
  risk?: AIResponse;
}

interface Permission {
  id: string;
  name: string;
  enabled: boolean;
  icon: React.ReactNode;
}

// --- Components ---

const StatusBadge = ({ level }: { level: RiskLevel | 'online' }) => {
  const styles = {
    low: "text-[#10b981] bg-[#10b9811a] border-[#10b98133]",
    medium: "text-[#f59e0b] bg-[#f59e0b1a] border-[#f59e0b33]",
    high: "text-[#ef4444] bg-[#ef44441a] border-[#ef444433]",
    online: "text-[#3b82f6] bg-[#3b82f61a] border-[#3b82f633]"
  };

  return (
    <div className={cn(
      "px-2 py-0.5 rounded text-[10px] border font-mono uppercase tracking-wider flex items-center gap-1.5",
      styles[level]
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full", 
        level === 'high' ? 'bg-[#ef4444]' : 
        level === 'medium' ? 'bg-[#f59e0b]' : 
        level === 'low' ? 'bg-[#10b981]' : 'bg-[#3b82f6]'
      )} />
      {level}
    </div>
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'systems' | 'security'>('chat');
  const [permissions, setPermissions] = useState<Permission[]>([
    { id: 'screen', name: 'Screen Awareness', enabled: true, icon: <Eye size={14} /> },
    { id: 'audio', name: 'Voice Synthesis', enabled: true, icon: <Mic size={14} /> },
    { id: 'clipboard', name: 'Clipboard Intelligence', enabled: true, icon: <Database size={14} /> },
    { id: 'network', name: 'Real-time Signal', enabled: true, icon: <Wifi size={14} /> },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [actionStatus, setActionStatus] = useState<{ success: boolean; message: string } | null>(null);

  // --- Real Desktop Sensory: Clipboard Watch ---
  const syncClipboard = async () => {
    try {
      let text = '';
      if (window.hasOwnProperty('require')) {
        const { ipcRenderer } = (window as any).require('electron');
        text = await ipcRenderer.invoke('read-clipboard');
      } else {
        text = await navigator.clipboard.readText();
      }

      if (text && text.trim() !== '') {
        // Simple proactive check: if it looks like a URL or a task
        setIsProcessing(true);
        const response = await jarvisBrain(`New data detected in clipboard: "${text}". Analyze and suggest next steps.`);
        const jarvisMessage: Message = {
          id: Date.now().toString(),
          role: 'jarvis',
          content: response.reply,
          timestamp: new Date(),
          risk: response
        };
        setMessages(prev => [...prev, jarvisMessage]);
        if (response.action) setPendingAction(response.action);
      }
    } catch (err) {
      console.warn('Sensory link blocked. Permission required.');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeJarvisAction = async () => {
    if (!pendingAction) return;
    
    try {
      if (window.hasOwnProperty('require')) {
        const { ipcRenderer } = (window as any).require('electron');
        const result = await ipcRenderer.invoke('execute-action', pendingAction);
        setActionStatus(result);
      } else {
        // Web fallback simulation
        setActionStatus({ success: true, message: `Simulated: ${pendingAction.description}` });
      }
    } catch (err) {
      setActionStatus({ success: false, message: 'Execution pathway disrupted.' });
    } finally {
      setTimeout(() => {
        setPendingAction(null);
        setActionStatus(null);
      }, 3000);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await jarvisBrain(input);
      const jarvisMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'jarvis',
        content: response.reply,
        timestamp: new Date(),
        risk: response
      };
      setMessages(prev => [...prev, jarvisMessage]);
      if (response.action) setPendingAction(response.action);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };
  useEffect(() => {
    // Initial startup greeting
    const greeting: Message = {
      id: 'startup',
      role: 'jarvis',
      content: 'System online. Neural link established. Desktop shell initialized with Global Shortcut: **Ctrl + J**. How can I assist you today, Operator?',
      timestamp: new Date(),
    };
    setMessages([greeting]);

    // Keyboard Shortcut Simulation (for browser dev)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        inputRef.current?.focus();
        // Visual feedback
        const core = document.getElementById('jarvis-core');
        if (core) core.classList.add('scale-110', 'rotate-12');
        setTimeout(() => {
          if (core) core.classList.remove('scale-110', 'rotate-12');
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const togglePermission = (id: string) => {
    setPermissions(prev => prev.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
  };

  return (
    <div className="min-h-screen font-sans selection:bg-[#3b82f633] selection:text-[#3b82f6] bg-[#050505] p-6 text-gray-300">
      {/* Container Grid */}
      <div className="max-w-[1400px] mx-auto h-[calc(100vh-3rem)] grid grid-cols-12 grid-rows-6 gap-4">
        
        {/* Header Unit - Bento Tile */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 row-span-1 bento-card justify-between flex-row items-center">
          <div className="flex items-center gap-4">
            <div id="jarvis-core" className="w-10 h-10 rounded-full bg-[#3b82f6] flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300">
              <Cpu className="text-white" size={20} />
            </div>
            <div>
              <div className="bento-label !mb-0"><span className="step-num">01</span> Jarvis Core</div>
              <h1 className="text-lg font-bold text-white tracking-tight">Neural Interface v4.1</h1>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden sm:flex flex-col items-end">
              <span className="bento-label !mb-0">Uptime</span>
              <span className="text-xs font-mono text-white">99.998%</span>
            </div>
            <StatusBadge level="online" />
          </div>
        </div>

        {/* System Deployment - Bento Tile */}
        <div className="hidden lg:flex col-span-3 row-span-1 bento-card bg-blue-500/5 border-blue-500/20">
          <div className="bento-label text-blue-400"><span className="step-num !text-blue-400">07</span> Deployment</div>
          <div className="flex-1 flex items-center justify-between">
             <div className="space-y-1">
                <div className="text-sm font-bold text-white">npm run build</div>
                <div className="text-[10px] text-blue-400/60 font-mono">jarvis_setup.exe</div>
             </div>
             <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 size={16} className="text-white" />
             </div>
          </div>
        </div>

        {/* Diagnostic Sidebar - Bento Tile */}
        <div className="hidden md:flex md:col-span-4 lg:col-span-3 row-span-2 bento-card">
          <div className="bento-label"><span className="step-num">02</span> Diagnostic Sidebar</div>
          <div className="flex-1 space-y-4">
            <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-3">
              {[
                { label: 'CPU Load', val: '12.4%', color: '#3b82f6' },
                { label: 'Neural Sync', val: '99.8%', color: '#10b981' },
                { label: 'Memory', val: '2.4 TB', color: '#3b82f6' }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-gray-500">{item.label}</span>
                  <span style={{ color: item.color }}>{item.val}</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Vector Path</div>
              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-[#3b82f6] w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="col-span-12 md:col-span-8 lg:col-span-6 row-span-4 bento-card !p-0 overflow-hidden relative border-blue-500/10">
          <div className="absolute top-4 right-4 z-20 flex gap-2">
             <button 
               onClick={syncClipboard}
               className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] font-bold text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
             >
                <Database size={10} /> Sync Clipboard
             </button>
             <div className="bento-label !mb-0 opacity-40"><span className="step-num">04</span> Live Link</div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar z-10">
            <AnimatePresence>
              {pendingAction && !actionStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="sticky top-0 z-30 p-4 mb-4 rounded-xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-md flex items-center justify-between shadow-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                      <Terminal size={18} className="text-white" />
                    </div>
                    <div>
                      <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Execute Intent?</div>
                      <div className="text-sm text-white font-mono">{pendingAction.description}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPendingAction(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-white transition-colors"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={executeJarvisAction}
                      className="px-4 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-blue-600 transition-all uppercase tracking-widest"
                    >
                      Authorize
                    </button>
                  </div>
                </motion.div>
              )}

              {actionStatus && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "sticky top-0 z-30 p-4 mb-4 rounded-xl border backdrop-blur-md flex items-center gap-3",
                    actionStatus.success ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-500"
                  )}
                >
                  {actionStatus.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span className="text-xs font-mono">{actionStatus.message}</span>
                </motion.div>
              )}

              {messages.map((message) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-2",
                    message.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 px-1 opacity-50">
                    <span className="text-[9px] font-bold uppercase tracking-widest">
                      {message.role === 'user' ? 'Operator' : 'Jarvis'}
                    </span>
                    <span className="text-[8px] font-mono">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={cn(
                    "max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                    message.role === 'user' 
                      ? "bg-[#3b82f61a] border border-[#3b82f633] text-white rounded-tr-none" 
                      : "bg-[#1a1a20] border border-white/5 text-gray-200 rounded-tl-none font-mono"
                  )}>
                    {message.role === 'jarvis' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>

                  {message.risk && (
                    <motion.div 
                      className="mt-2 p-3 rounded-xl bg-black/40 border border-white/5 w-full space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">AI Intelligence</span>
                        <StatusBadge level={message.risk.riskLevel} />
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono leading-tight italic">
                        {message.risk.reasoning}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-black/50 border-t border-white/5 backdrop-blur-sm">
            <div className="relative group">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Synchronize command..."
                className="w-full bg-[#15151a] border border-[#222] rounded-xl px-4 py-3 pr-12 text-sm font-mono focus:outline-none focus:border-[#3b82f666] transition-all"
              />
              <button
                disabled={!input.trim() || isProcessing}
                onClick={handleSend}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#3b82f6] hover:bg-[#3b82f61a] disabled:opacity-30 transition-all"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-[#3b82f633] border-t-[#3b82f6] rounded-full animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* System Architecture - Bento Tile */}
        <div className="hidden lg:flex lg:col-span-3 row-span-2 bento-card">
          <div className="bento-label"><span className="step-num">03</span> Architecture</div>
          <div className="flex-1 flex flex-col justify-center space-y-6">
             <div className="flex items-center justify-between px-2">
                <div className="flex flex-col items-center gap-1">
                   <div className="w-8 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-bold text-white">UI</div>
                   <span className="text-[8px] text-gray-500 uppercase">Electron</span>
                </div>
                <div className="h-px flex-1 bg-gray-800 mx-2" />
                <div className="flex flex-col items-center gap-1">
                   <div className="w-10 h-10 rounded-full border-2 border-blue-500/50 flex items-center justify-center animate-pulse">
                      <div className="w-6 h-6 bg-blue-500 rounded-full text-white flex items-center justify-center text-[8px]">AI</div>
                   </div>
                   <span className="text-[8px] text-gray-400 uppercase font-bold">Google</span>
                </div>
                <div className="h-px flex-1 bg-gray-800 mx-2" />
                <div className="flex flex-col items-center gap-1">
                   <div className="w-8 h-8 rounded bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-500">
                      <CheckCircle2 size={14} />
                   </div>
                   <span className="text-[8px] text-gray-500 uppercase">Output</span>
                </div>
             </div>
             
             <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-tighter">System Command</div>
                <div className="text-sm font-black text-white tracking-widest text-center py-2 bg-blue-500/10 rounded border border-blue-500/20">CTRL + SPACE</div>
             </div>
          </div>
        </div>

        {/* Controlled Access - Bento Tile */}
        <div className="col-span-12 md:col-span-8 lg:col-span-6 row-span-1 bento-card !p-4">
          <div className="flex justify-between items-center mb-3">
             <div className="bento-label !mb-0"><span className="step-num">06</span> Access Control</div>
             <div className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                <ShieldAlert size={10} /> Limited
             </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {permissions.map((perm) => (
              <button
                key={perm.id}
                onClick={() => togglePermission(perm.id)}
                className={cn(
                  "p-2 rounded-lg border transition-all flex items-center gap-2 group",
                  perm.enabled 
                    ? "bg-[#3b82f60a] border-[#3b82f633] text-white" 
                    : "bg-[#0a0a0f] border-white/5 text-gray-600 grayscale opacity-60"
                )}
              >
                <span className={perm.enabled ? "text-[#3b82f6]" : ""}>{perm.icon}</span>
                <span className="text-[10px] font-bold uppercase truncate">{perm.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Screen Awareness - Bento Tile */}
        <div className="hidden md:flex md:col-span-4 lg:col-span-3 row-span-1 bento-card border-amber-500/20">
           <div className="bento-label text-amber-500"><span className="step-num !text-amber-500">05</span> Screen Awareness</div>
           <div className="flex-1 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                 <Eye size={18} className="text-amber-500" />
              </div>
              <div className="space-y-0.5">
                 <div className="text-[10px] text-gray-500 uppercase font-bold">Active Window</div>
                 <div className="text-xs text-white font-mono">VS Code</div>
              </div>
           </div>
        </div>

        {/* Mobile Strategy - Bento Tile */}
        <div className="hidden lg:flex col-span-3 row-span-1 bento-card">
          <div className="bento-label"><span className="step-num">08</span> Mobile Strategy</div>
          <div className="flex-1 flex flex-col justify-end space-y-2">
            <div className="text-[10px] text-gray-500 italic">Phase: Development</div>
            <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500/60 w-1/4" />
            </div>
            <div className="flex justify-between text-[10px] font-mono">
               <span className="text-gray-400">React Native</span>
               <span className="text-blue-500">25%</span>
            </div>
          </div>
        </div>

      </div>
      
      {/* Global Style overrides for specific formatting */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.2); }
      `}</style>
    </div>
  );
}
