import { describe, expect, it } from "bun:test"
import { buildBackPiecePrompt, buildFrontPiecePrompt } from "./bookmark-prompts"

describe("buildFrontPiecePrompt", () => {
  it("pide el título y el subtítulo dibujados dentro de la imagen", () => {
    const prompt = buildFrontPiecePrompt("Para Ana", "Marzo 2026")
    expect(prompt).toContain('"Para Ana"')
    expect(prompt).toContain('"Marzo 2026"')
    expect(prompt.toLowerCase()).toContain("inside the image")
    expect(prompt.toLowerCase()).not.toContain("do not include any text")
    expect(prompt.toLowerCase()).not.toContain("no frames, borders, text")
  })

  it("no inventa un subtítulo si no hay", () => {
    const prompt = buildFrontPiecePrompt("Para Ana", "  ")
    expect(prompt).toContain("Do not invent a second line")
    expect(prompt).not.toContain('Subtitle, drawn')
  })
})

describe("buildBackPiecePrompt", () => {
  it("pide el texto del reverso dibujado y no lo prohíbe", () => {
    const prompt = buildBackPiecePrompt("Que este libro te acompañe.")
    expect(prompt).toContain('"Que este libro te acompañe."')
    expect(prompt.toLowerCase()).toContain("inside the image")
    expect(prompt.toLowerCase()).not.toContain("do not include any text")
    expect(prompt.toLowerCase()).not.toContain("background only")
  })
})
