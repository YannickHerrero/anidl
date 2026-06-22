"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { ThemeToggleButton } from "@/components/theme-provider"
import { useRealDebridUser } from "@/hooks/use-real-debrid-user"
import { describeRealDebridPlan } from "@/lib/real-debrid"
import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
  idx: string
  isActive: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Search",
    href: "/search",
    idx: "01",
    isActive: (p) => p === "/search" || p.startsWith("/media"),
  },
  { label: "My List", href: "/list", idx: "02", isActive: (p) => p === "/list" },
  {
    label: "Airing",
    href: "/airing",
    idx: "03",
    isActive: (p) => p === "/airing",
  },
  {
    label: "AniList",
    href: "/anilist",
    idx: "04",
    isActive: (p) => p === "/anilist",
  },
  {
    label: "Settings",
    href: "/settings",
    idx: "—",
    isActive: (p) => p === "/settings",
  },
]

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ""

  return (
    <div className="flex h-svh overflow-hidden bg-canvas text-foreground">
      <aside className="flex w-[236px] flex-none flex-col border-r border-border bg-background px-[22px] py-[30px]">
        <div>
          <div className="display text-[27px] leading-none font-extrabold">
            anidl<span className="text-primary">.</span>
          </div>
          <div className="mt-[7px] font-mono text-[10px] tracking-[0.06em] text-faint">
            SELF-HOSTED STREAM
          </div>
        </div>

        <nav className="mt-10 flex flex-col gap-[3px]">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-[9px] border-l-2 px-[13px] py-[11px] transition-colors",
                  active
                    ? "border-primary bg-secondary text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-secondary"
                )}
              >
                <span
                  className={cn(
                    "text-[13.5px]",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    item.idx === "3" ? "text-primary" : "text-faint"
                  )}
                >
                  {item.idx}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <RealDebridCard />
          <ThemeToggleButton />
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto bg-background">{children}</div>
    </div>
  )
}

function RealDebridCard() {
  const state = useRealDebridUser()
  const connected = state.status === "success"
  const detail =
    state.status === "success"
      ? describeRealDebridPlan(state.user)
      : state.status === "loading"
        ? "checking…"
        : state.status === "error"
          ? "unreachable"
          : "not connected"

  return (
    <div className="rounded-xl border border-border p-3.5">
      <div className="font-mono text-[10px] tracking-[0.05em] text-faint">
        REAL-DEBRID
      </div>
      <div className="mt-2 flex items-center gap-[7px]">
        <span
          className={cn(
            "size-[7px] rounded-full",
            connected ? "bg-success" : "bg-faint"
          )}
        />
        <span className="text-[12.5px] text-foreground">
          {connected ? "Connected" : "Offline"}
        </span>
      </div>
      <div className="mt-1 font-mono text-[10px] text-faint">{detail}</div>
    </div>
  )
}
