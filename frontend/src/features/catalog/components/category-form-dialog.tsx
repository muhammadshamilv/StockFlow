import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon, SaveIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { AlertBanner } from "@/components/shared/alert-banner"
import { FormField } from "@/components/shared/form-field"
import { ResponsiveDialog } from "@/components/shared/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { applyFieldErrors, normalizeError } from "@/lib/errors"
import { cn } from "@/lib/utils"

import type { Category } from "../api"
import { useSaveCategory } from "../hooks"
import { categoryFormSchema, type CategoryFormValues } from "../schemas"

const CATEGORY_COLORS = [
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
  "#EF4444",
  "#64748B",
]

type Props = { open: boolean; onOpenChange: (open: boolean) => void; category?: Category | null }

export function CategoryFormDialog({ open, onOpenChange, category }: Props) {
  const save = useSaveCategory()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", description: "", color: CATEGORY_COLORS[0] },
  })

  useEffect(() => {
    if (!open) return
    setError(null)
    form.reset({
      name: category?.name ?? "",
      description: category?.description ?? "",
      color: category?.color.toUpperCase() ?? CATEGORY_COLORS[0],
    })
  }, [open, category, form])

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await save.mutateAsync({ id: category?.id, input: values })
      toast.success(category ? "Category updated" : "Category created")
      onOpenChange(false)
    } catch (err) {
      setError(applyFieldErrors(normalizeError(err), form.setError, ["name", "description", "color"]))
    }
  })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? "Edit category" : "New category"}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <AlertBanner tone="error" title={error} />}
        <FormField label="Name" required error={form.formState.errors.name}>
          {(f) => <Input {...f} {...form.register("name")} autoFocus placeholder="e.g. Electronics" />}
        </FormField>
        <FormField label="Colour" hint="Used to tag products in lists and charts">
          {() => (
            <Controller
              control={form.control}
              name="color"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={field.value === color}
                      aria-label={color}
                      onClick={() => field.onChange(color)}
                      className={cn(
                        "ring-offset-popover grid size-9 place-items-center rounded-xl ring-offset-2 transition",
                        field.value === color && "ring-foreground/60 ring-2",
                      )}
                      style={{ background: color }}
                    >
                      {field.value === color && <CheckIcon className="size-4 text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              )}
            />
          )}
        </FormField>
        <FormField label="Description" error={form.formState.errors.description}>
          {(f) => <Textarea {...f} {...form.register("description")} rows={3} placeholder="Optional" />}
        </FormField>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} loadingText="Saving…">
            <SaveIcon /> {category ? "Save changes" : "Create category"}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}
