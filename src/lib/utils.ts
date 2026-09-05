import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isThisMonth, isThisYear } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyFull(value: number | null | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return "—"
  const date = new Date(ts)
  if (isThisMonth(date)) return format(date, "MMM d")
  if (isThisYear(date)) return format(date, "MMM d")
  return format(date, "MMM d, yyyy")
}

export function formatFullDate(ts: number | null | undefined): string {
  if (!ts) return "—"
  return format(new Date(ts), "MMMM d, yyyy")
}

export function timeAgo(ts: number | null | undefined): string {
  if (!ts) return "—"
  return formatDistanceToNow(new Date(ts), { addSuffix: true })
}

export function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

/** Deterministic color for avatar fallbacks based on a string. */
const AVATAR_COLORS = [
  "bg-primary",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-teal-500",
]

export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function generateToken(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  let result = ""
  const values = new Uint32Array(length)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(values)
  }
  for (let i = 0; i < length; i++) {
    result += chars[values[i]! % chars.length]
  }
  return result
}

export function normalizeTone(tone: string | null | undefined): string {
  return tone ?? "professional"
}

export const STATUS_STYLES: Record<string, string> = {
  draft: "bg-secondary text-foreground border-border",
  sent: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  accepted: "bg-primary/10 text-primary border-primary/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  "changes-requested": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  generated: "bg-secondary text-foreground border-border",
  intake: "bg-secondary text-foreground border-border",
}

export function humanizeStatus(status: string): string {
  switch (status) {
    case "changes-requested":
      return "Changes Requested"
    case "6-plus-months":
      return "6+ months"
    case "web-development":
      return "Web Development"
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, " ")
  }
}