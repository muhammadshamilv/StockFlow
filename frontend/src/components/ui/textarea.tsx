import * as React from "react"

import { fieldBase } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldBase, "min-h-24 resize-y px-3 py-2.5", className)}
      {...props}
    />
  )
}

export { Textarea }
