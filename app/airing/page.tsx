import { AiringView } from "@/components/app/airing-view"
import { ConfigRequired } from "@/components/app/config-required"
import { SidebarShell } from "@/components/app/sidebar-shell"

export default function AiringPage() {
  return (
    <ConfigRequired>
      <SidebarShell>
        <AiringView />
      </SidebarShell>
    </ConfigRequired>
  )
}
