/**
 * Modal Z-Index Management System
 * Prevents layer conflicts between multiple modals and overlays
 */

export const MODAL_Z_INDEX = {
  // Base layers
  NAVIGATION: 40,        // z-40: Navigation bars, headers
  SIDEBAR: 30,           // z-30: Sidebar overlays
  
  // Modal layers (hierarchical)
  MAP_OVERLAY: 9995,     // Map popups, tooltips (lowest modal)
  TREE_DETAIL: 9996,     // Tree/Zone detail modals
  MANAGEMENT_MODAL: 9998, // Form modals, management interfaces
  PHOTO_VIEWER: 9999,    // Photo galleries, image viewers (highest)
  
  // Emergency/System layers
  LOADING_OVERLAY: 10000, // Loading screens
  ERROR_MODAL: 10001,    // Error messages, alerts
} as const

export type ModalType = keyof typeof MODAL_Z_INDEX

/**
 * Get z-index value for a modal type
 */
export function getModalZIndex(type: ModalType): number {
  return MODAL_Z_INDEX[type]
}

/**
 * Get Tailwind CSS class for modal z-index
 */
export function getModalZClass(type: ModalType): string {
  const zIndex = MODAL_Z_INDEX[type]
  
  // Use bracket notation for custom z-index values
  if (zIndex >= 9995) {
    return `z-[${zIndex}]`
  }
  
  // Standard Tailwind classes
  switch (zIndex) {
    case 40: return 'z-40'
    case 30: return 'z-30'
    default: return `z-[${zIndex}]`
  }
}

/**
 * Modal stack manager to prevent body scroll issues
 */
class ModalStackManager {
  private modalStack: Set<string> = new Set()
  
  pushModal(modalId: string) {
    this.modalStack.add(modalId)
    if (this.modalStack.size === 1) {
      // First modal opened - prevent body scroll
      document.body.style.overflow = 'hidden'
    }
  }
  
  popModal(modalId: string) {
    this.modalStack.delete(modalId)
    if (this.modalStack.size === 0) {
      // Last modal closed - restore body scroll
      document.body.style.overflow = 'unset'
    }
  }
  
  clearAll() {
    this.modalStack.clear()
    document.body.style.overflow = 'unset'
  }
  
  hasModals(): boolean {
    return this.modalStack.size > 0
  }
}

export const modalStack = new ModalStackManager()

/**
 * Hook for managing modal lifecycle (to be used in React components)
 * Import React and useEffect where you use this hook
 */
export function createModalManager(modalId: string, isOpen: boolean) {
  return {
    onModalOpen: () => modalStack.pushModal(modalId),
    onModalClose: () => modalStack.popModal(modalId),
    cleanup: () => modalStack.popModal(modalId)
  }
}