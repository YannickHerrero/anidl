import { ConfigRequired } from "@/components/app/config-required"
import { SearchExperience } from "@/components/app/search-experience"
import { SidebarShell } from "@/components/app/sidebar-shell"

export default function SearchPage() {
  return (
    <ConfigRequired>
      <SidebarShell>
        <SearchExperience />
      </SidebarShell>
    </ConfigRequired>
  )
}
