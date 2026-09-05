import { Badge } from "@/components/ui/badge"
import { STATUS_STYLES, humanizeStatus } from "@/lib/utils"

const VARIANT_MAP: Record<string, "slate" | "blue" | "indigo" | "red" | "amber"> = {
  draft: "slate",
  generated: "slate",
  intake: "slate",
  sent: "blue",
  accepted: "indigo",
  rejected: "red",
  "changes-requested": "amber",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT_MAP[status] ?? "slate"} className={STATUS_STYLES[status]}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {humanizeStatus(status)}
    </Badge>
  )
}