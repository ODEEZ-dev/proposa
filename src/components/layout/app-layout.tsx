import { useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Settings,
  Menu,
  X,
  FileText as FileTextIcon,
} from "lucide-react"
import { cn, initials, avatarColor } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { OnboardingGate } from "@/components/onboarding-gate"
import { AnimatePresence, motion } from "framer-motion"

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/services", label: "Services", icon: Briefcase },
  { to: "/proposals", label: "Proposals", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
]

export function AppLayout() {
  const currentUser = useQuery(api.queries.getCurrentUser)
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = currentUser?.name || currentUser?.businessName || "Demo User"
  const email = currentUser?.email || "Local demo"
  const avatarUrl = currentUser?.avatarUrl ?? undefined

  const closeMobile = () => setMobileOpen(false)

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 pt-2">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={closeMobile}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon className={cn("h-4.5 w-4.5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  const userBlock = (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className={cn("text-white", avatarColor(displayName))}>{initials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>
    </div>
  )

  const logo = (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
        <FileTextIcon className="h-5 w-5" />
      </div>
      <span className="text-xl font-bold tracking-tight text-foreground">Proposa</span>
    </div>
  )

  return (
    <OnboardingGate>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card lg:flex">
          {logo}
          {nav}
          {userBlock}
        </aside>

        {/* Mobile header */}
        <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <button
            className="flex items-center gap-2"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5 text-foreground" />
            <span className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
                <FileTextIcon className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-foreground">Proposa</span>
            </span>
          </button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className={cn("text-xs text-white", avatarColor(displayName))}>
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeMobile}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card lg:hidden"
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
              >
                <div className="flex items-center justify-between pr-3">
                  {logo}
                  <button
                    onClick={closeMobile}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                    aria-label="Close navigation"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {nav}
                {userBlock}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main key={location.pathname} className="flex-1 pt-14 lg:pl-60 lg:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </OnboardingGate>
  )
}