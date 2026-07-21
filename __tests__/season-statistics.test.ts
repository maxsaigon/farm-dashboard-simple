import { calculateSeasonStatistics, getInvestmentSeasonYear, percentageChange } from '@/lib/season-statistics'
import type { Investment, Tree } from '@/lib/types'

const tree = (id: string, status: Tree['treeStatus'], counts: number, recorded = true, zoneName?: string): Tree => ({
  id,
  farmId: 'farm-1',
  latitude: 10,
  longitude: 106,
  treeStatus: status,
  manualFruitCount: 0,
  aiFruitCount: 0,
  needsAttention: false,
  zoneName,
  seasonalStats: {
    2026: {
      manualFruitCount: counts,
      aiFruitCount: recorded ? 999 : 0,
      fruitCountRecordedAt: recorded ? new Date('2026-06-01') : undefined,
      fruitCountSource: 'manual',
      healthStatus: 'Good',
      updatedAt: new Date('2026-06-01')
    }
  }
})

const investment = (id: string, amount: number, date: string, seasonYear?: number, category = 'Phân bón'): Investment => ({
  id,
  farmId: 'farm-1',
  amount,
  category,
  date: new Date(date),
  seasonYear,
  isRecurring: false
})

describe('season statistics', () => {
  it('summarizes fruit without double-counting AI and keeps confirmed zero recorded', () => {
    const result = calculateSeasonStatistics([
      tree('1', 'Cây Trưởng Thành', 20, true, 'Khu A'),
      tree('2', 'Cây Trưởng Thành', 0, true, 'Khu A'),
      tree('3', 'Cây Trưởng Thành', 0, false, 'Khu B'),
      tree('4', 'Cây Non', 50, true, 'Khu B')
    ], [], 2026)

    expect(result).toMatchObject({
      totalFruit: 20,
      recordedTrees: 2,
      missingTrees: 1,
      notApplicableTrees: 1,
      eligibleTrees: 3,
      averageFruitPerRecordedTree: 10
    })
    expect(result.zones).toEqual([
      { zone: 'Khu A', totalFruit: 20, recordedTrees: 2, eligibleTrees: 2 },
      { zone: 'Khu B', totalFruit: 0, recordedTrees: 0, eligibleTrees: 1 }
    ])
  })

  it('uses explicit investment season and falls back to date year for legacy data', () => {
    const explicit = investment('1', 100, '2025-12-20', 2026)
    const legacy = investment('2', 50, '2026-01-10')
    const other = investment('3', 999, '2025-01-10', 2025)
    const result = calculateSeasonStatistics([], [explicit, legacy, other], 2026)

    expect(getInvestmentSeasonYear(explicit)).toBe(2026)
    expect(getInvestmentSeasonYear(legacy)).toBe(2026)
    expect(result.totalExpense).toBe(150)
    expect(result.expenseCount).toBe(2)
    expect(result.expensesByCategory[0]).toEqual({ category: 'Phân bón', amount: 150, count: 2 })
  })

  it('groups expenses by category and month', () => {
    const result = calculateSeasonStatistics([], [
      investment('1', 100, '2026-02-01', 2026, 'Phân bón'),
      investment('2', 250, '2026-02-12', 2026, 'Lao động')
    ], 2026)

    expect(result.expensesByCategory.map(item => item.category)).toEqual(['Lao động', 'Phân bón'])
    expect(result.monthlyExpenses[1]).toBe(350)
  })

  it('does not report a percentage when the comparison is zero', () => {
    expect(percentageChange(10, 0)).toBeNull()
    expect(percentageChange(120, 100)).toBe(20)
  })
})
