"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { BookmarkFront } from "@/components/bookmark-front"
import { BookmarkBack } from "@/components/bookmark-back"
import { compressImageDataUrl } from "@/lib/image-compress"
import {
  LIBRARY_NAME,
  LIBRARY_SLUG,
  draftToPayload,
  emptyDraft,
  matchesQuery,
  parseStoredItem,
  previewTemplateFor,
  snapshotDraft,
  toPreviewItem,
  type BookmarkDraft,
  type BookmarkRecord,
  type StoredBookmark,
} from "@/lib/bookmarks"
import "@/app/bookmark-styles.css"

type Screen = "library" | "editor"
type Dialog = "delete" | "discard" | null

const inputClass =
  "w-full rounded-lg border border-[#d5ccbf] bg-white px-3 py-2.5 text-base text-[#241f18] placeholder:text-[#8a8175] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241f18]"

export default function HomePage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [projectId, setProjectId] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<StoredBookmark[]>([])
  const [query, setQuery] = useState("")
  const [screen, setScreen] = useState<Screen>("library")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<BookmarkDraft>(emptyDraft())
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshotDraft(emptyDraft()))
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const newButtonRef = useRef<HTMLButtonElement>(null)
  const searchId = useId()

  const loadLibrary = useCallback(async () => {
    setStatus("loading")
    try {
      const listRes = await fetch("/api/projects")
      if (!listRes.ok) throw new Error("projects")
      const list = (await listRes.json()) as { projects?: { id: string; slug?: string }[] }
      const projects = Array.isArray(list.projects) ? list.projects : []
      let library = projects.find((project) => project.slug === LIBRARY_SLUG)

      if (!library) {
        const createRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: LIBRARY_NAME, type: "biblioteca" }),
        })
        if (!createRes.ok) throw new Error("create-library")
        library = (await createRes.json()) as { id: string; slug?: string }
      }

      const itemsRes = await fetch(`/api/projects/${library.id}/items`)
      if (!itemsRes.ok) throw new Error("items")
      const itemsData = (await itemsRes.json()) as { items?: BookmarkRecord[] }
      const items = Array.isArray(itemsData.items) ? itemsData.items : []
      setProjectId(library.id)
      setBookmarks(items.map(parseStoredItem).reverse())
      setStatus("ready")
    } catch {
      setStatus("error")
    }
  }, [])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  useEffect(() => {
    if (screen === "editor") {
      titleRef.current?.focus()
    }
  }, [screen, editingId])

  const openNew = () => {
    const next = emptyDraft()
    setEditingId(null)
    setDraft(next)
    setSavedSnapshot(snapshotDraft(next))
    setSaveMessage(null)
    setFormError(null)
    setDialog(null)
    setScreen("editor")
  }

  const openExisting = (bookmark: StoredBookmark) => {
    const next: BookmarkDraft = {
      title: bookmark.title,
      subtitle: bookmark.subtitle,
      text: bookmark.text,
      colorFront: bookmark.colorFront,
      colorBack: bookmark.colorBack,
      image: bookmark.image,
    }
    setEditingId(bookmark.id)
    setDraft(next)
    setSavedSnapshot(snapshotDraft(next))
    setSaveMessage(null)
    setFormError(null)
    setDialog(null)
    setScreen("editor")
  }

  const returnToLibrary = () => {
    setDialog(null)
    setScreen("library")
    setSaveMessage(null)
    setFormError(null)
    window.setTimeout(() => newButtonRef.current?.focus(), 0)
  }

  const requestBack = () => {
    if (snapshotDraft(draft) !== savedSnapshot) {
      setDialog("discard")
      return
    }
    returnToLibrary()
  }

  const updateDraft = (patch: Partial<BookmarkDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setSaveMessage(null)
  }

  const handleImage = async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setFormError("Elige un archivo de imagen.")
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setFormError("La imagen es demasiado grande. Elige una de menos de 8 MB.")
      return
    }
    setFormError(null)
    const dataUrl = await readFile(file)
    const compressed = await compressImageDataUrl(dataUrl)
    updateDraft({ image: compressed })
  }

  const save = async () => {
    if (!projectId) return
    const title = draft.title.trim()
    if (!title) {
      setFormError("Escribe un título para guardar el punto de libro.")
      titleRef.current?.focus()
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = draftToPayload({ ...draft, title })
      const res = await fetch(
        editingId ? `/api/projects/${projectId}/items/${editingId}` : `/api/projects/${projectId}/items`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      if (!res.ok) throw new Error("save")
      const saved = parseStoredItem((await res.json()) as BookmarkRecord)
      setBookmarks((current) => {
        const rest = current.filter((item) => item.id !== saved.id)
        return [saved, ...rest]
      })
      setEditingId(saved.id)
      setDraft(saved)
      setSavedSnapshot(snapshotDraft(saved))
      setSaveMessage("Guardado")
    } catch {
      setFormError("No se pudo guardar. Inténtalo de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!projectId || !editingId) return
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/items/${editingId}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) throw new Error("delete")
      setBookmarks((current) => current.filter((item) => item.id !== editingId))
      setDialog(null)
      returnToLibrary()
    } catch {
      setDialog(null)
      setFormError("No se pudo eliminar. Inténtalo de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  const visible = bookmarks.filter((bookmark) => matchesQuery(bookmark, query))
  const previewItem = toPreviewItem(draft, editingId ?? "preview")
  const template = previewTemplateFor(draft)

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#f3efe6] text-[#241f18]">
        <p className="px-6 py-16 text-base">Cargando puntos de libro…</p>
      </main>
    )
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-[#f3efe6] px-6 py-16 text-[#241f18]">
        <div className="mx-auto max-w-lg">
          <h1 className="font-serif text-3xl">Puntos de libro</h1>
          <p className="mt-3 text-base leading-relaxed text-[#5e564c]">No se pudieron cargar tus puntos de libro.</p>
          <button type="button" onClick={() => void loadLibrary()} className={primaryButtonClass + " mt-6"}>
            Reintentar
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3efe6] text-[#241f18]">
      {screen === "library" ? (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h1 className="font-serif text-4xl leading-tight">Puntos de libro</h1>
              <p className="mt-2 text-base leading-relaxed text-[#5e564c]">
                Crea un punto de libro, guárdalo y ábrelo cuando quieras imprimirlo o cambiarlo.
              </p>
            </div>
            {bookmarks.length > 0 && (
              <button ref={newButtonRef} type="button" onClick={openNew} className={primaryButtonClass}>
                Nuevo punto de libro
              </button>
            )}
          </header>

          {bookmarks.length === 0 ? (
            <section className="rounded-xl border border-[#ddd4c6] bg-[#faf8f4] px-6 py-12 text-center">
              <h2 className="font-serif text-2xl">Todavía no hay puntos de libro</h2>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-[#5e564c]">
                Empieza por un título y el texto del reverso. Podrás ver el frente y el dorso antes de guardar.
              </p>
              <button ref={newButtonRef} type="button" onClick={openNew} className={primaryButtonClass + " mt-6"}>
                Nuevo punto de libro
              </button>
            </section>
          ) : (
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={searchId} className="text-sm font-medium">
                  Buscar
                </label>
                <input
                  id={searchId}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Título o texto"
                  className={inputClass}
                />
              </div>

              {visible.length === 0 ? (
                <div className="rounded-xl border border-[#ddd4c6] bg-[#faf8f4] px-6 py-8">
                  <h2 className="font-serif text-xl">Ningún punto de libro coincide</h2>
                  <p className="mt-2 text-base text-[#5e564c]">No hay resultados para «{query.trim()}».</p>
                  <button type="button" onClick={() => setQuery("")} className={secondaryButtonClass + " mt-4"}>
                    Limpiar búsqueda
                  </button>
                </div>
              ) : (
                <ul className="overflow-hidden rounded-xl border border-[#ddd4c6] bg-[#faf8f4]">
                  {visible.map((bookmark) => (
                    <li key={bookmark.id} className="border-b border-[#ddd4c6] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => openExisting(bookmark)}
                        aria-label={`Abrir ${bookmark.title}`}
                        className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-[#f3efe6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#241f18]"
                      >
                        <span
                          aria-hidden="true"
                          className="h-12 w-3 shrink-0 rounded-sm border border-[#d5ccbf]"
                          style={{ backgroundColor: bookmark.colorFront }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-serif text-xl leading-snug">{bookmark.title}</span>
                          <span className="mt-0.5 block truncate text-sm text-[#5e564c]">
                            {bookmark.subtitle || bookmark.text || "Sin texto"}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-medium">Abrir</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
          <header className="no-print flex flex-col gap-4 border-b border-[#ddd4c6] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col items-start gap-3">
              <button type="button" onClick={requestBack} className={secondaryButtonClass}>
                Volver
              </button>
              <h1 className="font-serif text-3xl leading-tight">
                {editingId ? "Editar punto de libro" : "Nuevo punto de libro"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-h-6 text-sm text-[#2f6b45]" role="status" aria-live="polite">
                {saveMessage}
              </p>
              <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
                Imprimir
              </button>
              <button type="button" onClick={() => void save()} disabled={saving} className={primaryButtonClass}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </header>

          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,24rem)_1fr]">
            <form
              className="no-print flex flex-col gap-5"
              onSubmit={(event) => {
                event.preventDefault()
                void save()
              }}
            >
              <Field id="bookmark-title" label="Título">
                <input
                  ref={titleRef}
                  id="bookmark-title"
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  placeholder="Para Ana"
                  required
                  className={inputClass}
                />
              </Field>

              <Field id="bookmark-subtitle" label="Subtítulo" hint="Opcional. Una fecha, un nombre o una dedicatoria corta.">
                <input
                  id="bookmark-subtitle"
                  value={draft.subtitle}
                  onChange={(event) => updateDraft({ subtitle: event.target.value })}
                  aria-describedby="bookmark-subtitle-hint"
                  placeholder="Marzo 2026"
                  className={inputClass}
                />
              </Field>

              <Field id="bookmark-text" label="Texto del reverso" hint="Una cita, una oración o una nota.">
                <textarea
                  id="bookmark-text"
                  value={draft.text}
                  onChange={(event) => updateDraft({ text: event.target.value })}
                  aria-describedby="bookmark-text-hint"
                  rows={6}
                  placeholder="Que este libro te acompañe."
                  className={inputClass + " resize-y"}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field id="bookmark-color-front" label="Color del frente">
                  <input
                    id="bookmark-color-front"
                    type="color"
                    value={draft.colorFront}
                    onChange={(event) => updateDraft({ colorFront: event.target.value })}
                    className="h-11 w-full cursor-pointer rounded-lg border border-[#d5ccbf] bg-white p-1"
                  />
                </Field>
                <Field id="bookmark-color-back" label="Color del dorso">
                  <input
                    id="bookmark-color-back"
                    type="color"
                    value={draft.colorBack}
                    onChange={(event) => updateDraft({ colorBack: event.target.value })}
                    className="h-11 w-full cursor-pointer rounded-lg border border-[#d5ccbf] bg-white p-1"
                  />
                </Field>
              </div>

              <Field id="bookmark-image" label="Imagen" hint="Opcional. Aparece en el frente.">
                <input
                  id="bookmark-image"
                  type="file"
                  accept="image/*"
                  aria-describedby="bookmark-image-hint"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    event.target.value = ""
                    void handleImage(file)
                  }}
                  className="block w-full text-sm text-[#5e564c] file:mr-3 file:rounded-lg file:border file:border-[#d5ccbf] file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#241f18]"
                />
              </Field>

              {draft.image && (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draft.image} alt="" className="h-16 w-12 rounded-sm border border-[#d5ccbf] object-cover" />
                  <button type="button" onClick={() => updateDraft({ image: null })} className={secondaryButtonClass}>
                    Quitar imagen
                  </button>
                </div>
              )}

              {formError && (
                <p role="alert" className="text-sm text-[#8f2d2d]">
                  {formError}
                </p>
              )}

              {editingId && (
                <div className="border-t border-[#ddd4c6] pt-5">
                  <button type="button" onClick={() => setDialog("delete")} className={dangerButtonClass}>
                    Eliminar
                  </button>
                </div>
              )}
            </form>

            <section aria-label="Vista previa" className="flex flex-wrap justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <p className="no-print text-sm font-medium text-[#5e564c]">Frente</p>
                <div className="preview-frame">
                  <div className="preview-scale">
                    <BookmarkFront
                      item={previewItem}
                      customImage={draft.image}
                      template={template}
                      editable={false}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="no-print text-sm font-medium text-[#5e564c]">Reverso</p>
                <div className="preview-frame">
                  <div className="preview-scale">
                    <BookmarkBack item={previewItem} template={template} />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {dialog === "delete" && (
        <ConfirmDialog
          title="Eliminar este punto de libro"
          body={`Se borrará «${draft.title.trim() || "Sin título"}». Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={() => void remove()}
          onCancel={() => setDialog(null)}
          danger
        />
      )}

      {dialog === "discard" && (
        <ConfirmDialog
          title="Hay cambios sin guardar"
          body="Si vuelves ahora, se perderá lo que no hayas guardado."
          confirmLabel="Descartar cambios"
          cancelLabel="Seguir editando"
          onConfirm={returnToLibrary}
          onCancel={() => setDialog(null)}
          danger
        />
      )}
    </main>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm leading-relaxed text-[#5e564c]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  danger = false,
}: {
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelRef.current()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#241f18]/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-[#ddd4c6] bg-[#faf8f4] p-6"
      >
        <h2 id={titleId} className="font-serif text-2xl">
          {title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[#5e564c]">{body}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} className={secondaryButtonClass}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={danger ? dangerButtonClass : primaryButtonClass}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#241f18] px-4 py-2.5 text-base font-medium text-[#faf8f4] hover:bg-[#3a3328] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241f18] disabled:opacity-60"

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d5ccbf] bg-[#faf8f4] px-4 py-2.5 text-base font-medium text-[#241f18] hover:bg-[#f3efe6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241f18]"

const dangerButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#e4c8c4] bg-[#faf8f4] px-4 py-2.5 text-base font-medium text-[#8f2d2d] hover:bg-[#f8eeec] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f2d2d]"
