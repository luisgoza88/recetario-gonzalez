'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain, Shield, Clock, CheckCircle, XCircle, AlertTriangle,
  Activity, TrendingUp, Settings, ChevronRight, RefreshCw,
  Zap, Lock, Unlock, BarChart3, History, ListChecks,
  ChevronDown, Eye, RotateCcw, ThumbsUp, ThumbsDown,
  ArrowLeft, MessageCircle, Send, Loader2, Mic, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// Types
interface TrustStats {
  trust_level: number;
  successful_actions: number;
  failed_actions: number;
  rolled_back_actions: number;
  auto_approve_level: number;
  max_actions_per_minute: number;
  max_critical_actions_per_day: number;
  max_items_per_bulk_operation: number;
  require_confirmation_always: boolean;
  allow_bulk_operations: boolean;
  allow_destructive_actions: boolean;
}

interface PendingProposal {
  id: string;
  proposal_id: string;
  summary: string;
  risk_level: number;
  actions: Array<{
    id: string;
    function: string;
    description: string;
    risk_level: number;
  }>;
  created_at: string;
  expires_at: string;
  status: string;
}

interface AuditLogEntry {
  id: string;
  function_name: string;
  action_type: string;
  status: string;
  risk_level: number;
  created_at: string;
  executed_at: string | null;
  error_message: string | null;
}

interface FunctionConfig {
  id: string;
  function_name: string;
  category: string;
  risk_level: number;
  requires_confirmation: boolean;
  is_enabled: boolean;
  description_es: string;
}

// Risk level helpers
const RISK_LABELS: Record<number, string> = {
  1: 'Bajo',
  2: 'Medio',
  3: 'Alto',
  4: 'Crítico'
};

const RISK_COLORS: Record<number, string> = {
  1: 'text-green-600 bg-green-100',
  2: 'text-yellow-600 bg-yellow-100',
  3: 'text-orange-600 bg-orange-100',
  4: 'text-red-600 bg-red-100'
};

const TRUST_LABELS: Record<number, string> = {
  1: 'Nuevo',
  2: 'Básico',
  3: 'Confiable',
  4: 'Veterano',
  5: 'Experto'
};

// Sub-components
function StatCard({ icon, label, value, subtext, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: number }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[level]}`}>
      {RISK_LABELS[level]}
    </span>
  );
}

function ProposalCard({ proposal, onApprove, onReject, onView }: {
  proposal: PendingProposal;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}) {
  const expiresIn = Math.max(0, Math.floor((new Date(proposal.expires_at).getTime() - Date.now()) / 60000));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-yellow-400">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="font-medium text-gray-800">{proposal.summary}</p>
          <div className="flex items-center gap-2 mt-1">
            <RiskBadge level={proposal.risk_level} />
            <span className="text-xs text-gray-400">
              {proposal.actions.length} acción{proposal.actions.length !== 1 ? 'es' : ''}
            </span>
            <span className="text-xs text-orange-500">
              Expira en {expiresIn}m
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          <ThumbsUp size={16} />
          Aprobar
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
        >
          <ThumbsDown size={16} />
          Rechazar
        </button>
        <button
          onClick={onView}
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Eye size={16} />
        </button>
      </div>
    </div>
  );
}

function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  const statusIcon = {
    completed: <CheckCircle size={16} className="text-green-500" />,
    failed: <XCircle size={16} className="text-red-500" />,
    rolled_back: <RotateCcw size={16} className="text-orange-500" />,
    pending: <Clock size={16} className="text-yellow-500" />
  }[entry.status] || <Clock size={16} className="text-gray-400" />;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      {statusIcon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {entry.function_name.replace(/_/g, ' ')}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(entry.created_at).toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
      <RiskBadge level={entry.risk_level} />
    </div>
  );
}

// Main Component
interface AICommandCenterProps {
  onClose?: () => void;
  householdId?: string;
}

export default function AICommandCenter({ onClose, householdId }: AICommandCenterProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'proposals' | 'history' | 'settings'>('chat');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);

  // Data states
  const [trustStats, setTrustStats] = useState<TrustStats | null>(null);
  const [pendingProposals, setPendingProposals] = useState<PendingProposal[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [functions, setFunctions] = useState<FunctionConfig[]>([]);
  const [todayStats, setTodayStats] = useState({ total: 0, successful: 0, failed: 0 });

  const fetchData = useCallback(async () => {
    if (!householdId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch trust stats
      let { data: trust } = await supabase
        .from('household_ai_trust')
        .select('*')
        .eq('household_id', householdId)
        .single();

      // Si no existe, crear registro de trust por defecto
      if (!trust) {
        const defaultTrust = {
          household_id: householdId,
          trust_level: 3,
          successful_actions: 0,
          failed_actions: 0,
          rolled_back_actions: 0,
          auto_approve_level: 2,
          max_actions_per_minute: 20,
          max_critical_actions_per_day: 10,
          max_items_per_bulk_operation: 50,
          require_confirmation_always: false,
          allow_bulk_operations: true,
          allow_destructive_actions: false,
        };

        const { data: newTrust, error: insertError } = await supabase
          .from('household_ai_trust')
          .upsert(defaultTrust)
          .select()
          .single();

        if (!insertError && newTrust) {
          trust = newTrust;
        } else {
          // Si falla crear en DB, usar valores por defecto locales
          trust = defaultTrust as TrustStats;
        }
      }

      if (trust) setTrustStats(trust);

      // Fetch pending proposals
      const { data: proposals } = await supabase
        .from('ai_action_queue')
        .select('*')
        .eq('household_id', householdId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      setPendingProposals(proposals || []);

      // Fetch recent audit log
      const { data: logs } = await supabase
        .from('ai_audit_log')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(20);

      setAuditLog(logs || []);

      // Fetch function registry
      const { data: funcs } = await supabase
        .from('ai_function_registry')
        .select('*')
        .order('risk_level', { ascending: true });

      setFunctions(funcs || []);

      // Calculate today's stats
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = (logs || []).filter(l => l.created_at.startsWith(today));
      setTodayStats({
        total: todayLogs.length,
        successful: todayLogs.filter(l => l.status === 'completed').length,
        failed: todayLogs.filter(l => l.status === 'failed').length
      });

    } catch (error) {
      console.error('Error fetching AI Command Center data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [householdId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleApproveProposal = async (proposalId: string) => {
    try {
      await supabase
        .from('ai_action_queue')
        .update({ status: 'approved', decision_at: new Date().toISOString() })
        .eq('proposal_id', proposalId);

      fetchData();
    } catch (error) {
      console.error('Error approving proposal:', error);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      await supabase
        .from('ai_action_queue')
        .update({ status: 'rejected', decision_at: new Date().toISOString() })
        .eq('proposal_id', proposalId);

      fetchData();
    } catch (error) {
      console.error('Error rejecting proposal:', error);
    }
  };

  const handleUpdateTrust = async (field: string, value: number | boolean) => {
    if (!householdId) return;

    try {
      await supabase
        .from('household_ai_trust')
        .update({ [field]: value })
        .eq('household_id', householdId);

      fetchData();
    } catch (error) {
      console.error('Error updating trust settings:', error);
    }
  };

  // Chat functionality
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isProcessingChat) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessingChat(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: userMessage }],
          householdId, // AI Command Center parameter - top level
          conversationContext: {
            activeSection: 'ai-command-center'
          },
          stream: true
        })
      });

      if (!response.ok) throw new Error('AI request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse += data.content;
                  // Update the last assistant message
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg?.role === 'assistant') {
                      lastMsg.content = fullResponse;
                    } else {
                      newMessages.push({ role: 'assistant', content: fullResponse });
                    }
                    return newMessages;
                  });
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      if (!fullResponse) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, no pude procesar tu solicitud.' }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar con la IA. Intenta de nuevo.' }]);
    } finally {
      setIsProcessingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain size={48} className="text-purple-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Cargando Centro de Comando IA...</p>
        </div>
      </div>
    );
  }

  // No household ID - show setup message
  if (!householdId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 pb-6">
          <div className="flex items-center gap-3">
            {onClose && (
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Brain size={24} />
                Centro de Comando IA
              </h1>
            </div>
          </div>
        </div>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain size={40} className="text-purple-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Configura tu hogar</h2>
            <p className="text-gray-500 max-w-xs mx-auto">
              Para usar el Centro de Comando IA necesitas tener un hogar configurado primero.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-gray-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Brain size={24} />
              Centro de Comando IA
            </h1>
            <p className="text-purple-200 text-sm">Monitorea y controla tu asistente</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{trustStats?.trust_level || 1}</p>
            <p className="text-xs text-purple-200">Nivel Trust</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{pendingProposals.length}</p>
            <p className="text-xs text-purple-200">Pendientes</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{todayStats.total}</p>
            <p className="text-xs text-purple-200">Acciones Hoy</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex">
          {[
            { id: 'chat', label: 'Chat', icon: <MessageCircle size={18} /> },
            { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
            { id: 'proposals', label: 'Propuestas', icon: <ListChecks size={18} />, badge: pendingProposals.length },
            { id: 'history', label: 'Historial', icon: <History size={18} /> },
            { id: 'settings', label: 'Config', icon: <Settings size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-600 border-purple-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-hidden ${activeTab === 'chat' ? '' : 'overflow-y-auto p-4'}`}>
        <div className="max-w-lg mx-auto h-full">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={40} className="text-purple-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    ¿En qué puedo ayudarte?
                  </h3>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    Puedo ayudarte con recetas, planificación de menús, lista de compras, tareas del hogar y más.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    {[
                      '¿Qué puedo cocinar hoy?',
                      'Sugiéreme una receta saludable',
                      '¿Qué falta en el mercado?',
                      'Planifica el menú de la semana'
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setChatInput(suggestion);
                        }}
                        className="px-3 py-2 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-md'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isProcessingChat && chatMessages[chatMessages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-500 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input - sticky at bottom with safe area for iPhone */}
            <div
              className="sticky bottom-0 border-t bg-white p-4"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex gap-2 max-w-lg mx-auto">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Escribe tu mensaje..."
                  disabled={isProcessingChat}
                  className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isProcessingChat}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    chatInput.trim() && !isProcessingChat
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isProcessingChat ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Trust Level Card */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-purple-200 text-sm">Nivel de Confianza</p>
                  <p className="text-2xl font-bold">
                    {TRUST_LABELS[trustStats?.trust_level || 1]}
                  </p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Shield size={32} />
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(level => (
                  <div
                    key={level}
                    className={`flex-1 h-2 rounded-full ${
                      level <= (trustStats?.trust_level || 1)
                        ? 'bg-white'
                        : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-purple-200 mt-2">
                Auto-aprueba acciones de riesgo {RISK_LABELS[trustStats?.auto_approve_level || 1]} o menor
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<CheckCircle size={20} className="text-white" />}
                label="Exitosas"
                value={trustStats?.successful_actions || 0}
                color="bg-green-500 text-white"
              />
              <StatCard
                icon={<XCircle size={20} className="text-white" />}
                label="Fallidas"
                value={trustStats?.failed_actions || 0}
                color="bg-red-500 text-white"
              />
              <StatCard
                icon={<RotateCcw size={20} className="text-white" />}
                label="Revertidas"
                value={trustStats?.rolled_back_actions || 0}
                color="bg-orange-500 text-white"
              />
              <StatCard
                icon={<Zap size={20} className="text-white" />}
                label="Hoy"
                value={todayStats.total}
                subtext={`${todayStats.successful} ok, ${todayStats.failed} err`}
                color="bg-purple-500 text-white"
              />
            </div>

            {/* Pending Proposals Alert */}
            {pendingProposals.length > 0 && (
              <div
                onClick={() => setActiveTab('proposals')}
                className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-yellow-100 transition-colors"
              >
                <AlertTriangle size={24} className="text-yellow-600" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-800">
                    {pendingProposals.length} propuesta{pendingProposals.length !== 1 ? 's' : ''} pendiente{pendingProposals.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-yellow-600">Toca para revisar y aprobar</p>
                </div>
                <ChevronRight size={20} className="text-yellow-600" />
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Actividad Reciente</h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Ver todo
                </button>
              </div>
              <div className="px-4">
                {auditLog.slice(0, 5).map(entry => (
                  <AuditLogRow key={entry.id} entry={entry} />
                ))}
                {auditLog.length === 0 && (
                  <p className="py-8 text-center text-gray-400">
                    No hay actividad registrada aún
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Proposals Tab */}
        {activeTab === 'proposals' && (
          <div className="space-y-4">
            {pendingProposals.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <p className="font-medium text-gray-800">Todo al día</p>
                <p className="text-sm text-gray-500">No hay propuestas pendientes de revisión</p>
              </div>
            ) : (
              pendingProposals.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onApprove={() => handleApproveProposal(proposal.proposal_id)}
                  onReject={() => handleRejectProposal(proposal.proposal_id)}
                  onView={() => {/* TODO: Show details modal */}}
                />
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Historial de Acciones</h3>
              <p className="text-sm text-gray-500">Últimas 20 acciones ejecutadas</p>
            </div>
            <div className="px-4">
              {auditLog.map(entry => (
                <AuditLogRow key={entry.id} entry={entry} />
              ))}
              {auditLog.length === 0 && (
                <p className="py-8 text-center text-gray-400">
                  No hay historial disponible
                </p>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {!trustStats ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <Loader2 size={32} className="text-purple-500 mx-auto mb-4 animate-spin" />
                <p className="text-gray-500">Cargando configuración...</p>
              </div>
            ) : (
              <>
            {/* Auto-Approve Level */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-800">Nivel de Auto-Aprobación</p>
                  <p className="text-sm text-gray-500">
                    Acciones con este riesgo o menor se ejecutan automáticamente
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(level => (
                  <button
                    key={level}
                    onClick={() => handleUpdateTrust('auto_approve_level', level)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      trustStats.auto_approve_level === level
                        ? RISK_COLORS[level]
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {RISK_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>

            {/* Rate Limits */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-medium text-gray-800 mb-3">Límites de Velocidad</p>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Acciones por minuto</span>
                    <span className="font-medium">{trustStats.max_actions_per_minute}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={trustStats.max_actions_per_minute}
                    onChange={(e) => handleUpdateTrust('max_actions_per_minute', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Acciones críticas por día</span>
                    <span className="font-medium">{trustStats.max_critical_actions_per_day}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={trustStats.max_critical_actions_per_day}
                    onChange={(e) => handleUpdateTrust('max_critical_actions_per_day', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Items máx. por operación masiva</span>
                    <span className="font-medium">{trustStats.max_items_per_bulk_operation}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={trustStats.max_items_per_bulk_operation}
                    onChange={(e) => handleUpdateTrust('max_items_per_bulk_operation', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              {[
                {
                  field: 'require_confirmation_always',
                  label: 'Siempre pedir confirmación',
                  description: 'Todas las acciones requieren aprobación manual',
                  icon: <Lock size={20} />,
                  value: trustStats.require_confirmation_always
                },
                {
                  field: 'allow_bulk_operations',
                  label: 'Permitir operaciones masivas',
                  description: 'La IA puede modificar múltiples registros a la vez',
                  icon: <Activity size={20} />,
                  value: trustStats.allow_bulk_operations
                },
                {
                  field: 'allow_destructive_actions',
                  label: 'Permitir acciones destructivas',
                  description: 'La IA puede eliminar datos permanentemente',
                  icon: <AlertTriangle size={20} />,
                  value: trustStats.allow_destructive_actions
                },
              ].map((setting, idx) => (
                <div
                  key={setting.field}
                  className={`p-4 flex items-center gap-4 ${idx !== 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                    {setting.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{setting.label}</p>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <button
                    onClick={() => handleUpdateTrust(setting.field, !setting.value)}
                    className={`w-12 h-7 rounded-full transition-colors ${
                      setting.value ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      setting.value ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Functions Overview */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-gray-800">Funciones Registradas</p>
                <span className="text-sm text-gray-500">{functions.length} funciones</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[1, 2, 3, 4].map(level => {
                  const count = functions.filter(f => f.risk_level === level).length;
                  return (
                    <div key={level} className={`py-2 px-1 rounded-lg ${RISK_COLORS[level]}`}>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-xs">{RISK_LABELS[level]}</p>
                    </div>
                  );
                })}
              </div>
            </div>
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
