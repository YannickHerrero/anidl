import { AnilistWatchingView } from "@/components/app/anilist-watching-view"
import { ConfigRequired } from "@/components/app/config-required"
import { SidebarShell } from "@/components/app/sidebar-shell"

export default function AnilistPage() {
  return (
    <ConfigRequired>
      <SidebarShell>
        <AnilistWatchingView />
      </SidebarShell>
    </ConfigRequired>
  )
}
