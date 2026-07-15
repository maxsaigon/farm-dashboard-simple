export const FARM_ROLES = ['owner', 'manager', 'viewer'] as const
export type FarmRole = typeof FARM_ROLES[number]

export const ROLE_PERMISSIONS = {
  owner: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
  manager: ['read', 'write', 'manage_trees', 'manage_photos'],
  viewer: ['read']
} as const

export type Permission = typeof ROLE_PERMISSIONS[FarmRole][number]

export function farmAccessId(userId: string, farmId: string): string {
  if (!userId || !farmId) throw new Error('userId and farmId are required')
  return `${userId}_${farmId}`
}

export function isFarmRole(value: unknown): value is FarmRole {
  return typeof value === 'string' && FARM_ROLES.includes(value as FarmRole)
}

export function roleHasPermission(role: FarmRole | null, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission as never) : false
}
