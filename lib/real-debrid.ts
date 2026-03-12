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
  const response = await fetch("https://api.real-debrid.com/rest/1.0/user", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
