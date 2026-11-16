import { useId, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { Spinner } from "@/components/feedback/spinner"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { fieldBase } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebouncedValue } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

type AsyncComboboxProps<T> = {
  value: T | null
  onChange: (value: T | null) => void
  /** Fetch options for the (debounced) search term */
  fetcher: (term: string) => Promise<T[]>
  queryKey: (term: string) => readonly unknown[]
  getKey: (item: T) => number | string
  getLabel: (item: T) => string
  renderItem?: (item: T) => ReactNode
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  /** Extra action at the bottom (e.g. "+ New customer") */
  footer?: (close: () => void, term: string) => ReactNode
  disabled?: boolean
  invalid?: boolean
  id?: string
  className?: string
}

/** Searchable select backed by an API endpoint (products, customers…). */
export function AsyncCombobox<T>({
  value,
  onChange,
  fetcher,
  queryKey,
  getKey,
  getLabel,
  renderItem,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  footer,
  disabled,
  invalid,
  id,
  className,
}: AsyncComboboxProps<T>) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const [search, setSearch] = useState("")
  const term = useDebouncedValue(search.trim(), 250)
  const { data = [], isFetching } = useQuery({
    queryKey: queryKey(term),
    queryFn: () => fetcher(term),
    enabled: open,
    staleTime: 30_000,
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(fieldBase, "flex h-10 items-center justify-between gap-2 px-3 text-left", className)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground/70")}>
            {value ? getLabel(value) : placeholder}
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground size-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent id={listId} align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
            className="h-11"
            trailing={isFetching ? <Spinner size="xs" className="text-primary" /> : null}
          />
          <CommandList className="max-h-72">
            {!isFetching && <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {data.map((item) => {
                const selected = value !== null && getKey(value) === getKey(item)
                return (
                  <CommandItem
                    key={getKey(item)}
                    value={String(getKey(item))}
                    onSelect={() => {
                      onChange(selected ? null : item)
                      setOpen(false)
                    }}
                  >
                    <div className="min-w-0 flex-1">{renderItem ? renderItem(item) : getLabel(item)}</div>
                    {selected && <CheckIcon className="text-primary!" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {footer && <div className="border-t p-1.5">{footer(() => setOpen(false), search)}</div>}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
