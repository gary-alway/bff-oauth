import { describe, it, expect } from "vitest"
import { encrypt, decrypt, generateEncryptionKey } from "./encryption"

describe("encryption", () => {
  const testKey = generateEncryptionKey()

  describe("encrypt", () => {
    it("encrypts payload to a JWE string", async () => {
      const payload = { foo: "bar", num: 42 }
      const encrypted = await encrypt(payload, testKey)

      expect(typeof encrypted).toBe("string")
      expect(encrypted.split(".")).toHaveLength(5)
    })
  })

  describe("decrypt", () => {
    it("decrypts back to original payload", async () => {
      const payload = { foo: "bar", num: 42 }
      const encrypted = await encrypt(payload, testKey)
      const decrypted = await decrypt(encrypted, testKey)

      expect(decrypted).toMatchObject(payload)
    })

    it("returns null for invalid ciphertext", async () => {
      const result = await decrypt("invalid-token", testKey)
      expect(result).toBeNull()
    })

    it("returns null for wrong key", async () => {
      const payload = { foo: "bar" }
      const encrypted = await encrypt(payload, testKey)
      const wrongKey = generateEncryptionKey()
      const result = await decrypt(encrypted, wrongKey)

      expect(result).toBeNull()
    })

    it("returns null for malformed JWE", async () => {
      const result = await decrypt("a.b.c.d.e", testKey)
      expect(result).toBeNull()
    })
  })

  describe("generateEncryptionKey", () => {
    it("generates a base64url encoded 32-byte key", () => {
      const key = generateEncryptionKey()
      expect(typeof key).toBe("string")
      expect(key.length).toBeGreaterThan(40)
    })

    it("generates unique keys", () => {
      const key1 = generateEncryptionKey()
      const key2 = generateEncryptionKey()
      expect(key1).not.toBe(key2)
    })
  })
})
