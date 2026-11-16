/** Client-side password guidance (the server's Django validators remain the source of truth). */
export type PasswordRule = { id: string; label: string; test: (value: string) => boolean }

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "case", label: "Upper & lowercase letters", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: "number", label: "At least one number", test: (v) => /\d/.test(v) },
  { id: "symbol", label: "At least one symbol", test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export type Strength = {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  tone: "muted" | "destructive" | "warning" | "info" | "success"
}

const LABELS: Strength[] = [
  { score: 0, label: "Too short", tone: "muted" },
  { score: 1, label: "Weak", tone: "destructive" },
  { score: 2, label: "Fair", tone: "warning" },
  { score: 3, label: "Good", tone: "info" },
  { score: 4, label: "Strong", tone: "success" },
]

const COMMON = ["password", "12345678", "qwerty", "letmein", "welcome", "admin123", "stockflow"]

export function passwordStrength(value: string): Strength {
  if (!value) return LABELS[0]!
  let score = PASSWORD_RULES.filter((rule) => rule.test(value)).length
  if (value.length >= 12 && score >= 3) score += 1
  if (value.length < 8) score = Math.min(score, 1)
  if (COMMON.some((word) => value.toLowerCase().includes(word))) score = Math.min(score, 1)
  if (/^(.)\1+$/.test(value)) score = 1
  return LABELS[Math.max(0, Math.min(4, score)) as Strength["score"]]!
}
