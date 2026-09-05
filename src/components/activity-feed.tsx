import {
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  UserPlus,
  ClipboardList,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import type { Doc } from "../../convex/_generated/dataModel"
import { timeAgo } from "@/lib/utils"
import { cn } from "@/lib/utils"

type ActivityItem = {
  activity: Doc<"activities">
  proposalTitle: string | null
  clientName: string | null
  clientCompany: string | null
}

const ACTIVITY_META: Record<
  string,
  { icon: LucideIcon; iconBg: string; dot: string; verb: (a: ActivityItem) => string }
> = {
  proposal_created: {
    icon: FileText,
    iconBg: "bg-primary/10 text-primary",
    dot: "bg-primary",
    verb: (a) => `Proposal '${a.proposalTitle ?? "Untitled"}' created for ${a.clientName ?? "client"}`,
  },
  proposal_sent: {
    icon: Send,
    iconBg: "bg-blue-500/15 text-blue-400",
    dot: "bg-blue-400",
    verb: (a) => `Proposal '${a.proposalTitle ?? "Untitled"}' sent to ${a.clientName ?? "client"}`,
  },
  proposal_accepted: {
    icon: CheckCircle2,
    iconBg: "bg-primary/10 text-primary",
    dot: "bg-primary",
    verb: (a) => `Proposal '${a.proposalTitle ?? "Untitled"}' accepted by ${a.clientName ?? "client"}`,
  },
  proposal_rejected: {
    icon: XCircle,
    iconBg: "bg-red-500/15 text-red-400",
    dot: "bg-red-400",
    verb: (a) => `Changes requested on '${a.proposalTitle ?? "Untitled"}' by ${a.clientName ?? "client"}`,
  },
  client_added: {
    icon: UserPlus,
    iconBg: "bg-violet-500/15 text-violet-400",
    dot: "bg-violet-400",
    verb: (a) => `Added client ${a.clientName ?? ""}${a.clientCompany ? ` (${a.clientCompany})` : ""}`,
  },
  intake_completed: {
    icon: ClipboardList,
    iconBg: "bg-amber-500/15 text-amber-400",
    dot: "bg-amber-400",
    verb: (a) => `Intake completed for ${a.clientName ?? "client"}`,
  },
}

export function ActivityFeed({
  activities,
  loading,
}: {
  activities: ActivityItem[]
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">No activity yet — your actions will show up here.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {activities.map((item) => {
        const meta = ACTIVITY_META[item.activity.type] ?? ACTIVITY_META.proposal_created!
        const Icon = meta.icon
        return (
          <li key={item.activity._id} className="flex items-center gap-3 py-3">
            <span className="relative">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", meta.iconBg)}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className={cn("absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card", meta.dot)} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{meta.verb(item)}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(item.activity.createdAt)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}