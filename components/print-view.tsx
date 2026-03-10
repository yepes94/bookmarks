"use client"

import type { BookmarkItem } from "@/lib/bookmark-item"
import type { ExtractedColors } from "@/lib/color-utils"
import type { BookmarkTemplate, ItemBackground, ItemImageSize } from "@/lib/template-config"
import { pickBackground } from "@/lib/template-config"
import { BookmarkFront, type CustomItemTexts } from "@/components/bookmark-front"
import { BookmarkBack } from "@/components/bookmark-back"

interface PrintViewProps {
  selectedItems: BookmarkItem[]
  year: number
  customImages?: Record<string, string>
  customColors?: Record<string, ExtractedColors>
  backgroundPool?: string[]
  bgAssignments?: Record<string, number>
  template?: BookmarkTemplate
  customTexts?: Record<string, CustomItemTexts>
  itemBackgrounds?: Record<string, ItemBackground>
  itemImageSizes?: Record<string, ItemImageSize>
}

/**
 * Print layout designed for DOUBLE-SIDED printing.
 *
 * Logic:
 * - A4 landscape sheet fits 4 bookmarks per row (4 cols) and 1 row per sheet = 4 bookmarks per sheet.
 *   (Bookmark: 220px wide ~= 55mm. A4 landscape is 297mm. 4 bookmarks + gaps fit with room for cutting.)
 * - Page A (odd): 4 FRONTS laid out left-to-right: [1] [2] [3] [4]
 * - Page B (even): 4 BACKS in REVERSE order: [4] [3] [2] [1]
 *   This way, when the paper is flipped along the long edge for duplex printing,
 *   each back aligns perfectly behind its corresponding front.
 */

const BOOKMARKS_PER_SHEET = 4

export function PrintView({ selectedItems, year, customImages = {}, customColors = {}, backgroundPool = [], bgAssignments = {}, template, customTexts = {}, itemBackgrounds = {}, itemImageSizes = {} }: PrintViewProps) {
  const getBackground = (itemId: string): string | null => {
    if (backgroundPool.length === 0) return null
    const assigned = bgAssignments[itemId]
    if (assigned !== undefined && assigned < backgroundPool.length) {
      return backgroundPool[assigned]
    }
    return pickBackground(backgroundPool, itemId)
  }
  const sheets: BookmarkItem[][] = []
  for (let i = 0; i < selectedItems.length; i += BOOKMARKS_PER_SHEET) {
    sheets.push(selectedItems.slice(i, i + BOOKMARKS_PER_SHEET))
  }

  if (selectedItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[#8a7e6b]">
        <p className="font-serif text-lg italic">
          Selecciona al menos una ficha para ver la vista de impresion
        </p>
      </div>
    )
  }

  const totalPrintPages = sheets.length * 2

  return (
    <div>
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <p className="text-sm text-[#8a7e6b]">
            {selectedItems.length} punto{selectedItems.length !== 1 ? "s" : ""} de libro
            {" "}&middot;{" "}
            {totalPrintPages} pagina{totalPrintPages !== 1 ? "s" : ""} a imprimir
          </p>
          <p className="text-xs text-[#8a7e6b] mt-1 italic">
            Impresion a doble cara: las caras frontales y los reversos se imprimen en paginas separadas
            que encajan al dar la vuelta al papel.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-[#2a2519] text-[#faf8f4] rounded-md font-medium text-sm hover:bg-[#3d3525] transition-colors flex-shrink-0"
        >
          Imprimir / Exportar PDF
        </button>
      </div>

      {sheets.map((sheetItems, sheetIdx) => {
        const backsOrder = [...sheetItems].reverse()

        return (
          <div key={sheetIdx}>
            <div className="no-print mb-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2a2519] text-[#faf8f4] text-xs font-bold">
                {sheetIdx * 2 + 1}
              </span>
              <p className="text-xs text-[#8a7e6b] font-medium uppercase tracking-wider">
                Hoja {sheetIdx + 1} - Cara frontal
                <span className="text-[10px] normal-case tracking-normal font-normal ml-2 italic">
                  (imprimir primero)
                </span>
              </p>
            </div>

            <div className="print-sheet-preview print-page">
              <div className="print-row">
                {sheetItems.map((item) => (
                  <div key={item.id} className="print-bookmark-cell">
                    <BookmarkFront
                      item={item}
                      year={year}
                      customImage={customImages[item.id] ?? null}
                      customColors={customColors[item.id] || null}
                      template={template}
                      backgroundImage={getBackground(item.id)}
                      customTexts={customTexts[item.id]}
                      itemBackground={itemBackgrounds[item.id]}
                      itemImageSize={itemImageSizes[item.id]}
                    />
                  </div>
                ))}
                {Array.from({ length: BOOKMARKS_PER_SHEET - sheetItems.length }).map((_, i) => (
                  <div key={`empty-front-${i}`} className="print-bookmark-cell print-bookmark-empty" />
                ))}
              </div>
            </div>

            <div className="no-print mt-6 mb-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#6b5d3e] text-[#faf8f4] text-xs font-bold">
                {sheetIdx * 2 + 2}
              </span>
              <p className="text-xs text-[#8a7e6b] font-medium uppercase tracking-wider">
                Hoja {sheetIdx + 1} - Reverso
                <span className="text-[10px] normal-case tracking-normal font-normal ml-2 italic">
                  (dar la vuelta al papel e imprimir)
                </span>
              </p>
            </div>

            <div className="print-sheet-preview print-page">
              <div className="print-row">
                {backsOrder.map((item) => (
                  <div key={item.id} className="print-bookmark-cell">
                    <BookmarkBack
                      item={item}
                      customColors={customColors[item.id] || null}
                      template={template}
                      backgroundImage={getBackground(item.id)}
                      itemBackground={itemBackgrounds[item.id]}
                    />
                  </div>
                ))}
                {Array.from({ length: BOOKMARKS_PER_SHEET - sheetItems.length }).map((_, i) => (
                  <div key={`empty-back-${i}`} className="print-bookmark-cell print-bookmark-empty" />
                ))}
              </div>
            </div>

            {sheetIdx < sheets.length - 1 && (
              <div className="no-print border-t-2 border-dashed border-[#d4cfc4] my-6" />
            )}
          </div>
        )
      })}

      <div className="no-print mt-6 p-4 bg-[#faf8f4] rounded-lg border border-[#d4cfc4]">
        <h3 className="text-sm font-bold text-[#2a2519] mb-2">
          Instrucciones para imprimir a doble cara
        </h3>
        <ol className="text-xs text-[#5a5040] leading-relaxed list-decimal list-inside flex flex-col gap-1.5">
          <li>Haz clic en <strong>Imprimir / Exportar PDF</strong>.</li>
          <li>En el dialogo de impresion, selecciona <strong>solo las paginas impares</strong> (1, 3, 5...) y lanza la impresion.</li>
          <li>Recoge las hojas impresas y vuelvelas a colocar en la bandeja <strong>boca abajo</strong> (con el lado impreso hacia abajo).</li>
          <li>Ahora imprime <strong>solo las paginas pares</strong> (2, 4, 6...) sobre esas mismas hojas.</li>
          <li>Cada reverso se alineara perfectamente con su cara frontal correspondiente.</li>
          <li>Recorta los puntos de libro siguiendo los bordes.</li>
        </ol>
        <p className="text-[10px] text-[#8a7e6b] mt-3 italic">
          Si tu impresora soporta impresion automatica a doble cara (duplex), simplemente imprime todas las paginas con la opcion de volteo por el borde largo activada.
        </p>
      </div>
    </div>
  )
}
