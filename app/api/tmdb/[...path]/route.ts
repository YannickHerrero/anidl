import { type NextRequest, NextResponse } from "next/server"

const TMDB_BASE_URL = "https://api.themoviedb.org/3"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await context.params
  const apiKey = request.headers.get("x-tmdb-api-key")?.trim()

  if (!apiKey) {
    return NextResponse.json({ error: "Missing TMDB API key" }, { status: 400 })
  }

  if (!isAllowedTmdbPath(path)) {
    return NextResponse.json({ error: "Invalid TMDB path" }, { status: 400 })
  }

  const upstreamUrl = new URL(`${TMDB_BASE_URL}/${path.join("/")}`)

  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    upstreamUrl.searchParams.set(key, value)
  }

  upstreamUrl.searchParams.set("api_key", apiKey)

  const response = await fetch(upstreamUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  })

  const body = await response.text()

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  })
}

function isAllowedTmdbPath(path: string[]) {
  const normalizedPath = path.join("/")

  return [
    /^search\/multi$/,
    /^(movie|tv)\/\d+$/,
    /^(movie|tv)\/\d+\/external_ids$/,
    /^tv\/\d+\/season\/\d+$/,
  ].some((pattern) => pattern.test(normalizedPath))
}
