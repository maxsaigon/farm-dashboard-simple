import { getFruitCountProgress, getTreeFruitCountState } from '@/lib/tree-season-status'
import { Tree } from '@/lib/types'

const makeTree = (seasonalStats?: Tree['seasonalStats'], treeStatus?: Tree['treeStatus']): Tree => ({
  id: Math.random().toString(),
  farmId: 'farm-1',
  latitude: 10,
  longitude: 106,
  manualFruitCount: 0,
  aiFruitCount: 0,
  needsAttention: false,
  treeStatus,
  seasonalStats
})

describe('tree season fruit count status', () => {
  it('treats an explicitly confirmed zero as recorded', () => {
    const tree = makeTree({
      2026: {
        manualFruitCount: 0,
        aiFruitCount: 0,
        fruitCountRecordedAt: new Date('2026-07-15'),
        fruitCountRecordedBy: 'user-1',
        fruitCountSource: 'manual',
        healthStatus: 'Good',
        updatedAt: new Date('2026-07-15')
      }
    })

    expect(getTreeFruitCountState(tree, 2026)).toMatchObject({ status: 'recorded', count: 0 })
  })

  it('treats an unconfirmed default zero as missing', () => {
    const tree = makeTree({
      2026: {
        manualFruitCount: 0,
        aiFruitCount: 0,
        healthStatus: 'Good',
        updatedAt: new Date('2026-07-15')
      }
    })

    expect(getTreeFruitCountState(tree, 2026).status).toBe('missing')
  })

  it('keeps legacy positive seasonal counts visible as recorded', () => {
    const tree = makeTree({
      2026: {
        manualFruitCount: 25,
        aiFruitCount: 0,
        healthStatus: 'Good',
        updatedAt: new Date('2026-07-15')
      }
    })

    expect(getTreeFruitCountState(tree, 2026)).toMatchObject({ status: 'recorded', count: 25 })
  })

  it('does not require fruit count data for young trees', () => {
    const youngTree = makeTree(undefined, 'Cây Non')

    expect(getTreeFruitCountState(youngTree, 2026)).toMatchObject({
      status: 'not_applicable',
      count: 0
    })
  })

  it('calculates progress for the selected season only', () => {
    const trees = [
      makeTree({ 2026: { manualFruitCount: 4, aiFruitCount: 0, healthStatus: 'Good', updatedAt: new Date() } }),
      makeTree({ 2026: { manualFruitCount: 0, aiFruitCount: 0, healthStatus: 'Good', updatedAt: new Date() } }),
      makeTree({ 2025: { manualFruitCount: 12, aiFruitCount: 0, healthStatus: 'Good', updatedAt: new Date() } })
    ]

    expect(getFruitCountProgress(trees, 2026)).toEqual({ total: 3, recorded: 1, missing: 2, notApplicable: 0 })
  })

  it('excludes young trees from count progress', () => {
    const trees = [
      makeTree(undefined, 'Cây Non'),
      makeTree(undefined, 'Young Tree'),
      makeTree(undefined, 'Cây Trưởng Thành')
    ]

    expect(getFruitCountProgress(trees, 2026)).toEqual({
      total: 1,
      recorded: 0,
      missing: 1,
      notApplicable: 2
    })
  })
})
