import { NextResponse } from "next/server"
import { getConfig } from "@/lib/oauth/config"
import { generateAuthState, buildAuthorizationUrl } from "@/lib/oauth/client"
import { setAuthState } from "@/lib/cookies/tokens"
import type { LoginStartResponse } from "@/lib/oauth/types"

export async function POST(): Promise<NextResponse<LoginStartResponse | { error: string }>> {
  try {
    const config = getConfig()
    const authState = generateAuthState()

    await setAuthState(authState, config.cookieEncryptionKey)

    const authorizationUrl = await buildAuthorizationUrl(config, authState)

    return NextResponse.json({ authorizationUrl })
  } catch (error) {
    console.error("Login start error:", error)
    return NextResponse.json({ error: "Failed to start login" }, { status: 500 })
  }
}
