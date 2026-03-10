import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import HomePage from "./page"

vi.mock("@/components/project-selector", () => ({
  ProjectSelector: ({ onSelectProject }: { onSelectProject: (id: string, type: string | null) => void }) => {
    onSelectProject("project-1", "santos")
    return <div>selector</div>
  },
  getStoredProjectId: () => null,
}))

vi.mock("@/lib/project-items", () => ({
  projectItemToBookmarkItem: (item: unknown) => item,
}))

vi.mock("@/components/item-selector", () => ({
  ItemSelector: () => <div>item-selector</div>,
}))

vi.mock("@/components/bookmark-front", () => ({
  BookmarkFront: () => <div>bookmark-front</div>,
}))

vi.mock("@/components/bookmark-back", () => ({
  BookmarkBack: () => <div>bookmark-back</div>,
}))

vi.mock("@/components/print-view", () => ({
  PrintView: () => <div>print-view</div>,
}))

vi.mock("@/components/background-generate-button", () => ({
  BackgroundPoolManager: () => <div>bg-manager</div>,
}))

vi.mock("@/components/background-editor", () => ({
  BackgroundEditor: () => <div>bg-editor</div>,
}))

vi.mock("@/components/image-gallery", () => ({
  ImageGallery: () => <div>image-gallery</div>,
}))

const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ items: [] }),
})

global.fetch = fetchMock as unknown as typeof fetch

describe("HomePage catalog generation model selection", () => {
  it("sends the selected model to the generate-catalog API", async () => {
    render(<HomePage />)

    const topicInput = screen.getByPlaceholderText(/Santos de Europa, Ciudades italianas/i)
    fireEvent.change(topicInput, { target: { value: "Tema de prueba 𐐷" } })

    const modelSelect = screen.getByLabelText(/Modelo:/i)
    fireEvent.change(modelSelect, { target: { value: "gemini-3.1-pro-preview" } })

    const button = screen.getByRole("button", { name: /Generar con IA/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    const lastCall = fetchMock.mock.calls[0]
    const body = JSON.parse(lastCall[1].body as string)

    expect(body.model).toBe("gemini-3.1-pro-preview")
  })
}

