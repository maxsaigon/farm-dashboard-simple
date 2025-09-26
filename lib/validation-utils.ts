// Input validation and sanitization utilities for security

// Sanitize text input to prevent XSS
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return ''

  return input
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Validate display name
export function isValidDisplayName(name: string): boolean {
  return name.length >= 1 && name.length <= 50 && /^[a-zA-Z0-9\s\u00C0-\u024F\u1E00-\u1EFF]+$/.test(name)
}

// Validate farm name
export function isValidFarmName(name: string): boolean {
  return name.length >= 1 && name.length <= 100 && !/<script|javascript:|on\w+=/i.test(name)
}

// Sanitize and validate user input for admin operations
export function validateUserInput(input: {
  email?: string
  displayName?: string
  farmName?: string
}): { isValid: boolean; errors: string[]; sanitized: typeof input } {
  const errors: string[] = []
  const sanitized = { ...input }

  if (input.email !== undefined) {
    const cleanEmail = sanitizeText(input.email)
    if (!isValidEmail(cleanEmail)) {
      errors.push('Invalid email format')
    }
    sanitized.email = cleanEmail
  }

  if (input.displayName !== undefined) {
    const cleanName = sanitizeText(input.displayName)
    if (!isValidDisplayName(cleanName)) {
      errors.push('Display name must be 1-50 characters, letters and spaces only')
    }
    sanitized.displayName = cleanName
  }

  if (input.farmName !== undefined) {
    const cleanFarmName = sanitizeText(input.farmName)
    if (!isValidFarmName(cleanFarmName)) {
      errors.push('Farm name must be 1-100 characters and cannot contain scripts')
    }
    sanitized.farmName = cleanFarmName
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

// Rate limiting helper (client-side)
class RateLimiter {
  private attempts: Map<string, number[]> = new Map()

  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []

    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs)

    if (validAttempts.length >= maxAttempts) {
      return false
    }

    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    return true
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }
}

export const rateLimiter = new RateLimiter()

// Validate admin operation permissions
export function canPerformAdminOperation(userId: string, operation: string): boolean {
  const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID || 'O6aFgoNhDigSIXk6zdYSDrFWhWG2'
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@farm.com'

  // Only allow specific admin operations for super admin
  const allowedOperations = [
    'user_management',
    'farm_management',
    'system_config',
    'data_export',
    'user_delete',
    'farm_delete'
  ]

  return userId === adminUid && allowedOperations.includes(operation)
}