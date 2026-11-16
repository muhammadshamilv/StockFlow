import type { ReactNode } from "react"
import { BarChart3Icon, BellRingIcon, PackageCheckIcon, ShieldCheckIcon, TrendingUpIcon } from "lucide-react"
import { motion } from "motion/react"
import { Link } from "react-router-dom"

import { Logo } from "@/components/shared/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"

type AuthLayoutProps = {
  title: string
  description: ReactNode
  children: ReactNode
  footer?: ReactNode
}

const features = [
  { icon: PackageCheckIcon, text: "Real-time stock ledger with zero negative inventory" },
  { icon: BarChart3Icon, text: "Revenue, profit and category analytics" },
  { icon: ShieldCheckIcon, text: "Role-based access with secure cookie sessions" },
]

const bars = [38, 52, 44, 61, 57, 72, 66, 84, 78, 92]

/** Split-screen auth layout: animated brand panel (desktop) + form column. */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------- Brand panel ---------------- */}
      <aside className="bg-sidebar relative hidden overflow-hidden border-r lg:flex lg:flex-col">
        <div className="bg-dot-grid absolute inset-0" />
        <div className="bg-primary/25 absolute -top-40 -left-32 size-[520px] rounded-full blur-[120px]" />
        <div className="bg-brand-2/20 absolute -right-24 -bottom-40 size-[480px] rounded-full blur-[120px]" />

        <div className="relative z-10 flex flex-1 flex-col p-10 xl:p-14">
          <Link to="/" aria-label="StockFlow home">
            <Logo size="md" />
          </Link>

          <div className="mt-auto max-w-lg">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl leading-[1.1] font-semibold tracking-tight xl:text-5xl"
            >
              Inventory that runs <span className="text-gradient">itself.</span>
            </motion.h2>
            <p className="text-muted-foreground mt-4 text-base">
              Track every unit, sell faster at the counter and see exactly where your margin comes from.
            </p>
            <ul className="mt-8 space-y-3.5">
              {features.map(({ icon: Icon, text }, i) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="text-foreground/85 flex items-center gap-3 text-sm"
                >
                  <span className="bg-surface/70 text-primary grid size-8 place-items-center rounded-lg border">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Floating preview cards (illustrative) */}
          <div className="relative mt-12 h-56">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="animate-float bg-card/85 absolute left-0 w-[62%] rounded-2xl border p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Revenue · 30 days</span>
                <span className="bg-success/15 text-success inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
                  <TrendingUpIcon className="size-3" /> 13.1%
                </span>
              </div>
              <p className="tabular mt-1.5 text-2xl font-semibold">₹8,88,729</p>
              <div className="mt-4 flex h-16 items-end gap-1.5">
                {bars.map((h, i) => (
                  <motion.span
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                    className="from-primary/40 to-primary flex-1 rounded-t-sm bg-gradient-to-t"
                  />
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="animate-float bg-card/85 absolute top-10 right-0 w-[46%] rounded-2xl border p-4 shadow-2xl backdrop-blur-xl [animation-delay:-3s]"
            >
              <div className="flex items-center gap-2.5">
                <span className="bg-warning/15 text-warning grid size-8 place-items-center rounded-lg">
                  <BellRingIcon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">Low stock</p>
                  <p className="text-muted-foreground truncate text-xs">Green Tea · 4 left</p>
                </div>
              </div>
              <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
                <div className="bg-warning h-full w-[22%] rounded-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </aside>

      {/* ---------------- Form column ---------------- */}
      <main className="bg-dot-grid relative flex flex-col">
        <header className="flex items-center justify-between p-5 sm:p-6">
          <Link to="/" className="lg:invisible" aria-label="StockFlow home">
            <Logo size="sm" />
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px]"
          >
            <div className="mb-8 space-y-2">
              <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{title}</h1>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            {children}
            {footer && <div className="text-muted-foreground mt-8 text-center text-sm">{footer}</div>}
          </motion.div>
        </div>

        <footer className="text-muted-foreground/70 px-6 pb-6 text-center text-xs">
          © {new Date().getFullYear()} StockFlow · Built with React, Django & PostgreSQL
        </footer>
      </main>
    </div>
  )
}
