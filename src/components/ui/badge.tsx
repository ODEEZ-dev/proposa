import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        blue: "border-blue-500/30 bg-blue-500/15 text-blue-300",
        pink: "border-pink-500/30 bg-pink-500/15 text-pink-300",
        amber: "border-amber-500/30 bg-amber-500/15 text-amber-300",
        purple: "border-purple-500/30 bg-purple-500/15 text-purple-300",
        orange: "border-orange-500/30 bg-orange-500/15 text-orange-300",
        indigo: "border-primary/30 bg-primary/10 text-primary",
        red: "border-red-500/30 bg-red-500/15 text-red-300",
        slate: "border-border bg-secondary text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }