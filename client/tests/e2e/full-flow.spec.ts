import { test, expect } from "@playwright/test";

test.describe("Full trip flow", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("itinerary route is accessible", async ({ page }) => {
    await page.goto("/itinerary");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("duringtrip route is accessible", async ({ page }) => {
    await page.goto("/duringtrip");
    await expect(page.locator("body")).not.toContainText("404");
  });
});
