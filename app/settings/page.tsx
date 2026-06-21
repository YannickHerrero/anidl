import { ConfigRequired } from "@/components/app/config-required"
import { SettingsView } from "@/components/app/settings-view"
import { SidebarShell } from "@/components/app/sidebar-shell"

export default function SettingsPage() {
  return (
    <ConfigRequired>
      <SidebarShell>
        <SettingsView />
      </SidebarShell>
    </ConfigRequired>
  )
}
