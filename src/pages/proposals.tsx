import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"
import { Search, Plus, Trash2, FileText } from "lucide-react"
import type { Doc } from "../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/empty-state"
import { ProposalsTable } from "@/components/proposals-table"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { cn, formatCurrency, timeAgo } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials, avatarColor } from "@/lib/utils"

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "changes-requested", label: "Changes Requested" },
]

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "client", label: "By client" },
]

export default function ProposalsPage() {
  const navigate = useNavigate()
  const rows = useQuery(api.queries.listProposals, {})
  const deleteProposal = useMutation(api.mutations.deleteProposal)
  const updateProposal = useMutation(api.mutations.updateProposal)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("newest")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState("")
  const [bulkBusy, setBulkBusy] = useState(false)

  const filtered = useMemo(() => {
    if (!rows) return []
    let list = [...rows]
    const q = search.toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.proposal.title.toLowerCase().includes(q) ||
          (r.client?.name ?? "").toLowerCase().includes(q)
      )
    }
    if (status !== "all") list = list.filter((r) => r.proposal.status === status)
    if (sort === "newest") list.sort((a, b) => b.proposal.createdAt - a.proposal.createdAt)
    if (sort === "oldest") list.sort((a, b) => a.proposal.createdAt - b.proposal.createdAt)
    if (sort === "client")
      list.sort((a, b) => (a.client?.name ?? "").localeCompare(b.client?.name ?? ""))
    return list
  }, [rows, search, status, sort])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    setBulkBusy(true)
    try {
      for (const id of selected) {
        await deleteProposal({ proposalId: id as any })
      }
      toast.success(`${selected.size} proposal${selected.size > 1 ? "s" : ""} deleted`)
      setSelected(new Set())
      setBulkDeleteOpen(false)
    } catch {
      toast.error("Failed to delete some proposals")
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkStatus = async (value: string) => {
    setBulkStatus(value)
    if (value === "all") return
    try {
      for (const id of selected) {
        await updateProposal({ proposalId: id as any, status: value as Doc<"proposals">["status"] })
      }
      toast.success(`Marked ${selected.size} as ${value.replace("-", " ")}`)
      setSelected(new Set())
    } catch {
      toast.error("Failed to update status")
    } finally {
      setBulkStatus("")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">All Proposals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track and manage every proposal</p>
        </div>
        <Button onClick={() => navigate("/proposals/new")}>
          <Plus className="h-4 w-4" /> Create New Proposal
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search proposals..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <span className="text-sm font-semibold text-primary">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Select value={bulkStatus} onValueChange={handleBulkStatus}>
              <SelectTrigger className="h-8 w-[190px] bg-card">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.filter((f) => f.value !== "all").map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/15"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {rows === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : filtered.length === 0 ? (
        rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No proposals yet"
            description="Create your first proposal in under a minute."
            actionLabel="Create New Proposal"
            onAction={() => navigate("/proposals/new")}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No matches found"
            description="Try a different search or filter."
          />
        )
      ) : selected.size > 0 ? (
        // Selection mode table with checkboxes
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/80">
                <TableHead className="w-10" />
                <TableHead>Proposal</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-center">Views</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ proposal, client, intake }) => (
                <TableRow key={proposal._id} className="hover:bg-secondary/70">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(proposal._id)}
                      onChange={() => toggleSelect(proposal._id)}
                      className="h-4 w-4 rounded border-input accent-primary"
                      aria-label={`Select ${proposal.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[220px] truncate font-medium text-foreground">{proposal.title}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {client?.logoUrl ? <AvatarImage src={client.logoUrl} alt={client?.name ?? ""} /> : null}
                        <AvatarFallback className={cn("text-[9px] text-white", avatarColor(client?.name ?? "?"))}>
                          {initials(client?.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{client?.name ?? "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={proposal.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(intake?.budgetMax ?? intake?.budgetMin)}
                  </TableCell>
                  <TableCell className="text-center text-sm">{proposal.viewCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{timeAgo(proposal.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ProposalsTable rows={filtered} showValue showViews />
      )}

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selected.size} proposal${selected.size > 1 ? "s" : ""}?`}
        description="This action cannot be undone. The proposals and their intake records will be permanently deleted."
        onConfirm={handleBulkDelete}
        loading={bulkBusy}
      />
    </div>
  )
}