// Lightweight logger wrapper - silences debug/info in production by default.
// Set NEXT_PUBLIC_ENABLE_LOGS=true to enable logs in production builds.
const ENABLE_LOGS = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_LOGS === 'true'

export function debug(...args: any[]) {
  if (ENABLE_LOGS) console.debug(...args)
}

export function info(...args: any[]) {
  if (ENABLE_LOGS) console.info(...args)
}

export function warn(...args: any[]) {
  console.warn(...args)
}

export function error(...args: any[]) {
  console.error(...args)
}

export default { debug, info, warn, error }
