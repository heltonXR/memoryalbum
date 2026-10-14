import { test, expect } from "@playwright/test";
test("capa, categorias, galeria, navegação circular e foco", async ({
  page,
}) => {
  await page.goto("/a/graduacao-2026");
  await expect(
    page.getByRole("heading", { name: "Graduação das Gêmeas 2026" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver álbum", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Categorias", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Todas as fotos,/ }).click();
  const thumbnails = page.locator('button[aria-label^="Ampliar"]');
  const total = await thumbnails.count();
  expect(total).toBeGreaterThanOrEqual(92);
  await thumbnails.first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`1 / ${total}`, { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(
    dialog.getByText(`${total} / ${total}`, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText(`1 / ${total}`, { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(thumbnails.first()).toBeFocused();
});
test("tema e acesso reservado", async ({ page }) => {
  await page.goto("/a/graduacao-2026");
  await page
    .getByRole("combobox", { name: "Tema", exact: true })
    .selectOption("DARK");
  await expect(page.locator('[data-theme="dark"]')).toBeVisible();
  await page.goto("/a/nao-existe");
  await expect(
    page.getByRole("heading", { name: "Álbum indisponível." }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(
    page.getByRole("button", { name: "Iniciar sessão" }),
  ).toBeVisible();
});

test("download original, partilha por link e gesto horizontal", async ({
  page,
}) => {
  await page.goto("/a/graduacao-2026");
  await page.getByRole("button", { name: /Todas as fotos,/ }).click();
  await page.locator('button[aria-label^="Ampliar"]').first().click();
  const dialog = page.getByRole("dialog");
  const downloaded = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "Baixar foto" }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toMatch(/graduacao-2026.*\.jpg$/);
  expect(await file.failure()).toBeNull();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  await dialog.getByRole("button", { name: "Partilhar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Link copiado." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toContain("photo=");
  const stage = dialog
    .locator("div")
    .filter({ has: page.locator("img") })
    .last();
  await stage.evaluate((element) => {
    const start=new Event("touchstart",{bubbles:true});
    Object.defineProperty(start,"touches",{value:[{clientX:200,clientY:200}]});
    element.dispatchEvent(start);
    const end=new Event("touchend",{bubbles:true});
    Object.defineProperty(end,"changedTouches",{value:[{clientX:100,clientY:202}]});
    element.dispatchEvent(end);
  });
  await expect(dialog.getByText("2 / 92", { exact: true })).toBeVisible();
});
