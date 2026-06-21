"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAppConfig } from "@/hooks/use-app-config"

export function RootEntry() {
  const router = useRouter()
  const { isConfigured, isHydrated } = useAppConfig()

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    router.replace(isConfigured ? "/search" : "/onboarding")
  }, [isConfigured, isHydrated, router])

  return (
    <div className="flex min-h-svh items-center justify-center bg-canvas px-6">
      <div className="max-w-md rounded-[14px] border border-border bg-card p-6 text-center">
        <p className="font-mono text-[11px] tracking-[0.08em] text-primary uppercase">
          Booting anidl
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Routing you to onboarding or the search flow based on the keys already
          saved in this browser.
        </p>
      </div>
    </div>
  )
}
