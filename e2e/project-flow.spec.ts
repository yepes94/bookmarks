import { test, expect } from "@playwright/test"

test.describe("Project flow", () => {
  test("shows project selector when no project is selected", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /Puntos de Libro/i })).toBeVisible()
    await expect(page.getByText(/Selecciona o crea un proyecto/i)).toBeVisible()
  })

  test("creates a new project and opens editor or empty project screen", async ({
    page,
  }) => {
    await page.goto("/")
    await page.getByRole("button", { name: /Crear proyecto/i }).click()

    await expect(page.getByRole("heading", { name: /Crear proyecto/i })).toBeVisible()
    const nameInput = page.getByPlaceholder(/Mi proyecto/i)
    await nameInput.fill("Test E2E " + Date.now())
    await page.getByRole("combobox").selectOption("santos")
    await page.getByRole("button", { name: /Crear/i }).click()

    await expect(page.getByRole("heading", { name: /Puntos de Libro/i })).toBeVisible({
      timeout: 10000,
    })
  })

  test("navigates back to projects from editor", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: /Crear proyecto/i }).click()
    const nameInput = page.getByPlaceholder(/Mi proyecto/i)
    await nameInput.fill("Back Test " + Date.now())
    await page.getByRole("combobox").selectOption("santos")
    await page.getByRole("button", { name: /Crear/i }).click()

    await expect(page.getByRole("heading", { name: /Puntos de Libro/i })).toBeVisible({
      timeout: 10000,
    })

    await page.getByRole("button", { name: /Proyectos/i }).first().click()

    await expect(page.getByRole("heading", { name: /Puntos de Libro/i })).toBeVisible()
  })

  test("empty project shows add manual ficha and load saints options", async ({
    page,
  }) => {
    await page.goto("/")
    await page.getByRole("button", { name: /Crear proyecto/i }).click()
    const nameInput = page.getByPlaceholder(/Mi proyecto/i)
    await nameInput.fill("Empty " + Date.now())
    await page.getByRole("combobox").selectOption("ciudades")
    await page.getByRole("button", { name: /Crear/i }).click()

    await expect(page.getByText(/Proyecto sin fichas/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Añadir ficha manual/i)).toBeVisible()
  })
})
