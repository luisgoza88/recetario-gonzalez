'use client';

/**
 * ContextPills Component
 *
 * Muestra indicadores visuales de las herramientas que se están ejecutando
 * durante el streaming de la IA. Proporciona feedback en tiempo real al usuario.
 */

import { Loader2, Check, X, Search, Utensils, Package, ShoppingCart, Users, Home, Calendar, ClipboardList } from 'lucide-react';
import type { ActiveTool } from '@/lib/hooks/useAIChat';

interface ContextPillsProps {
  tools: ActiveTool[];
  className?: string;
}

// Get icon for tool category
function getToolIcon(toolName: string) {
  // Query tools
  if (toolName.includes('search') || toolName.includes('get_')) {
    return Search;
  }

  // Recipe tools
  if (toolName.includes('recipe') || toolName.includes('menu') || toolName.includes('meal')) {
    return Utensils;
  }

  // Inventory tools
  if (toolName.includes('inventory') || toolName.includes('scan')) {
    return Package;
  }

  // Shopping tools
  if (toolName.includes('shopping') || toolName.includes('list')) {
    return ShoppingCart;
  }

  // Employee tools
  if (toolName.includes('employee')) {
    return Users;
  }

  // Space tools
  if (toolName.includes('space')) {
    return Home;
  }

  // Task tools
  if (toolName.includes('task') || toolName.includes('schedule')) {
    return Calendar;
  }

  // Default
  return ClipboardList;
}

// Get color for tool status
function getStatusColor(status: ActiveTool['status']) {
  switch (status) {
    case 'running':
      return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
    case 'completed':
      return 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30';
    case 'failed':
      return 'bg-red-500/20 text-red-600 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-600 border-gray-500/30';
  }
}

function ContextPill({ tool }: { tool: ActiveTool }) {
  const Icon = getToolIcon(tool.name);
  const statusColor = getStatusColor(tool.status);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${statusColor}`}
    >
      {/* Status indicator */}
      {tool.status === 'running' ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : tool.status === 'completed' ? (
        <Check className="w-3 h-3" />
      ) : (
        <X className="w-3 h-3" />
      )}

      {/* Tool icon */}
      <Icon className="w-3 h-3" />

      {/* Tool description */}
      <span className="max-w-[150px] truncate">
        {tool.description || tool.name}
      </span>
    </div>
  );
}

export function ContextPills({ tools, className = '' }: ContextPillsProps) {
  if (tools.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tools.map((tool, index) => (
        <ContextPill key={`${tool.name}-${index}`} tool={tool} />
      ))}
    </div>
  );
}

// Compact version for message bubbles
export function ContextPillsCompact({ tools, className = '' }: ContextPillsProps) {
  if (tools.length === 0) return null;

  const runningTools = tools.filter(t => t.status === 'running');
  const completedTools = tools.filter(t => t.status === 'completed');
  const failedTools = tools.filter(t => t.status === 'failed');

  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
      {runningTools.length > 0 && (
        <span className="flex items-center gap-1 text-blue-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          {runningTools.length} ejecutando
        </span>
      )}
      {completedTools.length > 0 && (
        <span className="flex items-center gap-1 text-emerald-500">
          <Check className="w-3 h-3" />
          {completedTools.length} completado{completedTools.length !== 1 ? 's' : ''}
        </span>
      )}
      {failedTools.length > 0 && (
        <span className="flex items-center gap-1 text-red-500">
          <X className="w-3 h-3" />
          {failedTools.length} error{failedTools.length !== 1 ? 'es' : ''}
        </span>
      )}
    </div>
  );
}

// Loading skeleton for tools area
export function ContextPillsSkeleton() {
  return (
    <div className="flex flex-wrap gap-1.5 animate-pulse">
      <div className="h-6 w-24 bg-gray-200 rounded-full" />
      <div className="h-6 w-32 bg-gray-200 rounded-full" />
      <div className="h-6 w-20 bg-gray-200 rounded-full" />
    </div>
  );
}

export default ContextPills;
