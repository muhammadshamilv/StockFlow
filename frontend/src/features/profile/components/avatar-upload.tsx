import { useEffect, useRef, useState } from "react"
import { CameraIcon, Trash2Icon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const MAX_BYTES = 2 * 1024 * 1024

type AvatarUploadProps = {
  current: string | null
  initials: string
  file: File | null
  removed: boolean
  onChange: (next: { file: File | null; removed: boolean }) => void
  onError: (message: string) => void
}

export function AvatarUpload({ current, initials, file, removed, onChange, onError }: AvatarUploadProps) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shown = preview ?? (removed ? null : current)

  return (
    <div className="flex items-center gap-5">
      <div className="group relative">
        <Avatar className="ring-primary/15 size-20 ring-4">
          {shown && <AvatarImage src={shown} alt="Avatar" />}
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Change photo"
        >
          <CameraIcon className="size-5" />
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()}>
            <CameraIcon /> Upload photo
          </Button>
          {shown && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange({ file: null, removed: true })}
            >
              <Trash2Icon /> Remove
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">JPG, PNG or WebP · max 2 MB</p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          e.target.value = ""
          if (!picked) return
          if (picked.size > MAX_BYTES) return onError("That image is larger than 2 MB.")
          onChange({ file: picked, removed: false })
        }}
      />
    </div>
  )
}
