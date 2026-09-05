import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"
import { Briefcase, Plus, Pencil, Trash2 } from "lucide-react"
import { CATEGORY_LABELS } from "../../convex/constants"
import type { Doc } from "../../convex/_generated/dataModel"
import { formatCurrencyFull, humanizeStatus } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { EmptyState } from "@/components/empty-state"
import { ServiceFormDialog } from "@/components/service-form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const CATEGORY_BADGE: Record<string, "blue" | "pink" | "amber" | "purple" | "orange" | "slate"> = {
  "web-development": "blue",
  design: "pink",
  marketing: "amber",
  consulting: "purple",
  content: "orange",
  other: "slate",
}

export default function ServicesPage() {
  const services = useQuery(api.queries.listServices)
  const toggleService = useMutation(api.mutations.updateService)
  const deleteService = useMutation(api.mutations.deleteService)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Doc<"services"> | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleToggle = async (service: Doc<"services">) => {
    try {
      await toggleService({ serviceId: service._id, isActive: !service.isActive })
    } catch {
      toast.error("Failed to update service")
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    setDeleting(true)
    try {
      await deleteService({ serviceId: confirmId as any })
      toast.success("Service deleted")
    } catch {
      toast.error("Failed to delete service")
    } finally {
      setDeleting(false)
      setConfirmId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">Define what you offer so we can match the right services to each proposal</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Service
        </Button>
      </div>

      {services === undefined ? (
        <Skeleton className="h-72 w-full" />
      ) : services.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No services defined"
          description="Add a service so we can reference your offerings when writing proposals."
          actionLabel="Add a service"
          onAction={() => { setEditing(null); setDialogOpen(true) }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/80">
                <TableHead>Service Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service._id} className="hover:bg-secondary/60">
                  <TableCell>
                    <div className="max-w-[260px]">
                      <p className="font-medium text-foreground">{service.name}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={CATEGORY_BADGE[service.category] ?? "slate"}>
                      {CATEGORY_LABELS[service.category] ?? humanizeStatus(service.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{service.basePrice != null ? formatCurrencyFull(service.basePrice) : "—"}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{service.priceUnit}</TableCell>
                  <TableCell className="text-muted-foreground">{service.typicalDuration ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={service.isActive}
                        onCheckedChange={() => handleToggle(service)}
                        aria-label={`Toggle ${service.name}`}
                      />
                      <span className={`text-xs font-medium ${service.isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {service.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${service.name}`}
                        onClick={() => { setEditing(service); setDialogOpen(true) }}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${service.name}`}
                        className="hover:text-red-400"
                        onClick={() => setConfirmId(service._id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ServiceFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Delete this service?"
        description="This service will be removed from your catalog. Existing proposals are not affected."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}