import { test, expect } from "@playwright/test"

test.describe("OAuth Login Flow", () => {
  test("shows login button when not authenticated", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
    await expect(page.getByText("BFF OAuth Demo")).toBeVisible()
  })

  test("completes full OAuth login flow", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("button", { name: /sign in/i }).click()

    await expect(page).toHaveURL(/localhost:9000\/authorize/)

    await page.getByRole("button", { name: /sign in as test user/i }).click()

    await expect(page.getByText("Welcome, Test User")).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("test@example.com", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible()
  })

  test("logout clears session", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: /sign in/i }).click()

    await expect(page).toHaveURL(/localhost:9000\/authorize/)

    await page.getByRole("button", { name: /sign in as test user/i }).click()

    await expect(page.getByText("Welcome, Test User")).toBeVisible({ timeout: 15000 })

    await page.getByRole("button", { name: /sign out/i }).click()

    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible({ timeout: 10000 })
  })

  test("displays ID token claims after login", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: /sign in/i }).click()

    await expect(page).toHaveURL(/localhost:9000\/authorize/)

    await page.getByRole("button", { name: /sign in as test user/i }).click()

    await expect(page.getByText("ID Token Claims")).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/"sub":/)).toBeVisible()
    await expect(page.getByText(/"email":/)).toBeVisible()
  })
})
