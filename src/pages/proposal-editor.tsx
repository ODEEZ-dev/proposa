import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  ExternalLink,
  Loader2,
  Send,
  Save,
  Radio,
} from "lucide-react"
import { timeAgo, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/status-badge"
import { RichTextEditor } from "@/components/rich-text-editor"
import { AiAssistant } from "@/components/ai-assistant"

export default function ProposalEditorPage() {
  const { proposalId } = useParams<{ proposalId: string }>()
  const navigate = useNavigate()
  const data = useQuery(api.queries.getProposal, { proposalId: proposalId as any })
  const updateProposal = useMutation(api.mutations.updateProposal)
  const sendProposal = useMutation(api.mutations.sendProposal)
  const generateShareToken = useAction(api.actions.generateShareToken)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [sending, setSending] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (data?.proposal && !loaded) {
      setTitle(data.proposal.title)
      setContent(data.proposal.content)
      setLoaded(true)
    }
  }, [data, loaded])

  const persist = async (patch: { title?: string; content?: string }) => {
    if (!data?.proposal) return
    setSaveState("saving")
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await updateProposal({ proposalId: data.proposal._id, ...patch })
        setSaveState("saved")
        setTimeout(() => setSaveState("idle"), 2000)
      } catch {
        setSaveState("idle")
      }
    }, 700)
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-[560px] lg:col-span-3" />
          <Skeleton className="h-[560px] lg:col-span-2" />
        </div>
      </div>
    )
  }

  const { proposal, client, intake } = data
  const shareUrl = `${window.location.origin}/p/${proposal.shareToken}`
  const isViewingRecently = proposal.lastViewedAt != null && Date.now() - proposal.lastViewedAt < 2 * 60 * 1000

  const copyShareLink = async () => {
    try {
      let url = shareUrl
      if (!proposal.shareToken) {
        const { relativeUrl } = await generateShareToken({ proposalId: proposal._id })
        url = `${window.location.origin}${relativeUrl}`
      }
      // navigator.clipboard only works in secure contexts (HTTPS/localhost),
      // so fall back to a hidden textarea + execCommand for plain-HTTP demos.
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement("textarea")
        ta.value = url
        ta.style.position = "fixed"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        ta.remove()
      }
      toast.success("Link copied!")
    } catch {
      toast.error("Couldn't copy link")
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      await sendProposal({ proposalId: proposal._id })
      toast.success("Proposal sent to client!")
    } catch {
      toast.error("Something went wrong sending the proposal")
    } finally {
      setSending(false)
    }
  }

  const handleSaveNow = async () => {
    try {
      await updateProposal({ proposalId: proposal._id, title, content })
      toast.success("Draft saved")
    } catch {
      toast.error("Failed to save")
    }
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              void persist({ title: e.target.value })
            }}
            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-bold tracking-tight text-foreground outline-none transition-colors hover:border-border focus:border-primary/60 focus:bg-card"
            aria-label="Proposal title"
          />
          <p className="px-2 text-xs text-muted-foreground">
            {client?.name ?? "Unknown client"}
            {client?.company ? ` · ${client.company}` : ""}
            {intake?.projectType ? ` · ${intake.projectType}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <StatusBadge status={proposal.status} />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveNow}>
            <Save className="h-4 w-4" /> Save Draft
          </Button>
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            <Copy className="h-4 w-4" /> Copy Share Link
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(shareUrl, "_blank")}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button size="sm" onClick={handleSend} disabled={sending || proposal.status === "sent"}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {proposal.status === "sent" ? "Sent" : "Send to Client"}
          </Button>
        </div>
      </div>

      {/* Live status strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-2 text-xs text-muted-foreground shadow-sm">
        <span className="flex items-center gap-1.5">
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{proposal.viewCount}</span> views
        </span>
        {proposal.lastViewedAt && (
          <span>Last viewed {timeAgo(proposal.lastViewedAt)}</span>
        )}
        {isViewingRecently && (
          <span className="flex items-center gap-1.5 font-semibold text-primary">
            <Radio className="h-3.5 w-3.5 animate-pulse" /> Client is viewing
          </span>
        )}
      </div>

      {/* Split screen */}
      <div className={cn("grid gap-4 lg:grid-cols-5", "lg:h-[calc(100vh-13rem)]")}>
        <div className="lg:col-span-3 lg:h-full lg:overflow-hidden">
          <RichTextEditor
            value={content}
            onChange={(html) => {
              setContent(html)
              void persist({ content: html })
            }}
          />
        </div>
        <div className="lg:col-span-2 lg:h-full">
          <div className="lg:h-full">
            <AiAssistant proposalId={proposal._id} onApplyContent={(html) => void persist({ content: html })} />
          </div>
        </div>
      </div>
    </div>
  )
}