/**
 * Migra imágenes de ImageState (userId="local") a ProjectState.
 * Requiere servidor en marcha (bun run dev). Ejecutar:
 *
 *   bun run migrate:legacy-images
 *
 * Para migrar solo a un proyecto:
 *   bun run migrate:legacy-images <projectId>
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000"

async function main() {
  const projectIdArg = process.argv[2]

  const projectsRes = await fetch(`${BASE}/api/projects`)
  if (!projectsRes.ok) {
    console.error("Error al obtener proyectos. ¿Está el servidor en marcha? (bun run dev)")
    process.exit(1)
  }

  const { projects } = (await projectsRes.json()) as { projects?: { id: string; name: string }[] }
  const list = projectIdArg
    ? (projects ?? []).filter((p) => p.id === projectIdArg)
    : (projects ?? [])

  if (list.length === 0) {
    console.log(projectIdArg ? `Proyecto ${projectIdArg} no encontrado.` : "No hay proyectos.")
    process.exit(1)
  }

  for (const p of list) {
    const res = await fetch(`${BASE}/api/projects/${p.id}/import-legacy`, { method: "POST" })
    const data = (await res.json()) as {
      customImages?: number
      gallery?: number
      backgroundPool?: number
      mapped?: number
      message?: string
    }

    if (!res.ok) {
      console.error(`[${p.name}] Error:`, data.message ?? data)
      continue
    }

    if (data.message === "No hay datos previos") {
      console.log(`[${p.name}] Sin datos legacy en ImageState.`)
      continue
    }

    console.log(
      `[${p.name}] customImages: ${data.customImages ?? 0}, gallery: ${data.gallery ?? 0}, backgroundPool: ${data.backgroundPool ?? 0}, mapped: ${data.mapped ?? 0}`
    )
  }

  console.log("Migracion completada.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
