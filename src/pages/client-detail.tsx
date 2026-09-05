import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import {
  ArrowLeft,
  FileText,
  Target,
  DollarSign,
  Plus,
  Save,
  Check,
  Loader2,
} from "lucide-react"
import { cn, initials, avatarColor, humanizeStatus, formatCurrencyFull } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ProposalsTable } from "@/components/proposals-table"
import { EmptyState } from "@/components/empty-state"
import { Separator } from "@/components/ui/separator"

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const data = useQuery(api.queries.getClient, { clientId: clientId as any })
  const updateClient = useMutation(api.mutations.updateClient)

  const [notes, setNotes] = useState("")
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (data?.client && !notesLoaded) {
      setNotes(data.client.notes ?? "")
      setNotesLoaded(true)
    }
  }, [data, notesLoaded])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setSaveState("saving")
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await updateClient({ clientId: data!.client._id, notes: value })
        setSaveState("saved")
        setTimeout(() => setSaveState("idle"), 2000)
      } catch {
        setSaveState("idle")
      }
    }, 800)
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const { client, proposals } = data
  const sent = proposals.filter((p) => p.status !== "draft")
  const accepted = proposals.filter((p) => p.status === "accepted")
  const winRate = sent.length > 0 ? Math.round((accepted.length / sent.length) * 100) : 0
  const avgValue = accepted.length > 0 ? client.totalValue / accepted.length : 0

  const rows = proposals.map((p) => ({
    proposal: p,
    client: {
      name: client.name,
      company: client.company ?? "",
      logoUrl: client.logoUrl,
    },
    intake: null,
  }))

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => navigate("/clients")}>
        <ArrowLeft className="h-4 w-4" /> Back to Clients
      </Button>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 rounded-2xl">
            {client.logoUrl ? <AvatarImage src={client.logoUrl} alt={client.name} className="rounded-2xl" /> : null}
            <AvatarFallback className={cn("rounded-2xl text-xl text-white", avatarColor(client.name))}>
              {initials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{client.name}</h1>
              {client.industry && <Badge variant="secondary">{humanizeStatus(client.industry)}</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {client.company ? `${client.company} · ` : ""}
              {client.email}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/proposals/new?client=${client._id}`)}>
          <Plus className="h-4 w-4" /> New Proposal for This Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4.5 w-4.5 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{proposals.length}</p>
            <p className="text-sm text-muted-foreground">Total Proposals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
              <Target className="h-4.5 w-4.5 text-blue-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{winRate}%</p>
            <p className="text-sm text-muted-foreground">Win Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15">
              <DollarSign className="h-4.5 w-4.5 text-violet-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{formatCurrencyFull(client.totalValue)}</p>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15">
              <DollarSign className="h-4.5 w-4.5 text-amber-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{formatCurrencyFull(avgValue)}</p>
            <p className="text-sm text-muted-foreground">Avg. Proposal Value</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Proposals */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold tracking-tight text-foreground">Proposal History</h2>
          {proposals.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No proposals for this client yet"
              description="Create your first proposal for this client."
              actionLabel="Create Proposal"
              onAction={() => navigate(`/proposals/new?client=${client._id}`)}
            />
          ) : (
            <ProposalsTable rows={rows} compact />
          )}
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Notes</h2>
            {saveState === "saving" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving
              </span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            {saveState === "idle" && notes.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Save className="h-3 w-3" /> Auto-saves
              </span>
            )}
          </div>
          <Separator className="my-3" />
          <Textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add context about this client — preferences, goals, communication style..."
            rows={12}
            className="resize-none"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Notes are saved automatically and only visible to you.
          </p>
        </div>
      </div>
    </div>
  )
}