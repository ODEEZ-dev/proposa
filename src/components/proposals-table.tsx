import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, Pencil, Trash2, FileText, Loader2 } from "lucide-react"
import type { Doc } from "../../convex/_generated/dataModel"
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"
import { cn, initials, avatarColor, formatDate, formatCurrency } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/status-badge"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { EmptyState } from "@/components/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

type ProposalWithClient = {
  proposal: Doc<"proposals">
  client: Pick<Doc<"clients">, "name" | "company" | "logoUrl"> | null
  intake: Doc<"projectIntakes"> | null
}

export function ProposalsTable({
  rows,
  showValue = false,
  showViews = false,
  compact = false,
  emptyTitle = "No proposals yet",
  emptyDescription = "Create your first one and watch it come to life.",
  emptyActionLabel = "Create New Proposal",
  onEmptyAction,
}: {
  rows: ProposalWithClient[]
  showValue?: boolean
  showViews?: boolean
  compact?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
}) {
  const navigate = useNavigate()
  const deleteProposal = useMutation(api.mutations.deleteProposal)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction ?? (() => navigate("/proposals/new"))}
      />
    )
  }

  const handleDelete = async () => {
    if (!confirmId) return
    setDeleting(confirmId)
    try {
      await deleteProposal({ proposalId: confirmId as any })
      toast.success("Proposal deleted")
    } catch {
      toast.error("Failed to delete proposal")
    } finally {
      setDeleting(null)
      setConfirmId(null)
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/80">
              <TableHead>Proposal</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              {showValue && <TableHead className="text-right">Value</TableHead>}
              {showViews && <TableHead className="text-center">Views</TableHead>}
              {!compact && <TableHead>Created</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ proposal, client, intake }) => (
              <TableRow
                key={proposal._id}
                className="cursor-pointer transition-colors hover:bg-secondary/70"
                onClick={() => navigate(`/proposals/${proposal._id}/edit`)}
              >
                <TableCell>
                  <div className="max-w-[240px]">
                    <p className="truncate font-medium text-foreground">{proposal.title}</p>
                    {!compact && proposal.aiSummary && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{proposal.aiSummary}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {client?.logoUrl ? (
                        <AvatarImage src={client.logoUrl} alt={client.name} />
                      ) : null}
                      <AvatarFallback className={cn("text-[10px] text-white", avatarColor(client?.name ?? "?"))}>
                        {initials(client?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{client?.name ?? "Unknown"}</p>
                      {client?.company && <p className="truncate text-xs text-muted-foreground">{client.company}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={proposal.status} />
                </TableCell>
                {showValue && (
                  <TableCell className="text-right font-medium">
                    {formatCurrency(intake?.budgetMax ?? intake?.budgetMin)}
                  </TableCell>
                )}
                {showViews && (
                  <TableCell className="text-center text-sm text-muted-foreground">{proposal.viewCount}</TableCell>
                )}
                {!compact && (
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(proposal.createdAt)}
                  </TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`View ${proposal.title}`}
                      onClick={() => window.open(`/p/${proposal.shareToken}`, "_blank")}
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${proposal.title}`}
                      onClick={() => navigate(`/proposals/${proposal._id}/edit`)}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${proposal.title}`}
                      onClick={() => setConfirmId(proposal._id)}
                      className="hover:text-red-400"
                    >
                      {deleting === proposal._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Delete this proposal?"
        description="This will permanently delete the proposal and its intake record. This action cannot be undone."
        onConfirm={handleDelete}
        loading={deleting !== null}
      />
    </>
  )
}