import Link from "next/link"
import type { ReactNode } from "react"

type AppShellProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

const navItems = [
  { href: "/onboarding", label: "Onboarding" },
  { href: "/search", label: "Search" },
  { href: "/media/movie/693134", label: "Detail preview" },
]

export function AppShell({
  eyebrow,
  title,
  description,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(208,237,225,0.9),transparent_34%),radial-gradient(circle_at_top_right,rgba(243,219,180,0.72),transparent_28%),linear-gradient(180deg,#f7f3eb_0%,#f4efe7_48%,#efe7d7_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(48,102,94,0.34),transparent_30%),radial-gradient(circle_at_top_right,rgba(164,121,64,0.22),transparent_26%),linear-gradient(180deg,#101718_0%,#121a1b_48%,#182122_100%)]">
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="rounded-[30px] border border-border/70 bg-background/72 px-5 py-4 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold tracking-[0.3em] text-primary uppercase"
              >
                anidl
              </Link>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                TMDB discovery, Torrentio source lookup, and Real-Debrid powered
                downloads for a private learning project.
              </p>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-border/70 bg-card/70 px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 py-8 sm:py-10">
          <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold tracking-[0.28em] text-primary/80 uppercase">
                {eyebrow}
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                {title}
              </h1>
            </div>

            <div className="rounded-[26px] border border-border/70 bg-background/70 p-5 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.35)] backdrop-blur">
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          </section>

          {children}
        </main>
      </div>
    </div>
  )
}
