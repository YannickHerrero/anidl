import { notFound } from "next/navigation"

import { AppShell } from "@/components/app/app-shell"
import { ConfigRequired } from "@/components/app/config-required"

type DetailPageProps = {
  params: Promise<{
    mediaType: string
    tmdbId: string
  }>
}

const mediaCopy = {
  movie: {
    label: "Movie detail",
    title: "Movie detail",
    description: "This page is not available yet.",
  },
  tv: {
    label: "Series detail",
    title: "TV show detail",
    description: "This page is not available yet.",
  },
} as const

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
        <section className="rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur">
          <div className="flex flex-wrap gap-2 text-xs tracking-[0.18em] text-muted-foreground uppercase">
            <span>TMDB {tmdbId}</span>
            <span>{mediaType === "movie" ? "Movie" : "TV show"}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Details and download actions are not available yet.
          </p>
        </section>
      </AppShell>
    </ConfigRequired>
  )
}
