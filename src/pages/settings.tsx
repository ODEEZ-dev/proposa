import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"
import { Loader2, Save, Upload, X, Palette, FileText, User as UserIcon, TriangleAlert } from "lucide-react"
import { TONE_LABELS } from "../../convex/constants"
import type { Doc } from "../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { RichTextEditor } from "@/components/rich-text-editor"

export default function SettingsPage() {
  const userDoc = useQuery(api.queries.getCurrentUser)
  const upsertUser = useMutation(api.mutations.upsertUser)

  const [businessName, setBusinessName] = useState("")
  const [tagline, setTagline] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#6366F1")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [defaultTerms, setDefaultTerms] = useState("")
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("")
  const [expiryDays, setExpiryDays] = useState("30")
  const [defaultTone, setDefaultTone] = useState("professional")
  const [name, setName] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (userDoc && !loaded) {
      setBusinessName(userDoc.businessName ?? "")
      setTagline(userDoc.tagline ?? "")
      setPrimaryColor(userDoc.primaryColor ?? "#6366F1")
      setLogoUrl(userDoc.logoUrl ?? null)
      setDefaultTerms(userDoc.defaultTerms ?? "")
      setDefaultPaymentTerms(userDoc.defaultPaymentTerms ?? "")
      setExpiryDays(String(userDoc.defaultProposalExpiryDays ?? 30))
      setDefaultTone(userDoc.defaultTone ?? "professional")
      setName(userDoc.name ?? "")
      setLoaded(true)
    }
  }, [userDoc, loaded])

  const handleLogoFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 500_000) {
      toast.error("Logo must be under 500 KB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setLogoUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async (tab: "brand" | "defaults" | "account") => {
    setSaving(true)
    try {
      const patch: Record<string, unknown> = {}
      if (tab === "brand") {
        patch.businessName = businessName.trim() || undefined
        patch.tagline = tagline.trim() || undefined
        patch.primaryColor = primaryColor
        patch.logoUrl = logoUrl ?? undefined
      } else if (tab === "defaults") {
        patch.defaultTerms = defaultTerms || undefined
        patch.defaultPaymentTerms = defaultPaymentTerms.trim() || undefined
        patch.defaultProposalExpiryDays = Number(expiryDays) || 30
        patch.defaultTone = defaultTone as Doc<"users">["defaultTone"]
      } else {
        patch.name = name.trim()
      }
      await upsertUser(patch)
      toast.success("Settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (!userDoc) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your branding, proposal defaults, and account.</p>
      </div>

      <Tabs defaultValue="brand">
        <TabsList>
          <TabsTrigger value="brand" className="gap-1.5">
            <Palette className="h-4 w-4" /> Brand
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-1.5">
            <FileText className="h-4 w-4" /> Proposal Defaults
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5">
            <UserIcon className="h-4 w-4" /> Account
          </TabsTrigger>
        </TabsList>

        {/* Brand */}
        <TabsContent value="brand" className="space-y-6 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="biz-name">Business Name</Label>
            <Input id="biz-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Studio" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Design that converts" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="color">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-card p-1"
              />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-32 font-mono" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogoFile(e.target.files?.[0])}
            />
            {logoUrl ? (
              <div className="flex items-center gap-3 rounded-lg border bg-secondary p-3">
                <img src={logoUrl} alt="Business logo" className="h-12 w-12 rounded-lg object-contain" />
                <span className="flex-1 text-sm text-muted-foreground">Logo attached</span>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Replace
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setLogoUrl(null)} aria-label="Remove logo">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input py-5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
              >
                <Upload className="h-4 w-4" /> Upload logo
              </button>
            )}
          </div>

          {/* Preview card — light paper mockup of the client-facing proposal */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="overflow-hidden rounded-xl border border-border shadow-sm">
              <div className="h-1.5" style={{ backgroundColor: primaryColor }} />
              <div className="bg-white p-6">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo preview" className="h-10 w-10 rounded-lg object-contain" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                      <span className="text-sm font-bold">{(businessName || "P").charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-900">{businessName || "Your Business"}</p>
                    <p className="text-xs text-slate-500">{tagline || "Your tagline here"}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="h-2.5 w-2/3 rounded bg-slate-200" />
                  <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                  <div className="h-2.5 w-3/4 rounded bg-slate-100" />
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <span className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                    Accept Proposal
                  </span>
                  <span className="rounded-lg border border-amber-300 px-4 py-1.5 text-xs font-semibold text-amber-700">
                    Request Changes
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={() => handleSave("brand")} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </TabsContent>

        {/* Proposal defaults */}
        <TabsContent value="defaults" className="space-y-6 pt-4">
          <div className="space-y-1.5">
            <Label>Default Terms &amp; Conditions</Label>
            <RichTextEditor value={defaultTerms} onChange={setDefaultTerms} placeholder="e.g. 50% deposit to begin, 2 rounds of revisions included..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-terms">Default Payment Terms</Label>
            <Input
              id="payment-terms"
              value={defaultPaymentTerms}
              onChange={(e) => setDefaultPaymentTerms(e.target.value)}
              placeholder="Net 15, Net 30, or 50% upfront"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="expiry">Proposal Expiry (days)</Label>
              <Input id="expiry" type="number" min={1} value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tone">Default Tone</Label>
              <Select value={defaultTone} onValueChange={setDefaultTone}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TONE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => handleSave("defaults")} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </TabsContent>

        {/* Account */}
        <TabsContent value="account" className="space-y-6 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="acc-email">Email</Label>
            <Input id="acc-email" value={userDoc.email || "—"} readOnly className="bg-secondary" />
            <p className="text-xs text-muted-foreground">Shown on your profile.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Name</Label>
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={() => handleSave("account")} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>

          <Separator />

          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-red-400" />
              <h3 className="font-bold text-red-300">Danger Zone</h3>
            </div>
            <p className="mt-1 text-sm text-red-400/80">
              Deleting your account removes all your data permanently. This cannot be undone.
            </p>
            <Button variant="destructive" className="mt-4" onClick={() => setDeleteOpen(true)}>
              Delete account
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete your account?"
        description="This will permanently delete your account and all your data. Contact support@proposa.app to complete deletion."
        confirmLabel="Request deletion"
        onConfirm={async () => {
          toast.success("Deletion requested — we'll email you to confirm.")
          setDeleteOpen(false)
        }}
      />
    </div>
  )
}