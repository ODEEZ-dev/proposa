import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Users, Plus, ArrowRight } from "lucide-react"
import { cn, initials, avatarColor, humanizeStatus } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ClientFormDialog } from "@/components/client-form-dialog"
import { motion } from "framer-motion"

export default function ClientsPage() {
  const navigate = useNavigate()
  const clients = useQuery(api.queries.listClients)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your client relationships</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {clients === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client to start generating proposals."
          actionLabel="Add your first client"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((client, i) => (
            <motion.div
              key={client._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className="group relative cursor-pointer rounded-xl border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => navigate(`/clients/${client._id}`)}
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 rounded-xl">
                  {client.logoUrl ? (
                    <AvatarImage src={client.logoUrl} alt={client.name} className="rounded-xl" />
                  ) : null}
                  <AvatarFallback className={cn("rounded-xl text-base text-white", avatarColor(client.name))}>
                    {initials(client.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold text-foreground">{client.name}</h3>
                  <p className="truncate text-sm text-muted-foreground">{client.company ?? "—"}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {client.industry && <Badge variant="secondary">{humanizeStatus(client.industry)}</Badge>}
                <span className="text-xs text-muted-foreground">{client.email}</span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <div className="text-sm">
                  <span className="font-semibold text-foreground">{client.proposalCount}</span>
                  <span className="text-muted-foreground"> proposals</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="font-semibold text-foreground">{client.winRate}%</span>
                  <span className="text-muted-foreground"> win rate</span>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View Details <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}