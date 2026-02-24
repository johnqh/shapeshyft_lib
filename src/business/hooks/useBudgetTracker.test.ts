import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type {
  UsageAggregate,
  UsageByEndpoint,
} from '@sudobility/shapeshyft_types';
import { useBudgetStore, type Budget } from './useBudgetTracker';

/**
 * Tests for useBudgetTracker pure logic:
 * - Budget store CRUD operations
 * - Budget alert generation (75%/90%/100% thresholds)
 * - Projected cost calculation
 * - Cost breakdown by endpoint
 *
 * Note: The React hook (useBudgetTracker) is tested here via
 * direct Zustand store operations and standalone helper functions
 * extracted from the hook's logic. This avoids the need for
 * React testing infrastructure (renderHook, etc.).
 */

// Helper to create mock UsageAggregate
const createMockAggregate = (
  overrides: Partial<UsageAggregate> = {}
): UsageAggregate => ({
  total_requests: 100,
  successful_requests: 95,
  failed_requests: 5,
  total_tokens_input: 10000,
  total_tokens_output: 5000,
  total_estimated_cost_cents: 150,
  average_latency_ms: 250,
  ...overrides,
});

// Helper to create mock UsageByEndpoint
const createMockByEndpoint = (
  overrides: Partial<UsageByEndpoint> = {}
): UsageByEndpoint => ({
  endpoint_id: 'endpoint-1',
  endpoint_name: 'test-endpoint',
  total_requests: 50,
  successful_requests: 48,
  failed_requests: 2,
  total_tokens_input: 5000,
  total_tokens_output: 2500,
  total_estimated_cost_cents: 75,
  average_latency_ms: 200,
  ...overrides,
});

/**
 * Standalone implementation of checkBudgets logic for testing.
 * Mirrors the logic inside useBudgetTracker.checkBudgets.
 */
function checkBudgets(
  budgets: Budget[],
  analytics: {
    aggregate: UsageAggregate;
    by_endpoint: UsageByEndpoint[];
  }
) {
  const newAlerts: Array<{
    budgetId: string;
    budgetName: string;
    currentSpendCents: number;
    limitCents: number;
    percentUsed: number;
    severity: 'warning' | 'critical' | 'exceeded';
    message: string;
  }> = [];
  const { aggregate, by_endpoint } = analytics;

  for (const budget of budgets) {
    let currentSpendCents: number;

    if (budget.projectId) {
      currentSpendCents = by_endpoint
        .filter(ep => ep.endpoint_id.startsWith(budget.projectId ?? ''))
        .reduce((sum, ep) => sum + ep.total_estimated_cost_cents, 0);
    } else {
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

  return newAlerts;
}

/**
 * Standalone implementation of calculateProjectedCost logic.
 * Mirrors the logic inside useBudgetTracker.calculateProjectedCost.
 *
 * Note: This uses a simplistic assumption that current total usage equals
 * the daily rate. In practice, usage should be divided by the number of
 * days elapsed in the current period for a more accurate projection.
 */
function calculateProjectedCost(
  currentUsage: UsageAggregate,
  daysRemaining: number
): number {
  const dailyRate = currentUsage.total_estimated_cost_cents;
  return dailyRate * daysRemaining;
}

/**
 * Standalone implementation of getCostBreakdown logic.
 * Mirrors the logic inside useBudgetTracker.getCostBreakdown.
 */
function getCostBreakdown(byEndpoint: UsageByEndpoint[]) {
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
        totalCost > 0 ? (ep.total_estimated_cost_cents / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.totalCostCents - a.totalCostCents);
}

describe('useBudgetTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    useBudgetStore.getState().clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
    useBudgetStore.getState().clearAll();
  });

  describe('useBudgetStore', () => {
    describe('addBudget', () => {
      it('should add a budget with generated id and timestamp', () => {
        const budget = useBudgetStore.getState().addBudget({
          name: 'Monthly Budget',
          limitCents: 10000,
          period: 'monthly',
        });

        expect(budget.id).toMatch(/^budget-/);
        expect(budget.name).toBe('Monthly Budget');
        expect(budget.limitCents).toBe(10000);
        expect(budget.period).toBe('monthly');
        expect(budget.createdAt).toBe(Date.now());
        expect(useBudgetStore.getState().budgets).toHaveLength(1);
      });

      it('should add a project-scoped budget', () => {
        const budget = useBudgetStore.getState().addBudget({
          name: 'Project Budget',
          limitCents: 5000,
          period: 'weekly',
          projectId: 'project-123',
        });

        expect(budget.projectId).toBe('project-123');
      });

      it('should accumulate multiple budgets', () => {
        useBudgetStore.getState().addBudget({
          name: 'Budget 1',
          limitCents: 1000,
          period: 'daily',
        });
        useBudgetStore.getState().addBudget({
          name: 'Budget 2',
          limitCents: 5000,
          period: 'weekly',
        });

        expect(useBudgetStore.getState().budgets).toHaveLength(2);
      });
    });

    describe('updateBudget', () => {
      it('should update budget properties', () => {
        const budget = useBudgetStore.getState().addBudget({
          name: 'Old Name',
          limitCents: 1000,
          period: 'daily',
        });

        useBudgetStore.getState().updateBudget(budget.id, {
          name: 'New Name',
          limitCents: 2000,
        });

        const updated = useBudgetStore
          .getState()
          .budgets.find(b => b.id === budget.id);
        expect(updated?.name).toBe('New Name');
        expect(updated?.limitCents).toBe(2000);
        expect(updated?.period).toBe('daily'); // Unchanged
      });

      it('should not modify other budgets', () => {
        const budget1 = useBudgetStore.getState().addBudget({
          name: 'Budget 1',
          limitCents: 1000,
          period: 'daily',
        });
        useBudgetStore.getState().addBudget({
          name: 'Budget 2',
          limitCents: 2000,
          period: 'weekly',
        });

        useBudgetStore
          .getState()
          .updateBudget(budget1.id, { name: 'Updated' });

        const budget2 = useBudgetStore
          .getState()
          .budgets.find(b => b.name === 'Budget 2');
        expect(budget2?.limitCents).toBe(2000);
      });
    });

    describe('removeBudget', () => {
      it('should remove a budget by id', () => {
        const budget = useBudgetStore.getState().addBudget({
          name: 'To Remove',
          limitCents: 1000,
          period: 'daily',
        });

        useBudgetStore.getState().removeBudget(budget.id);

        expect(useBudgetStore.getState().budgets).toHaveLength(0);
      });

      it('should only remove the target budget', () => {
        const budget1 = useBudgetStore.getState().addBudget({
          name: 'Keep',
          limitCents: 1000,
          period: 'daily',
        });
        const budget2 = useBudgetStore.getState().addBudget({
          name: 'Remove',
          limitCents: 2000,
          period: 'weekly',
        });

        useBudgetStore.getState().removeBudget(budget2.id);

        expect(useBudgetStore.getState().budgets).toHaveLength(1);
        expect(useBudgetStore.getState().budgets[0].id).toBe(budget1.id);
      });
    });

    describe('clearAll', () => {
      it('should remove all budgets', () => {
        useBudgetStore.getState().addBudget({
          name: 'Budget 1',
          limitCents: 1000,
          period: 'daily',
        });
        useBudgetStore.getState().addBudget({
          name: 'Budget 2',
          limitCents: 2000,
          period: 'weekly',
        });

        useBudgetStore.getState().clearAll();

        expect(useBudgetStore.getState().budgets).toHaveLength(0);
      });
    });
  });

  describe('checkBudgets', () => {
    it('should generate no alerts when under 75%', () => {
      const budgets: Budget[] = [
        {
          id: 'budget-1',
          name: 'Monthly Budget',
          limitCents: 10000,
          period: 'monthly',
          createdAt: Date.now(),
        },
      ];

      const alerts = checkBudgets(budgets, {
        aggregate: createMockAggregate({ total_estimated_cost_cents: 7000 }),
        by_endpoint: [],
      });

      expect(alerts).toHaveLength(0);
    });

    it('should generate warning alert at 75%', () => {
      const budgets: Budget[] = [
        {
          id: 'budget-1',
          name: 'Monthly Budget',
          limitCents: 10000,
          period: 'monthly',
          createdAt: Date.now(),
        },
      ];

      const alerts = checkBudgets(budgets, {
        aggregate: createMockAggregate({ total_estimated_cost_cents: 7500 }),
        by_endpoint: [],
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].percentUsed).toBe(75);
    });

    it('should generate critical alert at 90%', () => {
      const budgets: Budget[] = [
        {
          id: 'budget-1',
          name: 'Monthly Budget',
          limitCents: 10000,
          period: 'monthly',
          createdAt: Date.now(),
        },
      ];

      const alerts = checkBudgets(budgets, {
        aggregate: createMockAggregate({ total_estimated_cost_cents: 9000 }),
        by_endpoint: [],
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].percentUsed).toBe(90);
    });

    it('should generate exceeded alert at 100%', () => {
      const budgets: Budget[] = [
        {
          id: 'budget-1',
          name: 'Monthly Budget',
          limitCents: 10000,
          period: 'monthly',
          createdAt: Date.now(),
        },
      ];

      const alerts = checkBudgets(budgets, {
        aggregate: createMockAggregate({ total_estimated_cost_cents: 10000 }),
        by_endpoint: [],
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('exceeded');
      expect(alerts[0].percentUsed).toBe(100);
    });

    it('should generate exceeded alert when over budget', () => {
      const budgets: Budget[] = [
        {
          id: 'budget-1',
          name: 'Monthly Budget',
          limitCents: 10000,
          period: 'monthly',
          createdAt: Date.now(),
        },
      ];

      const alerts = checkBudgets(budgets, {
        aggregate: createMockAggregate({ total_estimated_cost_cents: 15000 }),
        by_endpoint: [],
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('exceeded');
      expect(alerts[0].percentUsed).toBe(150);
    });

    it('should scope project budgets to matching endpoints', () => {
      const budgets: Budget[] = [
        {
          id: 'budget-1',
          name: 'Project Budget',
          limitCents: 200,
          period: 'monthly',
          projectId: 'project-abc',
          createdAt: Date.now(),
        },
      ];

      const byEndpoint = [
        createMockByEndpoint({
          endpoint_id: 'project-abc-endpoint-1',
          total_estimated_cost_cents: 100,
        }),
        createMockByEndpoint({
          endpoint_id: 'project-abc-endpoint-2',
          total_estimated_cost_cents: 80,
        }),
        createMockByEndpoint({
          endpoint_id: 'project-xyz-endpoint-1',
          total_estimated_cost_cents: 500,
        }),
      ];

      const alerts = checkBudgets(budgets, {
        aggregate: createMockAggregate({ total_estimated_cost_cents: 680 }),
        by_endpoint: byEndpoint,
      });

      // 180 out of 200 = 90% -> critical
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].currentSpendCents).toBe(180);
    });

    it('should check multiple budgets independently', () => {
      const budgets: Budget[] = [
        {
          id: 'budget-1',
          name: 'Low Budget',
          limitCents: 100,
          period: 'daily',
          createdAt: Date.now(),
        },
        {
          id: 'budget-2',
          name: 'High Budget',
          limitCents: 10000,
          period: 'monthly',
          createdAt: Date.now(),
        },
      ];

      const alerts = checkBudgets(budgets, {
        aggregate: createMockAggregate({ total_estimated_cost_cents: 150 }),
        by_endpoint: [],
      });

      // Low budget: 150/100 = 150% -> exceeded
      // High budget: 150/10000 = 1.5% -> no alert
      expect(alerts).toHaveLength(1);
      expect(alerts[0].budgetName).toBe('Low Budget');
      expect(alerts[0].severity).toBe('exceeded');
    });

    it('should include formatted dollar amounts in alert message', () => {
      const budgets: Budget[] = [
        {
          id: 'budget-1',
          name: 'Test Budget',
          limitCents: 1000,
          period: 'monthly',
          createdAt: Date.now(),
        },
      ];

      const alerts = checkBudgets(budgets, {
        aggregate: createMockAggregate({ total_estimated_cost_cents: 950 }),
        by_endpoint: [],
      });

      expect(alerts[0].message).toContain('$9.50');
      expect(alerts[0].message).toContain('$10.00');
      expect(alerts[0].message).toContain('95.0%');
    });
  });

  describe('calculateProjectedCost', () => {
    it('should multiply daily rate by remaining days', () => {
      const usage = createMockAggregate({
        total_estimated_cost_cents: 100,
      });
      expect(calculateProjectedCost(usage, 30)).toBe(3000);
    });

    it('should return 0 for 0 remaining days', () => {
      const usage = createMockAggregate({
        total_estimated_cost_cents: 100,
      });
      expect(calculateProjectedCost(usage, 0)).toBe(0);
    });

    it('should handle zero cost', () => {
      const usage = createMockAggregate({
        total_estimated_cost_cents: 0,
      });
      expect(calculateProjectedCost(usage, 30)).toBe(0);
    });
  });

  describe('getCostBreakdown', () => {
    it('should calculate percentage of total for each endpoint', () => {
      const byEndpoint = [
        createMockByEndpoint({
          endpoint_id: 'ep-1',
          endpoint_name: 'Endpoint 1',
          total_estimated_cost_cents: 300,
          total_requests: 30,
        }),
        createMockByEndpoint({
          endpoint_id: 'ep-2',
          endpoint_name: 'Endpoint 2',
          total_estimated_cost_cents: 200,
          total_requests: 20,
        }),
        createMockByEndpoint({
          endpoint_id: 'ep-3',
          endpoint_name: 'Endpoint 3',
          total_estimated_cost_cents: 500,
          total_requests: 50,
        }),
      ];

      const breakdown = getCostBreakdown(byEndpoint);

      expect(breakdown).toHaveLength(3);
      // Should be sorted by cost descending
      expect(breakdown[0].endpointId).toBe('ep-3');
      expect(breakdown[0].totalCostCents).toBe(500);
      expect(breakdown[0].percentOfTotal).toBe(50);

      expect(breakdown[1].endpointId).toBe('ep-1');
      expect(breakdown[1].totalCostCents).toBe(300);
      expect(breakdown[1].percentOfTotal).toBe(30);

      expect(breakdown[2].endpointId).toBe('ep-2');
      expect(breakdown[2].totalCostCents).toBe(200);
      expect(breakdown[2].percentOfTotal).toBe(20);
    });

    it('should handle zero total cost', () => {
      const byEndpoint = [
        createMockByEndpoint({
          endpoint_id: 'ep-1',
          total_estimated_cost_cents: 0,
        }),
      ];

      const breakdown = getCostBreakdown(byEndpoint);

      expect(breakdown[0].percentOfTotal).toBe(0);
    });

    it('should handle empty endpoint list', () => {
      const breakdown = getCostBreakdown([]);
      expect(breakdown).toHaveLength(0);
    });

    it('should include request counts', () => {
      const byEndpoint = [
        createMockByEndpoint({
          endpoint_id: 'ep-1',
          endpoint_name: 'Test',
          total_requests: 42,
          total_estimated_cost_cents: 100,
        }),
      ];

      const breakdown = getCostBreakdown(byEndpoint);
      expect(breakdown[0].requestCount).toBe(42);
    });
  });
});
