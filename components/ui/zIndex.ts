/**
 * Z-Index Management System
 * 
 * Centralized z-index values to prevent overlay conflicts
 * Higher values appear on top of lower values
 */

export const Z_INDEX = {
  // Base layers (0-999)
  BASE: 0,
  MAP_TILES: 1,
  MAP_MARKERS: 2,
  
  // UI Elements (1000-4999)
  DROPDOWN: 1000,
  STICKY_HEADER: 1040,
  MODAL_BACKDROP: 1050,
  MODAL: 1060,
  TOAST: 1070,
  TOOLTIP: 1080,
  
  // Navigation (5000-8999)
  BOTTOM_NAV: 5000,
  SIDEBAR: 5100,
  
  // Special Modes (9000-9999)
  FULLSCREEN_MODE: 9999,        // OnFarmWorkMode container
  FULLSCREEN_CONTROLS: 9998,    // Bottom panel in work mode
  FULLSCREEN_STATUS: 9999,      // GPS status indicator
  FULLSCREEN_CLOSE_BTN: 10000,  // Close button (highest priority)
} as const

export type ZIndexKey = keyof typeof Z_INDEX

/**
 * Usage Example:
 * 
 * import { Z_INDEX } from '@/components/ui/zIndex'
 * 
 * <div style={{ zIndex: Z_INDEX.MODAL }}>Modal Content</div>
 * <button style={{ zIndex: Z_INDEX.FULLSCREEN_CLOSE_BTN }}>Close</button>
 */

export default Z_INDEX