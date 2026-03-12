import { notFound } from "next/navigation"

import { AppShell } from "@/components/app/app-shell"
import { ConfigRequired } from "@/components/app/config-required"
import { SeasonDownloadReview } from "@/components/app/season-download-review"

type SeasonDownloadPageProps = {
  params: Promise<{
    mediaType: string
    tmdbId: string
    seasonNumber: string
  }>
}

export default async function SeasonDownloadPage({
  params,
}: SeasonDownloadPageProps) {
  const { mediaType, seasonNumber, tmdbId } = await params
  const numericTmdbId = Number(tmdbId)
  const numericSeasonNumber = Number(seasonNumber)

  if (
    mediaType !== "tv" ||
    !Number.isInteger(numericTmdbId) ||
    numericTmdbId <= 0 ||
    !Number.isInteger(numericSeasonNumber) ||
    numericSeasonNumber <= 0
  ) {
    notFound()
  }

  return (
    <ConfigRequired>
      <AppShell eyebrow="Season" title={`Season ${numericSeasonNumber}`}>
        <SeasonDownloadReview
          tmdbId={numericTmdbId}
          seasonNumber={numericSeasonNumber}
        />
      </AppShell>
    </ConfigRequired>
  )
}
