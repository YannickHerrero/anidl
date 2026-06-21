import { AnimeListView } from "@/components/app/anime-list-view"
import { AppShell } from "@/components/app/app-shell"
import { ConfigRequired } from "@/components/app/config-required"

export default function ListPage() {
  return (
    <ConfigRequired>
      <AppShell eyebrow="My list" title="My list">
        <AnimeListView />
      </AppShell>
    </ConfigRequired>
  )
}
