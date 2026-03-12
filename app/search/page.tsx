import { AppShell } from "@/components/app/app-shell"
import { ConfigRequired } from "@/components/app/config-required"
import { SearchExperience } from "@/components/app/search-experience"

export default function SearchPage() {
  return (
    <ConfigRequired>
      <AppShell
        eyebrow="Search"
        title="Search"
        description="Search TMDB for movies and TV shows, then continue straight into the media flow."
      >
        <SearchExperience />
      </AppShell>
    </ConfigRequired>
  )
}
