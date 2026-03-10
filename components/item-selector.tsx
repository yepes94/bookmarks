"use client"

import { useState, useMemo } from "react"
import type { BookmarkItem } from "@/lib/bookmark-item"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Check } from "lucide-react"

interface ItemSelectorProps {
  items: BookmarkItem[]
  selectedItems: BookmarkItem[]
  onToggleItem: (item: BookmarkItem) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

export function ItemSelector({
  items,
  selectedItems,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
}: ItemSelectorProps) {
  const [search, setSearch] = useState("")

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q)
    )
  }, [search, items])

  const isSelected = (item: BookmarkItem) =>
    selectedItems.some((s) => s.id === item.id)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a7e6b]" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-[#faf8f4] border-[#d4cfc4] text-[#2a2519] placeholder:text-[#a89e8c] focus-visible:ring-[#8a7e6b]"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSelectAll}
          className="text-xs font-medium text-[#6b5d3e] hover:text-[#2a2519] transition-colors px-2 py-1 rounded bg-[#f0ebe0] hover:bg-[#e4ddd0]"
        >
          Seleccionar todos
        </button>
        <button
          onClick={onDeselectAll}
          className="text-xs font-medium text-[#6b5d3e] hover:text-[#2a2519] transition-colors px-2 py-1 rounded bg-[#f0ebe0] hover:bg-[#e4ddd0]"
        >
          Deseleccionar todos
        </button>
        <span className="ml-auto text-xs text-[#8a7e6b] self-center">
          {selectedItems.length} de {items.length}
        </span>
      </div>

      <ScrollArea className="h-[520px] rounded-lg border border-[#d4cfc4] bg-[#faf8f4]">
        <div className="p-2 flex flex-col gap-1">
          {filteredItems.map((item) => {
            const selected = isSelected(item)
            return (
              <button
                key={item.id}
                onClick={() => onToggleItem(item)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all ${
                  selected
                    ? "bg-[#e8e0d0] border border-[#c4b898]"
                    : "bg-transparent border border-transparent hover:bg-[#f0ebe0]"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selected
                      ? "bg-[#6b5d3e] border-[#6b5d3e]"
                      : "border-[#c4bca8] bg-transparent"
                  }`}
                >
                  {selected && <Check className="h-3 w-3 text-[#faf8f4]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#2a2519] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-[#8a7e6b]">{item.subtitle}</p>
                </div>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.colorFront }}
                  title={item.tagline}
                />
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
