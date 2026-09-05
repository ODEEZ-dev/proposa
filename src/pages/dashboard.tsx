import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import {
  Plus,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { startOfMonth, subMonths, format } from "date-fns"
import { greeting, formatCurrency, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AnimatedCounter } from "@/components/animated-counter"
import { ActivityFeed } from "@/components/activity-feed"
import { ProposalsTable } from "@/components/proposals-table"
import { QuickActions } from "@/components/quick-actions"
import { ClientFormDialog } from "@/components/client-form-dialog"
import { ServiceFormDialog } from "@/components/service-form-dialog"

function WinRateRing({ value, size = 64 }: { value: number; size?: number }) {
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#262A38" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#6366F1"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
        {value}%
      </span>
    </div>
  )
}

function TrendPill({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) {
    if (current <= 0) return null
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
        <TrendingUp className="h-3 w-3" /> New
      </span>
    )
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  const up = pct >= 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        up ? "bg-primary/10 text-primary" : "bg-red-500/15 text-red-400"
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {pct}% vs last month
    </span>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const dashboard = useQuery(api.queries.getDashboardData)
  const proposals = useQuery(api.queries.listProposals, {})
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80 lg:col-span-3" />
        </div>
      </div>
    )
  }

  const nameSource = dashboard.user?.name || dashboard.user?.businessName
  const firstName = nameSource ? nameSource.split(" ")[0] : "there"

  // Chart data: proposals per month for the last 6 months
  const allProposals = proposals ?? []
  const countsByMonth = new Map<string, number>()
  for (const { proposal } of allProposals) {
    const label = format(new Date(proposal.createdAt), "MMM")
    countsByMonth.set(label, (countsByMonth.get(label) ?? 0) + 1)
  }
  const monthly = Array.from({ length: 6 }).map((_, i) => {
    const monthStart = startOfMonth(subMonths(new Date(), 5 - i))
    const label = format(monthStart, "MMM")
    return { month: label, count: countsByMonth.get(label) ?? 0 }
  })

  const recentRows = dashboard.recentProposals.map((r) => ({
    proposal: r.proposal,
    client: r.client ? { name: r.client.name, company: r.client.company ?? "", logoUrl: r.client.logoUrl } : null,
    intake: null,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your proposals</p>
        </div>
        <Button onClick={() => navigate("/proposals/new")} className="shrink-0 sm:self-center">
          <Plus className="h-4 w-4" />
          Create New Proposal
        </Button>
      </div>

      {/* Metrics strip */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border xl:grid-cols-4">
          <div className="bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proposals this month</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
              <AnimatedCounter value={dashboard.proposalsThisMonth} />
            </p>
            <div className="mt-2">
              <TrendPill current={dashboard.proposalsThisMonth} previous={dashboard.proposalsLastMonth} />
            </div>
          </div>
          <div className="bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Win rate</p>
            <div className="mt-2 flex items-center gap-3">
              <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                <AnimatedCounter value={dashboard.winRate} suffix="%" />
              </p>
              <WinRateRing value={dashboard.winRate} size={56} />
            </div>
          </div>
          <div className="bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hours saved</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
              <AnimatedCounter value={dashboard.hoursSaved} suffix="h" />
            </p>
            <p className="mt-2 text-xs text-muted-foreground">4h saved per proposal</p>
          </div>
          <div className="bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue from proposals</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {formatCurrency(dashboard.revenue)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Accepted, all time</p>
          </div>
        </div>
      </Card>

      {/* Chart + activity */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Proposals — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252938" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9DA3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9DA3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.10)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #252938", backgroundColor: "#1A1D27", color: "#E7E9F0", fontSize: 13 }}
                />
                <Bar dataKey="count" name="Proposals" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={dashboard.activities} />
          </CardContent>
        </Card>
      </div>

      {/* Recent proposals */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Recent Proposals</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/proposals")}>
            View all
          </Button>
        </div>
        <ProposalsTable
          rows={recentRows}
          emptyTitle="No proposals yet"
          emptyDescription="Create your first one in under a minute."
          emptyActionLabel="Create New Proposal"
          onEmptyAction={() => navigate("/proposals/new")}
        />
      </div>

      {/* Quick actions */}
      <QuickActions onAddClient={() => setClientDialogOpen(true)} onAddService={() => setServiceDialogOpen(true)} />

      <ClientFormDialog open={clientDialogOpen} onOpenChange={setClientDialogOpen} />
      <ServiceFormDialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen} />
    </div>
  )
}