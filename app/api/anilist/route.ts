import { type NextRequest, NextResponse } from "next/server"

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co"

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid AniList request body" },
      { status: 400 }
    )
  }

  if (!isGraphqlRequest(body)) {
    return NextResponse.json(
      { error: "Invalid AniList request body" },
      { status: 400 }
    )
  }

  const response = await fetch(ANILIST_GRAPHQL_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: body.query,
      variables: body.variables ?? {},
    }),
  })

  const responseBody = await response.text()

  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  })
}

function isGraphqlRequest(
  body: unknown
): body is { query: string; variables?: Record<string, unknown> } {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { query?: unknown }).query === "string"
  )
}
