import { notFound } from "next/navigation"

import { ConfigRequired } from "@/components/app/config-required"
import { EpisodesView } from "@/components/app/episodes-view"
import { SidebarShell } from "@/components/app/sidebar-shell"

type EpisodesPageProps = {
  params: Promise<{
    mediaType: string
    tmdbId: string
  }>
}

export default async function EpisodesPage({ params }: EpisodesPageProps) {
  const { mediaType, tmdbId } = await params
  const numericTmdbId = Number(tmdbId)

  if (
    mediaType !== "tv" ||
    !Number.isInteger(numericTmdbId) ||
    numericTmdbId <= 0
  ) {
    notFound()
  }

  return (
    <ConfigRequired>
      <SidebarShell>
        <EpisodesView tmdbId={numericTmdbId} />
      </SidebarShell>
    </ConfigRequired>
  )
}
