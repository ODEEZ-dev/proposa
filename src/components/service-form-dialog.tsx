import { useEffect, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"
import { Loader2, Plus, X } from "lucide-react"
import { CATEGORY_LABELS } from "../../convex/constants"
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
import { Switch } from "@/components/ui/switch"

const CATEGORIES = Object.keys(CATEGORY_LABELS)
const PRICE_UNITS = [
  { value: "fixed", label: "Fixed" },
  { value: "hourly", label: "Hourly" },
  { value: "project", label: "Project" },
]

export function ServiceFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Doc<"services"> | null
}) {
  const addService = useMutation(api.mutations.addService)
  const updateService = useMutation(api.mutations.updateService)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string>("web-development")
  const [basePrice, setBasePrice] = useState("")
  const [priceUnit, setPriceUnit] = useState<string>("project")
  const [typicalDuration, setTypicalDuration] = useState("")
  const [deliverables, setDeliverables] = useState<string[]>([])
  const [deliverableInput, setDeliverableInput] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "")
      setDescription(editing?.description ?? "")
      setCategory(editing?.category ?? "web-development")
      setBasePrice(editing?.basePrice != null ? String(editing.basePrice) : "")
      setPriceUnit(editing?.priceUnit ?? "project")
      setTypicalDuration(editing?.typicalDuration ?? "")
      setDeliverables(editing?.deliverables ?? [])
      setDeliverableInput("")
      setIsActive(editing?.isActive ?? true)
      setError("")
    }
  }, [open, editing])

  const addDeliverable = () => {
    const value = deliverableInput.trim()
    if (!value) return
    setDeliverables((prev) => (prev.includes(value) ? prev : [...prev, value]))
    setDeliverableInput("")
  }

  const handleSave = async () => {
    if (!name.trim() || !description.trim()) {
      setError("Name and description are required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category: category as Doc<"services">["category"],
        basePrice: basePrice ? Number(basePrice) : undefined,
        priceUnit: priceUnit as Doc<"services">["priceUnit"],
        typicalDuration: typicalDuration.trim() || undefined,
        deliverables,
        isActive,
      }
      if (editing) {
        await updateService({ serviceId: editing._id, ...payload })
        toast.success("Service updated")
      } else {
        await addService(payload)
        toast.success("Service added")
      }
      onOpenChange(false)
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
          <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
          <DialogDescription>
            Define what you offer so we can match the right services to each proposal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="svc-name">
              Service Name <span className="text-red-400">*</span>
            </Label>
            <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Website Redesign" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="svc-desc">
              Description <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="svc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this service include?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price Unit</Label>
              <Select value={priceUnit} onValueChange={setPriceUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="svc-price">Base Price (optional)</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="2500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-duration">Typical Duration</Label>
              <Input
                id="svc-duration"
                value={typicalDuration}
                onChange={(e) => setTypicalDuration(e.target.value)}
                placeholder="2-3 weeks"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Deliverables</Label>
            <div className="flex flex-wrap gap-2 rounded-lg border p-2">
              {deliverables.map((d) => (
                <span key={d} className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {d}
                  <button
                    onClick={() => setDeliverables((prev) => prev.filter((x) => x !== d))}
                    className="rounded-full hover:text-red-400"
                    aria-label={`Remove ${d}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <div className="flex min-w-[140px] flex-1 items-center">
                <input
                  className="w-full bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder={deliverables.length === 0 ? "Type and press Enter..." : "Add more..."}
                  value={deliverableInput}
                  onChange={(e) => setDeliverableInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addDeliverable()
                    }
                  }}
                />
                <button
                  onClick={addDeliverable}
                  className="rounded-md p-1 text-primary hover:bg-primary/10"
                  aria-label="Add deliverable"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-secondary px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">Inactive services are hidden from new proposals.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save Changes" : "Add Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}