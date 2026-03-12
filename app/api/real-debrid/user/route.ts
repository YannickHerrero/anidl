import { type NextRequest, NextResponse } from "next/server"

const REAL_DEBRID_USER_URL = "https://api.real-debrid.com/rest/1.0/user"

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-real-debrid-api-key")?.trim()

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Real-Debrid API key" },
      { status: 400 }
    )
  }

  const response = await fetch(REAL_DEBRID_USER_URL, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
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
