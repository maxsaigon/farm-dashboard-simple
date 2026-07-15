import { farmAccessId, isFarmRole, roleHasPermission } from '@/lib/access-control'

describe('farm access control', () => {
  test('builds the deterministic membership document ID', () => {
    expect(farmAccessId('user-1', 'farm-a')).toBe('user-1_farm-a')
    expect(() => farmAccessId('', 'farm-a')).toThrow('userId and farmId are required')
  })

  test('accepts only supported farm roles', () => {
    expect(isFarmRole('owner')).toBe(true)
    expect(isFarmRole('manager')).toBe(true)
    expect(isFarmRole('viewer')).toBe(true)
    expect(isFarmRole('super_admin')).toBe(false)
  })

  test('viewer is read-only', () => {
    expect(roleHasPermission('viewer', 'read')).toBe(true)
    expect(roleHasPermission('viewer', 'write')).toBe(false)
    expect(roleHasPermission('viewer', 'delete')).toBe(false)
  })

  test('manager can write but cannot manage settings or delete', () => {
    expect(roleHasPermission('manager', 'write')).toBe(true)
    expect(roleHasPermission('manager', 'manage_photos')).toBe(true)
    expect(roleHasPermission('manager', 'delete')).toBe(false)
    expect(roleHasPermission('manager', 'manage_settings')).toBe(false)
  })

  test('owner has owner-level permissions and null role has none', () => {
    expect(roleHasPermission('owner', 'delete')).toBe(true)
    expect(roleHasPermission('owner', 'manage_users')).toBe(true)
    expect(roleHasPermission(null, 'read')).toBe(false)
  })
})
