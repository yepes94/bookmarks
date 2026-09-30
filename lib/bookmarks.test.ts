import { describe, expect, it } from "bun:test"
import {
  draftToPayload,
  emptyDraft,
  matchesQuery,
  parseStoredItem,
  previewTemplateFor,
  toPreviewItem,
} from "./bookmarks"

describe("parseStoredItem", () => {
  it("lee título, texto, colores e imagen", () => {
    const bookmark = parseStoredItem({
      id: "b1",
      title: "Para Ana",
      subtitle: "2026",
      description: "Una cita breve.",
      extra: JSON.stringify({
        colorFront: "#112233",
        colorBack: "#abcdef",
        image: "data:image/webp;base64,abc",
      }),
    })

    expect(bookmark).toEqual({
      id: "b1",
      title: "Para Ana",
      subtitle: "2026",
      text: "Una cita breve.",
      colorFront: "#112233",
      colorBack: "#abcdef",
      image: "data:image/webp;base64,abc",
      background: null,
    })
  })

  it("guarda el fondo generado", () => {
    const bookmark = parseStoredItem({
      id: "b4",
      title: "Fondo",
      subtitle: "",
      description: "",
      extra: JSON.stringify({ background: "data:image/webp;base64,fondo" }),
    })
    expect(bookmark.background).toBe("data:image/webp;base64,fondo")
    const payload = draftToPayload(bookmark)
    expect(JSON.parse(payload.extra).background).toBe("data:image/webp;base64,fondo")
  })

  it("usa valores seguros si el extra está vacío o mal formado", () => {
    const bookmark = parseStoredItem({
      id: "b2",
      title: "Nota",
      subtitle: null,
      description: null,
      extra: "{no",
    })

    expect(bookmark.subtitle).toBe("")
    expect(bookmark.text).toBe("")
    expect(bookmark.image).toBeNull()
    expect(bookmark.colorFront).toBe(emptyDraft().colorFront)
  })
})

describe("draftToPayload", () => {
  it("recorta el título y guarda los colores en extra", () => {
    const payload = draftToPayload({
      ...emptyDraft(),
      title: "  Para Ana  ",
      text: "Lee despacio.",
    })

    expect(payload.title).toBe("Para Ana")
    expect(payload.description).toBe("Lee despacio.")
    const extra = JSON.parse(payload.extra) as { colorFront: string; image: string | null }
    expect(extra.colorFront).toBe(emptyDraft().colorFront)
    expect(extra.image).toBeNull()
  })
})

describe("toPreviewItem", () => {
  it("muestra un título provisional y oculta el subtítulo vacío", () => {
    const draft = emptyDraft()
    const item = toPreviewItem(draft)
    expect(item.displayName).toBe("Sin título")
    expect(previewTemplateFor(draft).showSubtitle).toBe(false)
    expect(previewTemplateFor({ ...draft, subtitle: "Marzo" }).showSubtitle).toBe(true)
    expect(previewTemplateFor(draft).showYear).toBe(false)
    expect(previewTemplateFor(draft).showPrefix).toBe(false)
  })
})

describe("matchesQuery", () => {
  const bookmark = parseStoredItem({
    id: "b3",
    title: "Para Ana",
    subtitle: "Cumpleaños",
    description: "Que este libro te acompañe.",
    extra: null,
  })

  it("encuentra por título, subtítulo o texto", () => {
    expect(matchesQuery(bookmark, "ana")).toBe(true)
    expect(matchesQuery(bookmark, "CUMPLE")).toBe(true)
    expect(matchesQuery(bookmark, "acompañe")).toBe(true)
    expect(matchesQuery(bookmark, "   ")).toBe(true)
  })

  it("no coincide con otra búsqueda", () => {
    expect(matchesQuery(bookmark, "invierno")).toBe(false)
  })
})
