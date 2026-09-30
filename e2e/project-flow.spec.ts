import { test, expect, type Page } from "@playwright/test"

async function clearLibrary(page: Page) {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Puntos de libro", exact: true })).toBeVisible()

  for (let i = 0; i < 30; i++) {
    const empty = page.getByRole("heading", { name: "Todavía no hay puntos de libro" })
    if (await empty.isVisible().catch(() => false)) return

    const search = page.getByLabel("Buscar")
    if (await search.isVisible().catch(() => false)) {
      await search.fill("")
    }

    const open = page.getByRole("button", { name: /^Abrir / }).first()
    await open.click()
    await page.getByRole("button", { name: "Eliminar" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click()
  }
}

test.describe("Puntos de libro", () => {
  test.describe.configure({ mode: "serial" })

  test("crea, abre, edita y elimina un punto de libro", async ({ page }) => {
    const title = "Para Ana " + Date.now()
    const edited = title + " editado"

    await clearLibrary(page)
    await expect(page.getByRole("heading", { name: "Todavía no hay puntos de libro" })).toBeVisible()

    await page.getByRole("button", { name: "Nuevo punto de libro" }).click()
    await expect(page.getByRole("heading", { name: "Nuevo punto de libro" })).toBeVisible()

    await page.getByLabel("Título", { exact: true }).fill(title)
    await page.getByLabel("Subtítulo", { exact: true }).fill("Marzo")
    await page.getByLabel("Texto del reverso").fill("Que este libro te acompañe.")
    await page.getByRole("button", { name: "Guardar" }).click()
    await expect(page.getByRole("status")).toHaveText("Guardado")

    await page.getByRole("button", { name: "Volver" }).click()
    await expect(page.getByRole("button", { name: `Abrir ${title}` })).toBeVisible()

    await page.getByRole("button", { name: `Abrir ${title}` }).click()
    await expect(page.getByRole("heading", { name: "Editar punto de libro" })).toBeVisible()
    await page.getByLabel("Título", { exact: true }).fill(edited)
    await page.getByRole("button", { name: "Guardar" }).click()
    await expect(page.getByRole("status")).toHaveText("Guardado")

    await page.getByRole("button", { name: "Volver" }).click()
    await expect(page.getByRole("button", { name: `Abrir ${edited}` })).toBeVisible()

    await page.getByRole("button", { name: `Abrir ${edited}` }).click()
    await page.getByRole("button", { name: "Eliminar" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click()

    await expect(page.getByRole("heading", { name: "Todavía no hay puntos de libro" })).toBeVisible()
  })

  test("la búsqueda vacía explica que no hay coincidencias", async ({ page }) => {
    const title = "Busqueda " + Date.now()

    await page.goto("/")
    await page.getByRole("button", { name: "Nuevo punto de libro" }).click()
    await page.getByLabel("Título", { exact: true }).fill(title)
    await page.getByRole("button", { name: "Guardar" }).click()
    await expect(page.getByRole("status")).toHaveText("Guardado")
    await page.getByRole("button", { name: "Volver" }).click()

    await page.getByLabel("Buscar").fill("no-existe-xyz")
    await expect(page.getByRole("heading", { name: "Ningún punto de libro coincide" })).toBeVisible()
    await page.getByRole("button", { name: "Limpiar búsqueda" }).click()
    await expect(page.getByRole("button", { name: `Abrir ${title}` })).toBeVisible()

    await page.getByRole("button", { name: `Abrir ${title}` }).click()
    await page.getByRole("button", { name: "Eliminar" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click()
  })
})
