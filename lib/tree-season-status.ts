import { Tree, TreeSeasonalStats } from './types'

export type FruitCountStatus = 'recorded' | 'missing' | 'not_applicable'

export interface TreeFruitCountState {
  status: FruitCountStatus
  count: number
  stats?: TreeSeasonalStats
}

export function isYoungTree(tree: Tree): boolean {
  return tree.treeStatus === 'Cây Non' || tree.treeStatus === 'Young Tree'
}

export function getTreeFruitCountState(tree: Tree, seasonYear: number): TreeFruitCountState {
  if (isYoungTree(tree)) {
    return { status: 'not_applicable', count: 0 }
  }

  const stats = tree.seasonalStats?.[seasonYear]
  if (!stats) {
    return { status: 'missing', count: 0 }
  }

  const manualCount = Number(stats.manualFruitCount) || 0
  const aiCount = Number(stats.aiFruitCount) || 0
  const hasExplicitRecord = Boolean(stats.fruitCountRecordedAt)
  const hasLegacyPositiveCount = manualCount > 0 || aiCount > 0

  return {
    status: hasExplicitRecord || hasLegacyPositiveCount ? 'recorded' : 'missing',
    count: stats.fruitCountSource === 'ai'
      ? aiCount
      : stats.fruitCountSource === 'manual'
        ? manualCount
        : manualCount > 0
          ? manualCount
          : aiCount,
    stats
  }
}

export function getFruitCountProgress(trees: Tree[], seasonYear: number) {
  const states = trees.map(tree => getTreeFruitCountState(tree, seasonYear).status)
  const recorded = states.filter(status => status === 'recorded').length
  const missing = states.filter(status => status === 'missing').length
  const notApplicable = states.filter(status => status === 'not_applicable').length

  return {
    total: recorded + missing,
    recorded,
    missing,
    notApplicable
  }
}
