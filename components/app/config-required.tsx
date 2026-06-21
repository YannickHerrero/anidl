"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAppConfig } from "@/hooks/use-app-config"

type ConfigRequiredProps = {
  children: ReactNode
}

export function ConfigRequired({ children }: ConfigRequiredProps) {
  const router = useRouter()
  const { isConfigured, isHydrated } = useAppConfig()

  useEffect(() => {
    if (isHydrated && !isConfigured) {
      router.replace("/onboarding")
    }
  }, [isConfigured, isHydrated, router])

  if (!isHydrated || !isConfigured) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-canvas px-6">
        <div className="max-w-md rounded-[14px] border border-border bg-card p-6 text-center">
          <p className="font-mono text-[11px] tracking-[0.08em] text-primary uppercase">
            Preparing workspace
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Checking whether your browser already has the required TMDB and
            Real-Debrid keys.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
