import { type NextRequest, NextResponse } from "next/server"

const TORRENTIO_BASE_URL = "https://torrentio.strem.fun"
const DEFAULT_TORRENTIO_PROVIDERS = [
  "yts",
  "eztv",
  "rarbg",
  "1337x",
  "thepiratebay",
  "kickasstorrents",
  "torrentgalaxy",
  "nyaasi",
] as const

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await context.params
  const realDebridApiKey = request.headers.get("x-real-debrid-api-key")?.trim()

  if (!realDebridApiKey) {
    return NextResponse.json(
      { error: "Missing Real-Debrid API key" },
      { status: 400 }
    )
  }

  if (!isAllowedTorrentioPath(path)) {
    return NextResponse.json(
      { error: "Invalid Torrentio path" },
      { status: 400 }
    )
  }

  const upstreamUrl = new URL(
    `${TORRENTIO_BASE_URL}/${buildTorrentioConfig(realDebridApiKey)}/stream/${buildTorrentioStreamPath(path)}.json`
  )

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

function isAllowedTorrentioPath(path: string[]) {
  if (path[0] === "movie") {
    return path.length === 2 && /^tt\w+$/.test(path[1] ?? "")
  }

  if (path[0] === "series") {
    return (
      path.length === 4 &&
      /^tt\w+$/.test(path[1] ?? "") &&
      /^\d+$/.test(path[2] ?? "") &&
      /^\d+$/.test(path[3] ?? "")
    )
  }

  return false
}

function buildTorrentioConfig(realDebridApiKey: string) {
  return [
    `providers=${DEFAULT_TORRENTIO_PROVIDERS.join(",")}`,
    "sort=qualitysize",
    "qualityfilter=scr,cam",
    "debridoptions=nodownloadlinks",
    `realdebrid=${realDebridApiKey}`,
  ].join("|")
}

function buildTorrentioStreamPath(path: string[]) {
  if (path[0] === "movie") {
    return `movie/${path[1]}`
  }

  return `series/${path[1]}:${path[2]}:${path[3]}`
}
