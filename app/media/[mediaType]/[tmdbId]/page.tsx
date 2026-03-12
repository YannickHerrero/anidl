import { notFound } from "next/navigation"

import { AppShell } from "@/components/app/app-shell"
import { ConfigRequired } from "@/components/app/config-required"
import { MediaDetailPreview } from "@/components/app/media-detail-preview"
import { type SearchMediaType } from "@/lib/tmdb"

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
  const numericTmdbId = Number(tmdbId)

  if (!details || !Number.isInteger(numericTmdbId) || numericTmdbId <= 0) {
    notFound()
  }

  return (
    <ConfigRequired>
      <AppShell
        eyebrow={details.label}
        title={details.title}
        description="Use search as the entry point, then keep building richer metadata and download actions from here."
      >
        <MediaDetailPreview
          mediaType={mediaType as SearchMediaType}
          tmdbId={numericTmdbId}
        />
      </AppShell>
    </ConfigRequired>
  )
}
