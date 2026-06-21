import { notFound } from "next/navigation"

import { ConfigRequired } from "@/components/app/config-required"
import { SidebarShell } from "@/components/app/sidebar-shell"
import { SourcesView } from "@/components/app/sources-view"
import { type SearchMediaType } from "@/lib/tmdb"

type SourcesPageProps = {
  params: Promise<{
    mediaType: string
    tmdbId: string
  }>
  searchParams: Promise<{ s?: string; e?: string }>
}

export default async function SourcesPage({
  params,
  searchParams,
}: SourcesPageProps) {
  const { mediaType, tmdbId } = await params
  const { s, e } = await searchParams
  const numericTmdbId = Number(tmdbId)

  if (
    (mediaType !== "movie" && mediaType !== "tv") ||
    !Number.isInteger(numericTmdbId) ||
    numericTmdbId <= 0
  ) {
    notFound()
  }

  const season = Number(s)
  const episode = Number(e)

  return (
    <ConfigRequired>
      <SidebarShell>
        <SourcesView
          mediaType={mediaType as SearchMediaType}
          tmdbId={numericTmdbId}
          season={Number.isInteger(season) && season > 0 ? season : null}
          episode={Number.isInteger(episode) && episode > 0 ? episode : null}
        />
      </SidebarShell>
    </ConfigRequired>
  )
}
