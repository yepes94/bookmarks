import { describe, it, expect } from "bun:test"
import {
  projectItemToBookmarkItem,
  saintToProjectItemData,
  type ProjectItemRecord,
} from "./project-items"
import type { Saint } from "./saints-data"

describe("projectItemToBookmarkItem cannot produce invalid item shapes", () => {
  it("projectItemToBookmarkItem maps title to name and id", () => {
    const item: ProjectItemRecord = {
      id: "abc-123",
      projectId: "proj",
      title: "San Test",
      subtitle: "1 DE ENERO",
      description: "Un santo de prueba.",
      tagline: "Ora et labora",
      extra: null,
      imagePath: null,
    }

    const view = projectItemToBookmarkItem(item)

    expect(view.id).toBe("abc-123")
    expect(view.name).toBe("San Test")
    expect(typeof view.colorFront).toBe("string")
  })
})

describe("saintToProjectItemData cannot lose essential fields", () => {
  it("saintToProjectItemData includes title and extra JSON", () => {
    const saint: Saint = {
      id: "s1",
      name: "San Alpha",
      title: "SAN",
      displayName: "Alpha",
      feastDay: "1 ENERO",
      virtue: "FE",
      description: "Desc",
      period: "Siglo I",
      prayer: "Ruega por nosotros",
      watercolorFront: "#aaa",
      watercolorBack: "#bbb",
    }

    const data = saintToProjectItemData(saint)

    expect(data.title).toBe("San Alpha")
    expect(data.subtitle).toBe("1 ENERO")
    const parsed = JSON.parse(data.extra) as Record<string, string>
    expect(parsed.virtue).toBe("FE")
    expect(parsed.watercolorFront).toBe("#aaa")
  })
})
