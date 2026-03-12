export type RealDebridUser = {
  username: string
}

type RealDebridUserResponse = {
  username?: string
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
  }
}
