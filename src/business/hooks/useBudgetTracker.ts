/**
 * Budget Tracker Hook
 *
 * Track usage costs and manage budgets with threshold-based alerting.
 *
 * **Features**:
 * - CRUD operations for budget definitions (persisted to localStorage)
 * - Budget alert generation at 75% (warning), 90% (critical), and 100% (exceeded) thresholds
 * - Project-scoped budgets that track only matching endpoint costs
 * - Projected cost calculation based on current usage rate
 * - Cost breakdown by endpoint with percentage-of-total
 *
 * **Storage**: The `useBudgetStore` uses Zustand's `persist` middleware to save
 * budgets to localStorage under the key `"shapeshyft-budgets"`. This is intentionally
 * different from other stores (keys, projects, etc.) which are purely in-memory,
 * because budgets are user-defined configurations that should survive page reloads.
 *
 * @module
 */

import { useCallback, useMemo, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UsageAggregate,
  UsageByEndpoint,
} from '@sudobility/shapeshyft_types';

/**
 * Time period for budget tracking.
 */
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Budget definition representing a spending limit.
 *
 * Budgets can be global (tracking all endpoint costs) or project-scoped
 * (tracking only endpoints whose `endpoint_id` starts with the given `projectId`).
 */
export interface Budget {
  /** Unique identifier (auto-generated on creation) */
  id: string;
  /** Human-readable budget name */
  name: string;
  /** Spending limit in cents (e.g., 10000 = $100.00) */
  limitCents: number;
  /** Time period this budget tracks */
  period: BudgetPeriod;
  /**
   * Optional project ID to scope this budget.
   * When set, only endpoints whose `endpoint_id` starts with this value are counted.
   * When undefined, all endpoint costs (aggregate total) are counted.
   */
  projectId?: string;
  /** Unix timestamp (ms) when this budget was created */
  createdAt: number;
}

/**
 * Alert generated when a budget approaches or exceeds its limit.
 *
 * Thresholds:
 * - **warning**: 75-89% of limit used
 * - **critical**: 90-99% of limit used
 * - **exceeded**: 100%+ of limit used
 */
export interface BudgetAlert {
  /** ID of the budget that triggered this alert */
  budgetId: string;
  /** Name of the budget that triggered this alert */
  budgetName: string;
  /** Current spend in cents */
  currentSpendCents: number;
  /** Budget limit in cents */
  limitCents: number;
  /** Percentage of budget used (e.g., 95.5 means 95.5%) */
  percentUsed: number;
  /** Alert severity level */
  severity: 'warning' | 'critical' | 'exceeded';
  /** Human-readable alert message with dollar amounts and percentage */
  message: string;
}

/**
 * Cost breakdown for a single endpoint.
 * Used to display which endpoints are consuming the most budget.
 */
export interface CostBreakdownItem {
  /** Endpoint UUID */
  endpointId: string;
  /** Endpoint display name */
  endpointName: string;
  /** Total cost in cents for this endpoint */
  totalCostCents: number;
  /** Number of requests to this endpoint */
  requestCount: number;
  /** Percentage of total cost across all endpoints (0-100) */
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
   * Calculate projected cost based on current usage rate.
   *
   * **Note**: This uses a simplistic assumption that the current total
   * `total_estimated_cost_cents` equals one day's worth of usage. For more
   * accurate projections, the caller should divide the total by the number
   * of days elapsed in the current period before passing it here.
   *
   * @param currentUsage - Current usage aggregate (treated as a daily rate)
   * @param daysRemaining - Number of days remaining in the budget period
   * @returns Projected cost in cents for the remaining period
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
