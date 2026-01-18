'use client';

import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Plus, ChevronDown, ChevronUp, Coins } from 'lucide-react';
import { BudgetSummary, Purchase } from '@/types';
import {
  getBudgetSummary,
  createBudget,
  recordPurchase,
  formatPrice,
  getBudgetAlerts
} from '@/lib/budget-service';

interface BudgetWidgetProps {
  compact?: boolean;
  onUpdate?: () => void;
}

export default function BudgetWidget({ compact = false, onUpdate }: BudgetWidgetProps) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, alertsData] = await Promise.all([
        getBudgetSummary(),
        getBudgetAlerts()
      ]);
      setSummary(summaryData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error loading budget:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async () => {
    const amount = parseFloat(budgetAmount.replace(/[^0-9]/g, ''));
    if (isNaN(amount) || amount <= 0) return;

    setSaving(true);
    try {
      await createBudget('weekly', amount);
      await loadData();
      setShowSetup(false);
      setBudgetAmount('');
      onUpdate?.();
    } catch (error) {
      console.error('Error creating budget:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  // Sin presupuesto configurado
  if (!summary?.budget) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={20} className="text-purple-600" />
          <span className="font-medium text-purple-800">Control de Presupuesto</span>
        </div>

        {showSetup ? (
          <div className="space-y-3">
            <p className="text-sm text-purple-700">Define tu presupuesto semanal:</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="300,000"
                  className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={handleCreateBudget}
                disabled={saving || !budgetAmount}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? '...' : 'Crear'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowSetup(true)}
            className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Configurar presupuesto semanal
          </button>
        )}
      </div>
    );
  }

  // Vista compacta
  if (compact) {
    return (
      <div
        className={`rounded-xl p-3 cursor-pointer transition-all ${
          summary.isOverBudget
            ? 'bg-red-50 border border-red-200'
            : summary.percentUsed > 80
            ? 'bg-orange-50 border border-orange-200'
            : 'bg-green-50 border border-green-200'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={16} className={summary.isOverBudget ? 'text-red-600' : 'text-green-600'} />
            <span className="text-sm font-medium">
              {formatPrice(summary.remaining)} restante
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              summary.isOverBudget
                ? 'bg-red-200 text-red-800'
                : 'bg-green-200 text-green-800'
            }`}>
              {Math.round(summary.percentUsed)}%
            </span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <BudgetDetails summary={summary} alerts={alerts} />
          </div>
        )}
      </div>
    );
  }

  // Vista completa
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${
        summary.isOverBudget
          ? 'bg-red-600'
          : summary.percentUsed > 80
          ? 'bg-orange-600'
          : 'bg-green-600'
      } text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={20} />
            <span className="font-semibold">Presupuesto Semanal</span>
          </div>
          <span className="text-sm opacity-90">
            {new Date(summary.budget.period_start).toLocaleDateString()} - {new Date(summary.budget.period_end).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Gastado: {formatPrice(summary.totalSpent)}</span>
          <span className="font-medium">de {formatPrice(summary.budget.budget_amount)}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              summary.isOverBudget
                ? 'bg-red-500'
                : summary.percentUsed > 80
                ? 'bg-orange-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, summary.percentUsed)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className={`text-2xl font-bold ${
            summary.remaining < 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {formatPrice(Math.abs(summary.remaining))}
          </div>
          <div className="text-xs text-gray-500">
            {summary.remaining < 0 ? 'Excedido' : 'Disponible'}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-700">
            {formatPrice(summary.averageDailySpend)}
          </div>
          <div className="text-xs text-gray-500">Promedio/día</div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-4 pb-4">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Projection */}
      {summary.daysRemaining > 0 && !summary.isOverBudget && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {summary.projectedTotal > summary.budget.budget_amount ? (
              <>
                <TrendingUp size={16} className="text-orange-500" />
                Proyección: {formatPrice(summary.projectedTotal)} (sobre presupuesto)
              </>
            ) : (
              <>
                <TrendingDown size={16} className="text-green-500" />
                Proyección: {formatPrice(summary.projectedTotal)} (bajo presupuesto)
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Purchase Button */}
      <div className="p-4 border-t">
        <button
          onClick={() => setShowAddPurchase(true)}
          className="w-full py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Registrar compra
        </button>
      </div>

      {/* Add Purchase Modal */}
      {showAddPurchase && (
        <AddPurchaseModal
          onClose={() => setShowAddPurchase(false)}
          onSaved={() => {
            loadData();
            setShowAddPurchase(false);
            onUpdate?.();
          }}
        />
      )}
    </div>
  );
}

function BudgetDetails({ summary, alerts }: { summary: BudgetSummary; alerts: string[] }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Gastado:</span>
        <span className="font-medium">{formatPrice(summary.totalSpent)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Presupuesto:</span>
        <span>{formatPrice(summary.budget?.budget_amount || 0)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Días restantes:</span>
        <span>{summary.daysRemaining}</span>
      </div>
      {alerts.length > 0 && (
        <div className="pt-2 text-xs text-amber-700">
          {alerts[0]}
        </div>
      )}
    </div>
  );
}

interface AddPurchaseModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function AddPurchaseModal({ onClose, onSaved }: AddPurchaseModalProps) {
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [store, setStore] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const priceNum = parseFloat(price.replace(/[^0-9]/g, ''));
    if (!itemName || isNaN(priceNum) || priceNum <= 0) return;

    setSaving(true);
    try {
      await recordPurchase({
        item_name: itemName,
        price: priceNum,
        quantity: quantity || undefined,
        store: store || undefined
      });
      onSaved();
    } catch (error) {
      console.error('Error saving purchase:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins size={20} className="text-purple-600" />
            <span className="font-semibold">Registrar Compra</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Ej: Pechuga de pollo"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="15,000"
                className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1 kg"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tienda
              </label>
              <input
                type="text"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="Éxito"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !itemName || !price}
            className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? '...' : 'Guardar compra'}
          </button>
        </div>
      </div>
    </div>
  );
}
