import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Search,
  Wand2,
  UserPlus,
  X,
} from "lucide-react"
import { PROJECT_TYPES, TIMELINE_LABELS, CATEGORY_LABELS, BUDGET_MIN, BUDGET_MAX } from "../../convex/constants"
import type { Doc } from "../../convex/_generated/dataModel"
import { cn, initials, avatarColor, formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ClientFormDialog } from "@/components/client-form-dialog"
import { Badge } from "@/components/ui/badge"

const STEPS = ["Select Client", "Project Details", "Scope & Budget", "Review & Generate"]

type Client = Doc<"clients">
type Service = Doc<"services">

// ── Dual handle budget slider ──────────────────────────────────
function BudgetSlider({ onChange }: { onChange: (lo: number, hi: number) => void }) {
  const [lo, setLo] = useState(5000)
  const [hi, setHi] = useState(15000)

  const commit = (l: number, h: number) => {
    setLo(l)
    setHi(h)
    onChange(l, h)
  }

  const loPct = ((lo - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100
  const hiPct = ((hi - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-primary">
          {formatCurrency(lo)} - {formatCurrency(hi)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">Up to {formatCurrency(BUDGET_MAX)}+</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted">
        <div
          className="absolute h-full rounded-full bg-primary"
          style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }}
        />
        <input
          type="range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={500}
          value={lo}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi - 500)
            commit(v, hi)
          }}
          className="range-input absolute -top-1.5 left-0 h-5 w-full"
          aria-label="Minimum budget"
        />
        <input
          type="range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={500}
          value={hi}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo + 500)
            commit(lo, v)
          }}
          className="range-input absolute -top-1.5 left-0 h-5 w-full"
          aria-label="Maximum budget"
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(BUDGET_MIN)}</span>
        <span>{formatCurrency(BUDGET_MAX)}</span>
      </div>
    </div>
  )
}

// ── Generation overlay ─────────────────────────────────────────
function GenerationOverlay({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const completedRef = useRef(false)

  useEffect(() => {
    if (!visible) {
      setStep(0)
      completedRef.current = false
      return
    }
    const t1 = setTimeout(() => setStep(1), 1600)
    const t2 = setTimeout(() => setStep(2), 3400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [visible])

  const stepLabels = [
    "Analyzing project scope and requirements...",
    "Matching services from your catalog...",
    "Writing your personalized proposal...",
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Generating proposal"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm space-y-6 text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Loader2 className="h-7 w-7 text-white animate-spin" />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Crafting your proposal
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">This usually takes about 30 seconds</p>
            </div>

            <div className="space-y-3 text-left">
              {stepLabels.map((label, i) => {
                const isActive = step === i
                const isDone = step > i
                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isDone
                        ? "text-primary"
                        : isActive
                          ? "bg-primary/10 text-foreground font-medium"
                          : "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        isDone
                          ? "bg-primary text-white"
                          : isActive
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    {label}
                  </motion.div>
                )
              })}
            </div>

            <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 18, ease: "linear" }}
              />
            </div>

            <button
              onClick={onDone}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-muted-foreground"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function NewProposalPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clients = useQuery(api.queries.listClients)
  const services = useQuery(api.queries.listServices)
  const createIntake = useMutation(api.mutations.createIntake)
  const generateProposal = useAction(api.actions.generateProposal)

  const [step, setStep] = useState(0)
  const [client, setClient] = useState<Client | null>(null)
  const [projectType, setProjectType] = useState("")
  const [scopeDescription, setScopeDescription] = useState("")
  const [industry, setIndustry] = useState("")
  const [budgetMin, setBudgetMin] = useState(5000)
  const [budgetMax, setBudgetMax] = useState(15000)
  const [timeline, setTimeline] = useState("")
  const [deliverables, setDeliverables] = useState<string[]>([])
  const [specialRequirements, setSpecialRequirements] = useState("")
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Preselect client from query param
  useEffect(() => {
    const clientId = searchParams.get("client")
    if (clientId && clients && !client) {
      const match = clients.find((c) => c._id === clientId)
      if (match) {
        setClient(match)
        setIndustry(match.industry ?? "")
      }
    }
  }, [searchParams, clients, client])

  const activeServices = useMemo(() => (services ?? []).filter((s) => s.isActive), [services])

  const groupedServices = useMemo(() => {
    const groups = new Map<string, Service[]>()
    for (const s of activeServices) {
      const arr = groups.get(s.category) ?? []
      arr.push(s)
      groups.set(s.category, arr)
    }
    return Array.from(groups.entries()).sort((a, b) =>
      CATEGORY_LABELS[a[0]]!.localeCompare(CATEGORY_LABELS[b[0]]!)
    )
  }, [activeServices])

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase()
    return (clients ?? []).filter(
      (c) => c.name.toLowerCase().includes(q) || (c.company ?? "").toLowerCase().includes(q)
    )
  }, [clients, clientSearch])

  const canContinue =
    step === 0
      ? client !== null
      : step === 1
        ? projectType.trim().length > 0 && scopeDescription.trim().length > 0
        : step === 2
          ? timeline !== ""
          : true

  const handleClientSaved = (id: string) => {
    const match = (clients ?? []).find((c) => c._id === id)
    if (match) {
      setClient(match)
      if (!industry) setIndustry(match.industry ?? "")
    }
  }

  const handleGenerate = async () => {
    if (!client) return
    setGenerating(true)
    try {
      const intakeId = await createIntake({
        clientId: client._id,
        projectType: projectType.trim(),
        scopeDescription: scopeDescription.trim(),
        budgetMin,
        budgetMax,
        timeline: timeline as Doc<"projectIntakes">["timeline"],
        deliverables,
        specialRequirements: specialRequirements.trim() || undefined,
      })
      const { proposalId } = await generateProposal({ intakeId })
      setGenerating(false)
      navigate(`/proposals/${proposalId}/edit`)
    } catch {
      setGenerating(false)
      toast.error("Something went wrong. Please try again.")
    }
  }

  const selectClient = (c: Client) => {
    setClient(c)
    setIndustry((prev) => prev || (c.industry ?? ""))
    setClientDropdownOpen(false)
    setClientSearch("")
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create New Proposal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Answer a few questions and we'll draft a proposal for you.</p>
      </div>

      {/* Step indicator */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-secondary/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2 last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    i < step
                      ? "bg-primary text-white"
                      : i === step
                        ? "bg-primary text-white ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-semibold sm:block",
                    i === step ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary transition-all duration-300",
                      i < step ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1 */}
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {client && (
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
                <Avatar className="h-10 w-10">
                  {client.logoUrl ? <AvatarImage src={client.logoUrl} alt={client.name} /> : null}
                  <AvatarFallback className={cn("text-white", avatarColor(client.name))}>
                    {initials(client.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.company ?? client.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setClient(null)}>
                  <X className="h-4 w-4" /> Change
                </Button>
              </div>
            )}

            <div className="relative">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-between text-left font-normal"
                onClick={() => {
                  setClientDropdownOpen((o) => !o)
                  setTimeout(() => searchRef.current?.focus(), 50)
                }}
              >
                {client ? (
                  <span className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      {client.logoUrl ? <AvatarImage src={client.logoUrl} alt={client.name} /> : null}
                      <AvatarFallback className="text-[8px] text-white">{initials(client.name)}</AvatarFallback>
                    </Avatar>
                    {client.name} {client.company ? `— ${client.company}` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Search or select a client...</span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>

              <AnimatePresence>
                {clientDropdownOpen && (
                  <>
                    <motion.div
                      className="fixed inset-0 z-30"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setClientDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-xl border bg-card shadow-xl"
                    >
                      <div className="flex items-center gap-2 border-b px-3 py-2.5">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <input
                          ref={searchRef}
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Search clients..."
                          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="max-h-72 overflow-y-auto p-1.5">
                        {filteredClients.length === 0 && (
                          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No clients found
                          </p>
                        )}
                        {filteredClients.map((c) => (
                          <button
                            key={c._id}
                            onClick={() => selectClient(c)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                          >
                            <Avatar className="h-8 w-8">
                              {c.logoUrl ? <AvatarImage src={c.logoUrl} alt={c.name} /> : null}
                              <AvatarFallback className={cn("text-xs text-white", avatarColor(c.name))}>
                                {initials(c.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{c.company ?? c.email}</span>
                            </span>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setClientDropdownOpen(false)
                            setClientDialogOpen(true)
                          }}
                          className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-3 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          <UserPlus className="h-4 w-4" /> Add New Client
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="space-y-1.5">
              <Label>Project Type *</Label>
              <Select value={projectType || undefined} onValueChange={setProjectType}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scope">Brief Description *</Label>
              <Textarea
                id="scope"
                rows={5}
                value={scopeDescription}
                onChange={(e) => setScopeDescription(e.target.value)}
                placeholder="Tell us what the client needs..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Technology"
                disabled={!client}
              />
              {!client && <p className="text-xs text-muted-foreground">Select a client first to auto-fill.</p>}
            </div>
          </motion.div>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <div className="space-y-3">
              <Label>Budget Range</Label>
              <BudgetSlider
                onChange={(lo, hi) => {
                  setBudgetMin(lo)
                  setBudgetMax(hi)
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Timeline *</Label>
              <Select value={timeline || undefined} onValueChange={setTimeline}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIMELINE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Deliverables</Label>
              {groupedServices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-input bg-secondary p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No active services in your catalog yet.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/services")}>
                    Add services
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedServices.map(([category, services]) => (
                    <div key={category}>
                      <Badge variant="secondary" className="mb-2">
                        {CATEGORY_LABELS[category]}
                      </Badge>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {services.map((s) => {
                          const selected = deliverables.includes(s._id)
                          return (
                            <button
                              key={s._id}
                              type="button"
                              onClick={() =>
                                setDeliverables((prev) =>
                                  selected
                                    ? prev.filter((d) => d !== s._id)
                                    : [...prev, s._id]
                                )
                              }
                              className={cn(
                                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                                selected
                                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                                  : "border-border hover:border-primary/40 hover:bg-primary/10"
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                                  selected
                                    ? "border-primary bg-primary text-white"
                                    : "border-input"
                                )}
                              >
                                {selected && <Check className="h-3.5 w-3.5" />}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-foreground">{s.name}</span>
                                <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                                  {s.description}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="special">Special Requirements</Label>
              <Textarea
                id="special"
                rows={3}
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                placeholder="Any must-haves, competitor references, or constraints?"
              />
            </div>
          </motion.div>
        )}

        {/* STEP 4 */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="border-b bg-secondary px-6 py-4">
                <h2 className="font-bold text-foreground">Review your proposal brief</h2>
              </div>
              <dl className="divide-y divide-border">
                {[
                  {
                    label: "Client",
                    value: client ? `${client.name}${client.company ? `, ${client.company}` : ""}` : "—",
                  },
                  { label: "Project", value: projectType },
                  { label: "Budget", value: `${formatCurrency(budgetMin)} - ${formatCurrency(budgetMax)}` },
                  { label: "Timeline", value: TIMELINE_LABELS[timeline] ?? timeline },
                  { label: "Deliverables", value: `${deliverables.length} items selected` },
                  { label: "Industry", value: industry || "—" },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 px-6 py-3.5">
                    <dt className="text-sm font-medium text-muted-foreground">{row.label}</dt>
                    <dd className="text-right text-sm font-semibold text-foreground">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <Button size="xl" className="w-full" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Wand2 className="h-5 w-5" />
              )}
              Generate Proposal
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              We'll draft a full proposal from your answers in under 60 seconds.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav buttons */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || generating}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Review above, then generate
          </span>
        )}
      </div>

      <ClientFormDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        onSaved={handleClientSaved}
      />

      <GenerationOverlay visible={generating} onDone={() => setGenerating(false)} />
    </div>
  )
}