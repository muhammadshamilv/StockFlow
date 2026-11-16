import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { useLocation, useOutlet } from "react-router-dom"

import { CommandMenu } from "./command-menu"
import { LogoutDialog } from "./logout-dialog"
import { MobileNavSheet, MobileTabBar } from "./mobile-nav"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"

/** Keeps rendering the route it was mounted with, so exit animations show the old page. */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

/** Authenticated layout: sidebar + top bar + animated page outlet + mobile nav. */
export function AppShell() {
  const location = useLocation()
  return (
    <div className="bg-background flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="bg-dot-grid relative flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-28 sm:px-6 md:pb-10 lg:px-8 lg:pt-8"
            >
              <FrozenOutlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileTabBar />
      <MobileNavSheet />
      <CommandMenu />
      <LogoutDialog />
    </div>
  )
}
