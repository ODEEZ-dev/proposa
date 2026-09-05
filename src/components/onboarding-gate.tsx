import { useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { motion } from "framer-motion"
import confetti from "canvas-confetti"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Wand2,
  Upload,
  X,
} from "lucide-react"
import { ONBOARDING_SERVICE_TEMPLATES } from "../../convex/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const STEPS = ["Business name", "Your services", "Logo"]

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const currentUser = useQuery(api.queries.getCurrentUser)
  const completeOnboarding = useMutation(api.mutations.completeOnboarding)

  const [step, setStep] = useState(0)
  const [businessName, setBusinessName] = useState("")
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const needsOnboarding =
    currentUser !== undefined && (currentUser === null || !currentUser.businessName)

  if (currentUser === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!needsOnboarding) return <>{children}</>

  const toggleService = (name: string) => {
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    )
  }

  const handleLogoFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 500_000) return
    const reader = new FileReader()
    reader.onload = () => setLogoUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const canContinue =
    step === 0 ? businessName.trim().length > 0 : step === 1 ? selectedServices.length > 0 : true

  const handleFinish = async () => {
    setSaving(true)
    try {
      await completeOnboarding({
        businessName: businessName.trim(),
        serviceNames: selectedServices,
        logoUrl: logoUrl ?? undefined,
      })
      confetti({
        particleCount: 180,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#F59E0B"],
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-xl"
        >
          {/* Progress */}
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Step {step + 1} of 3 — {STEPS[step]}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{Math.round(((step + 1) / 3) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${((step + 1) / 3) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                What's your business name?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This will appear on every proposal you send.
              </p>
              <div className="mt-6">
                <Label htmlFor="business-name">Business name</Label>
                <Input
                  id="business-name"
                  className="mt-1.5 h-11"
                  placeholder="Acme Studio"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                What services do you offer?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select all that apply — these help us write better proposals.
              </p>
              <div className="mt-6 grid gap-2">
                {ONBOARDING_SERVICE_TEMPLATES.map((s) => {
                  const selected = selectedServices.includes(s.name)
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => toggleService(s.name)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/40 hover:bg-primary/10"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                            selected
                              ? "border-primary bg-primary text-white"
                              : "border-input bg-card"
                        )}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-foreground">{s.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{s.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Upload your logo
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional — you can add it later in Settings.
              </p>
              <div className="mt-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoFile(e.target.files?.[0])}
                />
                {logoUrl ? (
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary p-4">
                    <img src={logoUrl} alt="Logo preview" className="h-16 w-16 rounded-lg object-contain" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Logo uploaded</p>
                      <button
                        className="mt-1 flex items-center gap-1 text-xs font-medium text-red-400 hover:underline"
                        onClick={() => setLogoUrl(null)}
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-input bg-secondary p-8 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/10"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Click to upload</span>
                    <span className="text-xs">PNG, JPG or SVG up to 500 KB</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={saving} className="min-w-[140px]">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Get started"}
              </Button>
            )}
          </div>
          {step === 2 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Or{" "}
              <button
                className="font-medium text-primary hover:underline"
                onClick={handleFinish}
                disabled={saving}
              >
                skip for now
              </button>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}