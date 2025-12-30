import { NextResponse } from "next/server"
import { getConfig } from "@/lib/oauth/config"
import { refreshTokens } from "@/lib/oauth/client"
import { getRefreshToken, setTokenCookies } from "@/lib/cookies/tokens"

export async function POST(): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const config = getConfig()
    const refreshToken = await getRefreshToken(config.cookieEncryptionKey)

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token found" }, { status: 401 })
    }

    const tokens = await refreshTokens(config, refreshToken)
    await setTokenCookies(tokens, config.cookieEncryptionKey)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Refresh error:", error)
    return NextResponse.json({ error: "Failed to refresh tokens" }, { status: 500 })
  }
}
