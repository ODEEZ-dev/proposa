import { useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"
import { Loader2, Upload, X } from "lucide-react"
import { INDUSTRIES } from "../../convex/constants"
import type { Doc } from "../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

export function ClientFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Doc<"clients"> | null
  onSaved?: (clientId: string) => void
}) {
  const addClient = useMutation(api.mutations.addClient)
  const updateClient = useMutation(api.mutations.updateClient)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [industry, setIndustry] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "")
      setEmail(editing?.email ?? "")
      setCompany(editing?.company ?? "")
      setIndustry(editing?.industry ?? "")
      setNotes(editing?.notes ?? "")
      setLogoUrl(editing?.logoUrl ?? null)
      setError("")
    }
  }, [open, editing])

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

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        industry: industry || undefined,
        notes: notes.trim() || undefined,
        logoUrl: logoUrl ?? undefined,
      }
      let id: string
      if (editing) {
        await updateClient({ clientId: editing._id, ...payload })
        id = editing._id
        toast.success("Client updated")
      } else {
        id = await addClient(payload)
        toast.success("Client added")
      }
      onOpenChange(false)
      onSaved?.(id)
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Client" : "Add Client"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this client's details." : "Add a client so you can create proposals for them."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="client-name">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-email">
                Email <span className="text-red-400">*</span>
              </Label>
              <Input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="client-company">Company</Label>
              <Input id="client-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-industry">Industry</Label>
              <Select value={industry || undefined} onValueChange={setIndustry}>
                <SelectTrigger id="client-industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <img src={logoUrl} alt="Client logo" className="h-10 w-10 rounded-lg object-contain" />
                <span className="flex-1 text-sm text-muted-foreground">Logo attached</span>
                <button
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-red-400"
                  onClick={() => setLogoUrl(null)}
                  aria-label="Remove logo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
              >
                <Upload className="h-4 w-4" /> Upload logo (optional)
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea id="client-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any context about this client..." rows={3} />
          </div>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save Changes" : "Add Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}