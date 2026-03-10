import React from "react"
import { render, screen } from "@testing-library/react"
import HomePage from "./page"

vi.mock("@/components/project-selector", () => ({
  ProjectSelector: ({ onSelectProject }: { onSelectProject: (id: string, type: string | null) => void }) => {
    // Immediately select a non-santos empty project to simulate the error case.
    onSelectProject("project-1", "ciudades")
    return <div>selector</div>
  },
  getStoredProjectId: () => null,
}))

vi.mock("@/lib/project-items", () => ({
  projectItemToBookmarkItem: vi.fn(),
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

// Avoid running effects that call fetch during this test by mocking global fetch.
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ items: [] }),
}) as unknown as typeof fetch

describe("HomePage does not crash when saints list is empty", () => {
  it("renders template preview placeholder instead of accessing saints[0]", () => {
    render(<HomePage />)
    expect(
      screen.getByText(/No hay fichas en este proyecto todavia/i)
    ).toBeInTheDocument()
  })
})

