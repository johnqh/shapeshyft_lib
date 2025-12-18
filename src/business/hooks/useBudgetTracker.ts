/**
 * Budget Tracker Hook
 * Track usage costs and manage budgets
 */

import { useCallback, useMemo, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UsageAggregate,
  UsageByEndpoint,
} from '@sudobility/shapeshyft_types';

/**
 * Budget period type
 */
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Budget definition
 */
export interface Budget {
  id: string;
  name: string;
  limitCents: number;
  period: BudgetPeriod;
  projectId?: string;
  createdAt: number;
}

/**
 * Budget alert
 */
export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  currentSpendCents: number;
  limitCents: number;
  percentUsed: number;
  severity: 'warning' | 'critical' | 'exceeded';
  message: string;
}

/**
 * Cost breakdown item
 */
export interface CostBreakdownItem {
  endpointId: string;
  endpointName: string;
  totalCostCents: number;
  requestCount: number;
  percentOfTotal: number;
}

/**
 * Persisted budget store
 */
interface BudgetStoreState {
  budgets: Budget[];
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => Budget;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  removeBudget: (id: string) => void;
  clearAll: () => void;
}

/**
 * Persisted Zustand store for budgets
 */
export const useBudgetStore = create<BudgetStoreState>()(
  persist(
    set => ({
      budgets: [],

      addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => {
        const newBudget: Budget = {
          ...budget,
          id: `budget-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: Date.now(),
        };
        set(state => ({
          budgets: [...state.budgets, newBudget],
        }));
        return newBudget;
      },

      updateBudget: (id: string, updates: Partial<Budget>) =>
        set(state => ({
          budgets: state.budgets.map(b =>
            b.id === id ? { ...b, ...updates } : b
          ),
        })),

      removeBudget: (id: string) =>
        set(state => ({
          budgets: state.budgets.filter(b => b.id !== id),
        })),

      clearAll: () => set({ budgets: [] }),
    }),
    {
      name: 'shapeshyft-budgets',
    }
  )
);

/**
 * Return type for useBudgetTracker
 */
export interface UseBudgetTrackerReturn {
  budgets: Budget[];
  alerts: BudgetAlert[];

  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => Budget;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  removeBudget: (id: string) => void;
  checkBudgets: (analytics: {
    aggregate: UsageAggregate;
    by_endpoint: UsageByEndpoint[];
  }) => BudgetAlert[];
  calculateProjectedCost: (
    currentUsage: UsageAggregate,
    daysRemaining: number
  ) => number;
  getCostBreakdown: (byEndpoint: UsageByEndpoint[]) => CostBreakdownItem[];
  clearAlerts: () => void;
}

/**
 * Hook for tracking usage costs and budgets
 */
export const useBudgetTracker = (): UseBudgetTrackerReturn => {
  const store = useBudgetStore();
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);

  /**
   * Check budgets against current usage and generate alerts
   */
  const checkBudgets = useCallback(
    (analytics: {
      aggregate: UsageAggregate;
      by_endpoint: UsageByEndpoint[];
    }): BudgetAlert[] => {
      const newAlerts: BudgetAlert[] = [];
      const { aggregate, by_endpoint } = analytics;

      for (const budget of store.budgets) {
        let currentSpendCents: number;

        if (budget.projectId) {
          // Filter by project - sum endpoints that match
          currentSpendCents = by_endpoint
            .filter(ep => ep.endpoint_id.startsWith(budget.projectId ?? ''))
            .reduce((sum, ep) => sum + ep.total_estimated_cost_cents, 0);
        } else {
          // Total across all endpoints
          currentSpendCents = aggregate.total_estimated_cost_cents;
        }

        const percentUsed = (currentSpendCents / budget.limitCents) * 100;

        if (percentUsed >= 100) {
          newAlerts.push({
            budgetId: budget.id,
            budgetName: budget.name,
            currentSpendCents,
            limitCents: budget.limitCents,
            percentUsed,
            severity: 'exceeded',
            message: `Budget "${budget.name}" exceeded: $${(currentSpendCents / 100).toFixed(2)} of $${(budget.limitCents / 100).toFixed(2)} (${percentUsed.toFixed(1)}%)`,
          });
        } else if (percentUsed >= 90) {
          newAlerts.push({
            budgetId: budget.id,
            budgetName: budget.name,
            currentSpendCents,
            limitCents: budget.limitCents,
            percentUsed,
            severity: 'critical',
            message: `Budget "${budget.name}" critical: $${(currentSpendCents / 100).toFixed(2)} of $${(budget.limitCents / 100).toFixed(2)} (${percentUsed.toFixed(1)}%)`,
          });
        } else if (percentUsed >= 75) {
          newAlerts.push({
            budgetId: budget.id,
            budgetName: budget.name,
            currentSpendCents,
            limitCents: budget.limitCents,
            percentUsed,
            severity: 'warning',
            message: `Budget "${budget.name}" warning: $${(currentSpendCents / 100).toFixed(2)} of $${(budget.limitCents / 100).toFixed(2)} (${percentUsed.toFixed(1)}%)`,
          });
        }
      }

      setAlerts(newAlerts);
      return newAlerts;
    },
    [store.budgets]
  );

  /**
   * Calculate projected cost based on current usage rate
   */
  const calculateProjectedCost = useCallback(
    (currentUsage: UsageAggregate, daysRemaining: number): number => {
      // Assume current usage is representative of daily rate
      const dailyRate = currentUsage.total_estimated_cost_cents;
      return dailyRate * daysRemaining;
    },
    []
  );

  /**
   * Get cost breakdown by endpoint
   */
  const getCostBreakdown = useCallback(
    (byEndpoint: UsageByEndpoint[]): CostBreakdownItem[] => {
      const totalCost = byEndpoint.reduce(
        (sum, ep) => sum + ep.total_estimated_cost_cents,
        0
      );

      return byEndpoint
        .map(ep => ({
          endpointId: ep.endpoint_id,
          endpointName: ep.endpoint_name,
          totalCostCents: ep.total_estimated_cost_cents,
          requestCount: ep.total_requests,
          percentOfTotal:
            totalCost > 0
              ? (ep.total_estimated_cost_cents / totalCost) * 100
              : 0,
        }))
        .sort((a, b) => b.totalCostCents - a.totalCostCents);
    },
    []
  );

  /**
   * Clear all alerts
   */
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return useMemo(
    () => ({
      budgets: store.budgets,
      alerts,
      addBudget: store.addBudget,
      updateBudget: store.updateBudget,
      removeBudget: store.removeBudget,
      checkBudgets,
      calculateProjectedCost,
      getCostBreakdown,
      clearAlerts,
    }),
    [
      store.budgets,
      store.addBudget,
      store.updateBudget,
      store.removeBudget,
      alerts,
      checkBudgets,
      calculateProjectedCost,
      getCostBreakdown,
      clearAlerts,
    ]
  );
};
