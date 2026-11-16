import { useEffect, useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { Spinner } from "@/components/feedback/spinner"
import { Input } from "@/components/ui/input"
import { useDebouncedValue } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  loading?: boolean
  className?: string
  autoFocus?: boolean
}

/** Debounced search box: types instantly, reports after 300ms. Clear button + spinner. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  loading,
  className,
  autoFocus,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, 300)

  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (debounced !== value) onChange(debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced draft
  }, [debounced])

  return (
    <div className={cn("w-full sm:max-w-xs", className)}>
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
        startAdornment={<SearchIcon />}
        className="[&::-webkit-search-cancel-button]:hidden"
        endAdornment={
          loading && draft ? (
            <span className="text-primary grid size-8 place-items-center">
              <Spinner size="xs" />
            </span>
          ) : draft ? (
            <button
              type="button"
              onClick={() => setDraft("")}
              className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-8 place-items-center rounded-md"
              aria-label="Clear search"
            >
              <XIcon className="size-4" />
            </button>
          ) : null
        }
      />
    </div>
  )
}
