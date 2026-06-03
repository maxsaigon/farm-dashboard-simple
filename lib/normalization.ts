/**
 * Normalizes variety names for durian trees
 */
export const normalizeVariety = (variety?: string): string => {
  if (!variety) return ''
  const v = variety.trim().toLowerCase()
  if (v === 'ri6' || v === 'ri 6' || v === 'ri-6') return 'Ri6'
  if (v === 'monthong' || v === 'mon thong' || v === 'dona' || v === 'đô na') return 'Monthong'
  if (v.includes('musang') || v.includes('msk') || v === 'musang king') return 'Musang King'
  if (v.includes('black') || v.includes('gai den') || v.includes('gai đen')) return 'Black Thorn'
  // capitalize first letter of each word
  return variety
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Normalizes zone names to avoid duplicate "Khu" prefixes
 */
export const normalizeZone = (zone?: string): string => {
  if (!zone) return ''
  const z = zone.trim()
  const lower = z.toLowerCase()
  if (lower.startsWith('khu')) {
    // Strip "khu" prefix (including any trailing spaces)
    const clean = z.slice(3).trim()
    return `Khu ${clean}`
  }
  return `Khu ${z}`
}
