import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "bg-white/5 text-white/60 border border-white/10",
        destructive: "bg-red-500/10 text-red-400 border border-red-500/20",
        outline: "text-foreground border-border",
        success: "bg-green-500/10 text-green-400 border border-green-500/20",
        danger: "bg-red-500/10 text-red-400 border border-red-500/20",
        warning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
        info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
        neutral: "bg-white/5 text-white/60 border border-white/10",
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
