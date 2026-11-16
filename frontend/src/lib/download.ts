import { api } from "./api-client"

function filenameFrom(disposition: string | undefined, fallback: string) {
  const match = disposition?.match(/filename="?([^"]+)"?/)
  return match?.[1] ?? fallback
}

/**
 * Download a file through the API client (so expired sessions refresh
 * transparently instead of showing a raw 401 page).
 */
export async function downloadFile(
  url: string,
  params: Record<string, unknown> = {},
  fallbackName = "download",
) {
  const response = await api.get<Blob>(url, { params, responseType: "blob" })
  const href = URL.createObjectURL(response.data)
  const link = document.createElement("a")
  link.href = href
  link.download = filenameFrom(response.headers["content-disposition"] as string | undefined, fallbackName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

/** Open a PDF (e.g. invoice) in a new tab. */
export async function openPdf(url: string) {
  // Open the tab synchronously so pop-up blockers allow it, then fill it
  const tab = window.open("", "_blank")
  const response = await api.get<Blob>(url, { responseType: "blob" })
  const href = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }))
  if (tab) tab.location.href = href
  else window.location.href = href
}
