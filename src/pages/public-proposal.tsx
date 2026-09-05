import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { toast } from "sonner"
import { CheckCircle2, Loader2, MessageSquareWarning, Heart, X } from "lucide-react"
import { formatFullDate, initials, avatarColor, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function PublicProposalPage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const data = useQuery(api.queries.getProposalByShareToken, { shareToken: shareToken ?? "" })
  const recordView = useMutation(api.mutations.recordProposalView)
  const acceptProposal = useMutation(api.mutations.acceptProposalByToken)
  const requestChanges = useMutation(api.mutations.requestChangesByToken)

  const [celebrating, setCelebrating] = useState(false)
  const [changesOpen, setChangesOpen] = useState(false)
  const [changesMessage, setChangesMessage] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (data?.proposal && shareToken) {
      void recordView({ shareToken })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.proposal?._id])

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-4 h-4 w-2/3" />
        <Skeleton className="mt-10 h-96 w-full" />
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <MessageSquareWarning className="h-7 w-7 text-slate-400" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Proposal not found</h1>
        <p className="mt-1 text-sm text-slate-500">
          This link may be invalid or the proposal was removed.
        </p>
      </div>
    )
  }

  const { proposal, client, user } = data
  const alreadyAccepted = proposal.status === "accepted"
  const primaryColor = user?.primaryColor ?? "#6366F1"

  const fireConfetti = () => {
    const colors = [primaryColor, "#818CF8", "#A5B4FC", "#F5B83D", "#6366F1"]
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors })
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 }, colors }), 250)
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 }, colors }), 400)
  }

  const handleAccept = async () => {
    setBusy(true)
    try {
      await acceptProposal({ shareToken: proposal.shareToken })
      fireConfetti()
      setCelebrating(true)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleRequestChanges = async () => {
    if (!changesMessage.trim()) return
    setBusy(true)
    try {
      await requestChanges({ shareToken: proposal.shareToken, message: changesMessage.trim() })
      setChangesOpen(false)
      toast.success("Feedback sent — thank you!")
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const businessName = user?.businessName ?? user?.name ?? "Proposa"
  const tagline = user?.tagline

  return (
    <div className="min-h-screen bg-slate-50">
      <div style={{ borderTop: `4px solid ${primaryColor}` }} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Branding header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            {user?.logoUrl ? (
              <img src={user.logoUrl} alt={`${businessName} logo`} className="h-12 w-12 rounded-xl object-contain" />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-lg font-bold">{initials(businessName)}</span>
              </div>
            )}
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">{businessName}</p>
              {tagline && <p className="text-sm text-slate-500">{tagline}</p>}
            </div>
          </div>
          <p className="text-sm text-slate-400">Proposal dated {formatFullDate(proposal.createdAt)}</p>
        </div>

        {/* Client greeting */}
        <div className="mt-10 flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {client?.logoUrl ? <AvatarImage src={client.logoUrl} alt={client?.name ?? ""} /> : null}
            <AvatarFallback className={cn("text-xs text-white", avatarColor(client?.name ?? "?"))}>
              {initials(client?.name ?? "?")}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-slate-600">
            Prepared for <span className="font-semibold text-slate-900">{client?.name ?? "you"}</span>
            {client?.company ? `, ${client.company}` : ""}
          </p>
        </div>

        {/* Proposal content */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="prose-proposal" dangerouslySetInnerHTML={{ __html: proposal.content }} />
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-2xl border-2 border-dashed p-8 text-center" style={{ borderColor: `${primaryColor}55` }}>
          {alreadyAccepted ? (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                <CheckCircle2 className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">Proposal accepted</h2>
              <p className="mt-1 text-sm text-slate-500">
                Thank you for your business. We'll be in touch shortly.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Ready to move forward?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Accept this proposal to get started, or let us know what to adjust.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="min-w-[200px]"
                  style={{ backgroundColor: primaryColor }}
                  onClick={handleAccept}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Accept Proposal
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="min-w-[200px] border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => setChangesOpen(true)}
                  disabled={busy}
                >
                  Request Changes
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-10 pb-8 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-slate-600"
          >
            <Heart className="h-3.5 w-3.5 text-indigo-500" />
            Built with Proposa
          </a>
        </footer>
      </div>

      {/* Celebration modal */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="relative w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl"
            >
              <button
                onClick={() => setCelebrating(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100"
              >
                <CheckCircle2 className="h-9 w-9 text-indigo-600" />
              </motion.div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Proposal Accepted!</h2>
              <p className="mt-2 text-sm text-slate-500">
                Thank you for your business. We'll be in touch shortly.
              </p>
              <Button className="mt-6 w-full" onClick={() => setCelebrating(false)}>
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request changes modal */}
      <Dialog open={changesOpen} onOpenChange={setChangesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              What would you like to change? Your feedback goes straight to the freelancer.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={5}
            value={changesMessage}
            onChange={(e) => setChangesMessage(e.target.value)}
            placeholder="e.g. Could you reduce the budget, add more detail on the timeline, or..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangesOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="amber"
              onClick={handleRequestChanges}
              disabled={!changesMessage.trim() || busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Send feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}