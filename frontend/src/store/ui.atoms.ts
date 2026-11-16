import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

/** Desktop sidebar collapsed to icons (remembered across visits) */
export const sidebarCollapsedAtom = atomWithStorage("sf-sidebar-collapsed", false, undefined, {
  getOnInit: true,
})

/** Mobile navigation drawer */
export const mobileNavOpenAtom = atom(false)

/** Global command palette (⌘K) */
export const commandMenuOpenAtom = atom(false)

/** Logout confirmation dialog (opened from user menu, command palette, mobile nav) */
export const logoutDialogOpenAtom = atom(false)
