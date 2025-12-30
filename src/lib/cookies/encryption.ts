import { EncryptJWT, jwtDecrypt, base64url } from "jose"

export async function encrypt(
  payload: Record<string, unknown>,
  secretKey: string
): Promise<string> {
  const key = base64url.decode(secretKey)
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .encrypt(key)
}

export async function decrypt<T = Record<string, unknown>>(
  token: string,
  secretKey: string
): Promise<T | null> {
  try {
    const key = base64url.decode(secretKey)
    const { payload } = await jwtDecrypt(token, key)
    return payload as T
  } catch {
    return null
  }
}

export function generateEncryptionKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return base64url.encode(bytes)
}
