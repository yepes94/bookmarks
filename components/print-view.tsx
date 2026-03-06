"use client"

import type { Saint } from "@/lib/saints-data"
import type { ExtractedColors } from "@/lib/color-utils"
import { BookmarkFront } from "@/components/bookmark-front"
import { BookmarkBack } from "@/components/bookmark-back"

interface PrintViewProps {
  selectedSaints: Saint[]
  year: number
  customImages?: Record<string, string>
  customColors?: Record<string, ExtractedColors>
}

/**
 * Print layout designed for DOUBLE-SIDED printing.
 *
 * Logic:
 * - A4 sheet fits 3 bookmarks per row (3 cols) and 1 row per sheet = 3 bookmarks per sheet.
 *   (Bookmark: 220px wide ~= 58mm. A4 is 210mm. 3 bookmarks + margins fit.)
 * - Page A (odd): 3 FRONTS laid out left-to-right: [1] [2] [3]
 * - Page B (even): 3 BACKS in REVERSE order: [3] [2] [1]
 *   This way, when the paper is flipped along the long edge for duplex printing,
 *   each back aligns perfectly behind its corresponding front.
 */

const BOOKMARKS_PER_SHEET = 3

export function PrintView({ selectedSaints, year, customImages = {}, customColors = {} }: PrintViewProps) {
  // Split saints into groups of BOOKMARKS_PER_SHEET
  const sheets: Saint[][] = []
  for (let i = 0; i < selectedSaints.length; i += BOOKMARKS_PER_SHEET) {
    sheets.push(selectedSaints.slice(i, i + BOOKMARKS_PER_SHEET))
  }

  if (selectedSaints.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[#8a7e6b]">
        <p className="font-serif text-lg italic">
          Selecciona al menos un santo para ver la vista de impresion
        </p>
      </div>
    )
  }

  const totalPrintPages = sheets.length * 2 // fronts + backs

  return (
    <div className="flex flex-col gap-8">
      {/* Controls bar */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <p className="text-sm text-[#8a7e6b]">
            {selectedSaints.length} punto{selectedSaints.length !== 1 ? "s" : ""} de libro
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

      {/* Sheet pairs */}
      {sheets.map((sheetSaints, sheetIdx) => {
        // For the backs, reverse the order so they mirror the fronts when flipped
        const backsOrder = [...sheetSaints].reverse()

        return (
          <div key={sheetIdx} className="flex flex-col gap-6">
            {/* === PAGE A: FRONTS === */}
            <div>
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
                  {sheetSaints.map((saint) => (
                    <div key={saint.id} className="print-bookmark-cell">
                      <BookmarkFront
                        saint={saint}
                        year={year}
                        customImage={customImages[saint.id] || null}
                        customColors={customColors[saint.id] || null}
                      />
                    </div>
                  ))}
                  {/* Fill empty slots to maintain spacing */}
                  {Array.from({ length: BOOKMARKS_PER_SHEET - sheetSaints.length }).map((_, i) => (
                    <div key={`empty-front-${i}`} className="print-bookmark-cell print-bookmark-empty" />
                  ))}
                </div>
              </div>
            </div>

            {/* === PAGE B: BACKS (reversed order) === */}
            <div>
              <div className="no-print mb-2 flex items-center gap-2">
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
                  {backsOrder.map((saint) => (
                    <div key={saint.id} className="print-bookmark-cell">
                      <BookmarkBack
                        saint={saint}
                        customColors={customColors[saint.id] || null}
                      />
                    </div>
                  ))}
                  {/* Fill empty slots on the LEFT to maintain alignment */}
                  {Array.from({ length: BOOKMARKS_PER_SHEET - sheetSaints.length }).map((_, i) => (
                    <div key={`empty-back-${i}`} className="print-bookmark-cell print-bookmark-empty" />
                  ))}
                </div>
              </div>
            </div>

            {/* Separator between sheet groups */}
            {sheetIdx < sheets.length - 1 && (
              <div className="no-print border-t-2 border-dashed border-[#d4cfc4] pt-2" />
            )}
          </div>
        )
      })}

      {/* Print instructions */}
      <div className="no-print mt-4 p-4 bg-[#faf8f4] rounded-lg border border-[#d4cfc4]">
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
