interface ZoneIdentity {
  id: string
  name?: string
  code?: string
}

interface TreeZoneIdentity {
  zoneId?: string
  zoneCode?: string
  zoneName?: string
}

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('vi') : ''
}

export function countTreesByZone(
  zones: ZoneIdentity[],
  trees: TreeZoneIdentity[]
): Map<string, number> {
  const zoneByAlias = new Map<string, string>()
  const counts = new Map(zones.map(zone => [zone.id, 0]))

  zones.forEach(zone => {
    ;[zone.id, zone.code, zone.name].forEach(alias => {
      const key = normalize(alias)
      if (key && !zoneByAlias.has(key)) zoneByAlias.set(key, zone.id)
    })
  })

  trees.forEach(tree => {
    const aliases = [tree.zoneId, tree.zoneCode, tree.zoneName]
    const zoneId = aliases
      .map(alias => zoneByAlias.get(normalize(alias)))
      .find(Boolean)

    if (zoneId) counts.set(zoneId, (counts.get(zoneId) || 0) + 1)
  })

  return counts
}
