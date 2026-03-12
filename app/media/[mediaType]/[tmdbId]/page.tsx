import { notFound } from "next/navigation"

import { AppShell } from "@/components/app/app-shell"
import { ConfigRequired } from "@/components/app/config-required"
import { Button } from "@/components/ui/button"

type DetailPageProps = {
  params: Promise<{
    mediaType: string
    tmdbId: string
  }>
}

const mediaCopy = {
  movie: {
    label: "Movie detail",
    title: "Movie detail skeleton",
    description:
      "This route will eventually combine TMDB metadata, Torrentio source discovery, and Real-Debrid download resolution for feature films.",
  },
  tv: {
    label: "Series detail",
    title: "TV show detail skeleton",
    description:
      "This route will later branch into season and episode selection before resolving Torrentio streams through Real-Debrid.",
  },
} as const

const pipeline = [
  "Fetch title, artwork, and credits from TMDB.",
  "Resolve Torrentio sources using the TMDB to IMDb mapping.",
  "Send the selected magnet or torrent to Real-Debrid and surface the resulting download option.",
]

export default async function DetailPage({ params }: DetailPageProps) {
  const { mediaType, tmdbId } = await params
  const details = mediaCopy[mediaType as keyof typeof mediaCopy]

  if (!details) {
    notFound()
  }

  return (
    <ConfigRequired>
      <AppShell
        eyebrow={details.label}
        title={details.title}
        description={details.description}
      >
        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="overflow-hidden rounded-[30px] border border-border/70 bg-[linear-gradient(160deg,rgba(15,45,42,0.92),rgba(48,84,78,0.78))] p-6 text-primary-foreground shadow-[0_18px_80px_-38px_rgba(18,38,33,0.6)]">
            <p className="text-sm tracking-[0.24em] text-primary-foreground/70 uppercase">
              Preview
            </p>
            <div className="mt-6 aspect-[3/4] rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.1),rgba(7,16,18,0.5))]" />
            <div className="mt-6 space-y-3">
              <div className="flex flex-wrap gap-2 text-xs tracking-[0.18em] text-primary-foreground/70 uppercase">
                <span>TMDB {tmdbId}</span>
                <span>
                  {mediaType === "movie" ? "Single item" : "Season flow"}
                </span>
                <span>Real-Debrid only</span>
              </div>
              <p className="text-2xl font-semibold">
                Metadata and actions land here next.
              </p>
              <p className="text-sm leading-6 text-primary-foreground/75">
                Use this page as the future handoff point between discovery and
                the final download operation.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <article className="rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm tracking-[0.24em] text-muted-foreground uppercase">
                    Future actions
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">
                    Download journey
                  </h2>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="lg" className="rounded-2xl">
                    Refresh later
                  </Button>
                  <Button size="lg" className="rounded-2xl">
                    Download later
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {pipeline.map((step, index) => (
                  <div
                    key={step}
                    className="flex gap-4 rounded-[20px] border border-border/60 bg-background/70 p-4"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                      0{index + 1}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-dashed border-border/70 bg-background/55 p-6">
              <p className="text-sm tracking-[0.24em] text-muted-foreground uppercase">
                Coming next
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-border/60 bg-card/70 p-4">
                  <p className="font-medium text-foreground">TMDB module</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Poster, synopsis, cast, release info, and runtime will be
                    mapped into this panel.
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-card/70 p-4">
                  <p className="font-medium text-foreground">Source picker</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Torrentio stream candidates and Real-Debrid status will be
                    ranked and displayed here.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </AppShell>
    </ConfigRequired>
  )
}
