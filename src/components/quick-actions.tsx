import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, FileText, Users, Briefcase, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function QuickActions({
  onAddClient,
  onAddService,
}: {
  onAddClient?: () => void
  onAddService?: () => void
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const actions = [
    {
      label: "New Proposal",
      icon: FileText,
      onClick: () => navigate("/proposals/new"),
    },
    {
      label: "Add Client",
      icon: Users,
      onClick: () => {
        setOpen(false)
        onAddClient?.()
      },
    },
    {
      label: "Add Service",
      icon: Briefcase,
      onClick: () => {
        setOpen(false)
        onAddService?.()
      },
    },
  ]

  return (
    <TooltipProvider delayDuration={100}>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open &&
            actions.map(({ label, icon: Icon, onClick }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onClick}
                      className="flex h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium text-foreground shadow-lg ring-1 ring-border transition-all hover:bg-secondary hover:shadow-xl"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">{label}</TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close quick actions" : "Quick actions"}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl ring-4 ring-primary/20 transition-colors hover:bg-primary/90"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "x" : "plus"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </TooltipProvider>
  )
}