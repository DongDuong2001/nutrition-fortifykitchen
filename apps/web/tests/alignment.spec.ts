import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3100";
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

test.describe("Alignment check for data-align-group", () => {
  for (const vp of VIEWPORTS) {
    test(`alignment on /today (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/today`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      const errors = await checkAlignGroups(page);
      expect(errors).toEqual([]);
    });

    test(`alignment on /micros (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/micros`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      const errors = await checkAlignGroups(page, "micros-card");
      expect(errors).toEqual([]);
    });

    test(`alignment on /add?meal=snack (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/add?meal=snack`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      const dateOption = page
        .locator("button:has-text('Chà là')")
        .filter({ hasNot: page.locator(":hidden") })
        .first();
      if (await dateOption.isVisible()) {
        await dateOption.click();
      }

      await page.locator('[data-align-group="portion"]:visible').first().waitFor({ timeout: 5000 });

      const errors = await checkAlignGroups(page, "portion");
      expect(errors).toEqual([]);
    });

    test(`alignment on /foods/food-cha-la (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/foods/food-cha-la`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      const errors = await checkAlignGroups(page, "food-detail");
      expect(errors).toEqual([]);
    });
  }
});

test.describe("Hydration check with sessionStorage", () => {
  for (const path of ["/today", "/add"]) {
    test(`zero hydration errors on reload ${path}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => {
        consoleErrors.push(err.message);
      });

      await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });

      await page.evaluate(() => {
        sessionStorage.setItem(
          "h1t_diary_entries",
          JSON.stringify([
            {
              id: "test-entry-1",
              foodId: "food-cha-la",
              foodNameVi: "Chà là khô Deglet Noor",
              grams: 30,
              mealSlot: "snack",
              servingLabel: "30 g",
              calories: 85,
              carbs: 22.5,
              protein: 0.7,
              fat: 0.1,
              nutrients: {
                energy: 85,
                carbs: 22.5,
                protein: 0.7,
                fat: 0.1,
                potassium: 195,
                fiber: 2.4,
              },
            },
          ])
        );
        sessionStorage.setItem("h1t_recent_searches", JSON.stringify(["Chà là", "Chuối"]));
      });

      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      const hydrationErrors = consoleErrors.filter((e) =>
        e.toLowerCase().includes("hydration")
      );
      expect(hydrationErrors).toEqual([]);
    });
  }
});

async function checkAlignGroups(page: any, targetGroup?: string): Promise<string[]> {
  return await page.evaluate((tgt) => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-align-group]"));
    const groups: Record<string, HTMLElement[]> = {};

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

      const name = el.getAttribute("data-align-group");
      if (!name) continue;
      if (tgt && name !== tgt) continue;
      if (!groups[name]) groups[name] = [];
      groups[name].push(el);
    }

    const errors: string[] = [];

    for (const [name, list] of Object.entries(groups)) {
      if (list.length < 2) continue;

      const buckets = new Map<Element | null, HTMLElement[]>();
      for (const el of list) {
        const container =
          el.closest('[data-align-container], section, main, [id^="desktop-meal-"]') ||
          el.parentElement;
        const bucket = buckets.get(container) || [];
        bucket.push(el);
        buckets.set(container, bucket);
      }

      for (const bucket of buckets.values()) {
        if (bucket.length < 2) continue;
        const firstRect = bucket[0].getBoundingClientRect();

        for (let i = 1; i < bucket.length; i++) {
          const item = bucket[i];
          const rect = item.getBoundingClientRect();
          const leftDiff = Math.abs(firstRect.left - rect.left);
          const rightDiff = Math.abs(firstRect.right - rect.right);

          if (leftDiff > 1.05) {
            errors.push(
              `Group "${name}" left mismatch: diff ${leftDiff.toFixed(2)}px between <${bucket[0].tagName.toLowerCase()} class="${bucket[0].className}"> (${firstRect.left.toFixed(1)}) and <${item.tagName.toLowerCase()} class="${item.className}"> (${rect.left.toFixed(1)})`
            );
          }
          if (rightDiff > 1.05) {
            errors.push(
              `Group "${name}" right mismatch: diff ${rightDiff.toFixed(2)}px between <${bucket[0].tagName.toLowerCase()} class="${bucket[0].className}"> (${firstRect.right.toFixed(1)}) and <${item.tagName.toLowerCase()} class="${item.className}"> (${rect.right.toFixed(1)})`
            );
          }
        }
      }
    }

    return errors;
  }, targetGroup);
}
