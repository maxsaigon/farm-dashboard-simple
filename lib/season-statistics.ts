import { getTreeFruitCountState } from './tree-season-status'
import type { Investment, Tree } from './types'

export interface CategoryExpenseSummary {
  category: string
  amount: number
  count: number
}

export interface ZoneFruitSummary {
  zone: string
  totalFruit: number
  recordedTrees: number
  eligibleTrees: number
}

export interface SeasonStatistics {
  seasonYear: number
  totalFruit: number
  recordedTrees: number
  missingTrees: number
  notApplicableTrees: number
  eligibleTrees: number
  averageFruitPerRecordedTree: number
  totalExpense: number
  expenseCount: number
  expensePerEligibleTree: number
  expensesByCategory: CategoryExpenseSummary[]
  monthlyExpenses: number[]
  zones: ZoneFruitSummary[]
}

export function getInvestmentSeasonYear(investment: Investment): number {
  if (Number.isInteger(investment.seasonYear)) return investment.seasonYear as number
  return new Date(investment.date).getFullYear()
}

export function calculateSeasonStatistics(
  trees: Tree[],
  investments: Investment[],
  seasonYear: number
): SeasonStatistics {
  let totalFruit = 0
  let recordedTrees = 0
  let missingTrees = 0
  let notApplicableTrees = 0
  const zoneMap = new Map<string, ZoneFruitSummary>()

  trees.forEach(tree => {
    const state = getTreeFruitCountState(tree, seasonYear)
    const zone = tree.zoneName || tree.zoneCode || 'Chưa phân khu'
    const zoneSummary = zoneMap.get(zone) || {
      zone,
      totalFruit: 0,
      recordedTrees: 0,
      eligibleTrees: 0
    }

    if (state.status === 'not_applicable') {
      notApplicableTrees += 1
    } else {
      zoneSummary.eligibleTrees += 1
      if (state.status === 'recorded') {
        recordedTrees += 1
        totalFruit += state.count
        zoneSummary.recordedTrees += 1
        zoneSummary.totalFruit += state.count
      } else {
        missingTrees += 1
      }
    }
    zoneMap.set(zone, zoneSummary)
  })

  const seasonInvestments = investments.filter(item => getInvestmentSeasonYear(item) === seasonYear)
  const categoryMap = new Map<string, CategoryExpenseSummary>()
  const monthlyExpenses = Array(12).fill(0) as number[]

  seasonInvestments.forEach(item => {
    const amount = Number(item.amount) || 0
    const category = item.category || 'Khác'
    const current = categoryMap.get(category) || { category, amount: 0, count: 0 }
    current.amount += amount
    current.count += 1
    categoryMap.set(category, current)

    const date = new Date(item.date)
    if (!Number.isNaN(date.getTime())) monthlyExpenses[date.getMonth()] += amount
  })

  const eligibleTrees = recordedTrees + missingTrees
  const totalExpense = seasonInvestments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  return {
    seasonYear,
    totalFruit,
    recordedTrees,
    missingTrees,
    notApplicableTrees,
    eligibleTrees,
    averageFruitPerRecordedTree: recordedTrees > 0 ? totalFruit / recordedTrees : 0,
    totalExpense,
    expenseCount: seasonInvestments.length,
    expensePerEligibleTree: eligibleTrees > 0 ? totalExpense / eligibleTrees : 0,
    expensesByCategory: Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount),
    monthlyExpenses,
    zones: Array.from(zoneMap.values())
      .filter(zone => zone.eligibleTrees > 0)
      .sort((a, b) => b.totalFruit - a.totalFruit)
  }
}

export function percentageChange(current: number, comparison: number): number | null {
  if (comparison === 0) return null
  return ((current - comparison) / comparison) * 100
}
