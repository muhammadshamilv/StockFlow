import { Toaster as Sonner } from "sonner"

import { useTheme } from "@/context/theme-provider"

/** Toasts styled with design tokens and synced with the theme. */
function Toaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-right"
      richColors
      closeButton
      gap={10}
      offset={{ bottom: 20, right: 20 }}
      // Phones: sit above the bottom tab bar
      mobileOffset={{ bottom: 96 }}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !shadow-xl !font-sans",
          title: "!font-medium",
          description: "!text-muted-foreground",
        },
      }}
    />
  )
}

export { Toaster }
