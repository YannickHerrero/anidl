import Link from "next/link"

import { AppShell } from "@/components/app/app-shell"
import { ConfigRequired } from "@/components/app/config-required"
import { Button } from "@/components/ui/button"

const lanes = [
  {
    title: "Search intent",
    body: "Free text, quick suggestions, and future TMDB-powered typeahead live here.",
  },
  {
    title: "Results grid",
    body: "Movie and series cards will branch into dedicated detail pages once the fetching layer lands.",
  },
  {
    title: "Download flow",
    body: "Torrentio sources will be resolved against Real-Debrid before the app offers a final download action.",
  },
]

const previewResults = [
  {
    title: "Dune: Part Two",
    meta: "Movie - 2024 - TMDB 693134",
    href: "/media/movie/693134",
  },
  {
    title: "Shogun",
    meta: "TV Show - 2024 - TMDB 126308",
    href: "/media/tv/126308",
  },
  {
    title: "Arcane",
    meta: "TV Show - 2021 - TMDB 94605",
    href: "/media/tv/94605",
  },
]

export default function SearchPage() {
  return (
    <ConfigRequired>
      <AppShell
        eyebrow="Search"
        title="Shape the search flow before wiring TMDB"
        description="This page is intentionally structural for now: it defines where discovery, result ranking, and the Real-Debrid download path will sit once the integrations are added."
      >
        <section className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <input
                aria-label="Search media"
                className="h-14 flex-1 rounded-2xl border border-border/70 bg-background/80 px-4 text-base transition outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                placeholder="Search movies or TV shows"
                readOnly
              />
              <Button size="lg" className="h-14 rounded-2xl px-6">
                Search soon
              </Button>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {lanes.map((lane) => (
                <article
                  key={lane.title}
                  className="rounded-[22px] border border-border/60 bg-background/75 p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {lane.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {lane.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,234,223,0.96))] p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] dark:bg-[linear-gradient(180deg,rgba(20,28,29,0.96),rgba(30,38,39,0.98))]">
            <p className="text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase">
              Planned results
            </p>
            <div className="mt-4 space-y-3">
              {previewResults.map((result) => (
                <Link
                  key={result.href}
                  href={result.href}
                  className="block rounded-[20px] border border-border/60 bg-background/70 p-4 transition hover:border-primary/40 hover:bg-background"
                >
                  <p className="font-medium text-foreground">{result.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.meta}
                  </p>
                </Link>
              ))}
            </div>
          </aside>
        </section>
      </AppShell>
    </ConfigRequired>
  )
}
