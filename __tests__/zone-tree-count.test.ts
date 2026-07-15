import { countTreesByZone } from '@/lib/zone-tree-count'

describe('countTreesByZone', () => {
  const zones = [
    { id: 'zone-a', code: 'A01', name: 'Khu A' },
    { id: 'zone-b', code: 'B01', name: 'Khu B' }
  ]

  it('matches a tree once using id, code, or name', () => {
    const counts = countTreesByZone(zones, [
      { zoneId: 'zone-a', zoneCode: 'A01', zoneName: 'Khu A' },
      { zoneCode: 'b01' },
      { zoneName: ' khu b ' }
    ])

    expect(counts.get('zone-a')).toBe(1)
    expect(counts.get('zone-b')).toBe(2)
  })

  it('does not assign unknown zones', () => {
    const counts = countTreesByZone(zones, [{ zoneId: 'missing' }, {}])

    expect(counts.get('zone-a')).toBe(0)
    expect(counts.get('zone-b')).toBe(0)
  })
})
