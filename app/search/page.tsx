import { AppShell } from "@/components/app/app-shell"
import { ConfigRequired } from "@/components/app/config-required"
import { SearchExperience } from "@/components/app/search-experience"

export default function SearchPage() {
  return (
    <ConfigRequired>
      <AppShell eyebrow="Search" title="Search">
        <SearchExperience />
      </AppShell>
    </ConfigRequired>
  )
}
