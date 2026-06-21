export type RealDebridUser = {
  username: string
  type: string | null
  premium: number | null
  expiration: string | null
}

type RealDebridUserResponse = {
  username?: string
  type?: string
  premium?: number
  expiration?: string
}

export async function validateRealDebridApiKey({
  apiKey,
  signal,
}: {
  apiKey: string
  signal?: AbortSignal
}): Promise<RealDebridUser> {
  const response = await fetch("/api/real-debrid/user", {
    headers: {
      "x-real-debrid-api-key": apiKey,
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(
      `Real-Debrid validation failed with status ${response.status}`
    )
  }

  const payload = (await response.json()) as RealDebridUserResponse

  if (!payload.username?.trim()) {
    throw new Error("Real-Debrid user response is missing a username")
  }

  return {
    username: payload.username.trim(),
    type: payload.type?.trim() || null,
    premium: typeof payload.premium === "number" ? payload.premium : null,
    expiration: payload.expiration?.trim() || null,
  }
}

/**
 * Human label for the sidebar / settings RD status, e.g. "premium · 287d left".
 * Falls back to the account type when no expiration is available.
 */
export function describeRealDebridPlan(user: RealDebridUser): string {
  const plan = user.type === "premium" ? "premium" : (user.type ?? "free")

  if (!user.expiration) {
    return plan
  }

  const expirationMs = Date.parse(user.expiration)

  if (Number.isNaN(expirationMs)) {
    return plan
  }

  const daysLeft = Math.max(
    0,
    Math.round((expirationMs - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return `${plan} · ${daysLeft}d left`
}
