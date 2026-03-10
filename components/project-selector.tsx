"use client"

import { useState, useEffect, useCallback } from "react"
import { BookOpen, Plus, FolderOpen, Trash2 } from "lucide-react"

const STORAGE_KEY_CURRENT_PROJECT = "bookmark-current-project-id"

export interface ProjectSummary {
  id: string
  name: string
  slug: string
  type: string | null
  itemCount: number
}

interface ProjectSelectorProps {
  onSelectProject: (projectId: string, projectType: string | null) => void
}

export function ProjectSelector({ onSelectProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState("santos")
  const [creating, setCreating] = useState(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/projects")
      if (!res.ok) throw new Error("Error al cargar proyectos")
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), type: newType }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Error al crear")
      }
      const data = await res.json()
      setNewName("")
      setShowCreate(false)
      if (newType === "santos") {
        await fetch(`/api/projects/${data.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seedFromSaints: true }),
        })
      } else {
        const apiKey = typeof window !== "undefined" ? localStorage.getItem("bookmark-ai-google-key") : null
        if (apiKey) {
          try {
            await fetch(`/api/projects/${data.id}/generate-prompt-template`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ apiKey }),
            })
          } catch {
            // Ignore: project is created, generic prompts will be used
          }
        }
      }
      await fetchProjects()
      onSelectProject(data.id, (data.type as string | null) ?? null)
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_CURRENT_PROJECT, data.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear")
    } finally {
      setCreating(false)
    }
  }

  const handleSelect = (projectId: string, projectType: string | null) => {
    onSelectProject(projectId, projectType)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_CURRENT_PROJECT, projectId)
    }
  }

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    if (!confirm("¿Eliminar este proyecto? Se perderán todas sus fichas e imágenes.")) return
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      await fetchProjects()
      if (typeof window !== "undefined") {
        const current = localStorage.getItem(STORAGE_KEY_CURRENT_PROJECT)
        if (current === projectId) {
          localStorage.removeItem(STORAGE_KEY_CURRENT_PROJECT)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#2a2519] flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-[#f5f0e8]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2a2519] font-serif">Puntos de Libro</h1>
            <p className="text-xs text-[#8a7e6b]">Selecciona o crea un proyecto</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {showCreate ? (
          <form
            onSubmit={handleCreate}
            className="bg-[#faf8f4] border border-[#d4cfc4] rounded-xl p-6 shadow-sm mb-4"
          >
            <h2 className="text-sm font-semibold text-[#2a2519] mb-4">Crear proyecto</h2>
            <label className="block text-xs font-medium text-[#5a5040] mb-2">Nombre</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Mi proyecto, Colección 2026..."
              className="w-full px-4 py-2 bg-white border border-[#d4cfc4] rounded-lg text-[#2a2519] mb-4"
              autoFocus
            />
            <label className="block text-xs font-medium text-[#5a5040] mb-2">Tipo</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-[#d4cfc4] rounded-lg text-[#2a2519] mb-4"
            >
              <option value="santos">Santos</option>
              <option value="ciudades">Ciudades</option>
              <option value="animales">Animales</option>
              <option value="otro">Otro</option>
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="flex-1 py-2 font-medium bg-[#2a2519] text-[#faf8f4] rounded-lg hover:bg-[#3d3525] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creando..." : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName("") }}
                className="px-4 py-2 border border-[#d4cfc4] rounded-lg text-[#5a5040] hover:bg-[#f0ebe0]"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border-2 border-dashed border-[#d4cfc4] text-[#8a7e6b] hover:border-[#8a7e6b] hover:bg-[#faf8f4] transition-colors"
          >
            <Plus className="h-5 w-5" />
            Crear proyecto
          </button>
        )}

        <div className="bg-[#faf8f4] border border-[#d4cfc4] rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[#8a7e6b] text-sm">Cargando...</div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center text-[#8a7e6b] text-sm">
              No hay proyectos. Crea uno para empezar.
            </div>
          ) : (
            <ul className="divide-y divide-[#e8e0d0]">
              {projects.map((p) => (
                <li key={p.id}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#f0ebe0] transition-colors">
                    <button
                      type="button"
                      onClick={() => handleSelect(p.id, p.type)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <FolderOpen className="h-5 w-5 text-[#6b5d3e] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#2a2519] truncate">{p.name}</p>
                        <p className="text-xs text-[#8a7e6b]">
                          {p.itemCount} ficha{p.itemCount !== 1 ? "s" : ""} · {p.type ?? "otro"}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, p.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                      title="Eliminar proyecto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}

const LEGACY_STORAGE_KEY_PROJECT = "santos-current-project-id"

export function getStoredProjectId(): string | null {
  if (typeof window === "undefined") return null
  let v = localStorage.getItem(STORAGE_KEY_CURRENT_PROJECT)
  if (v) return v
  v = localStorage.getItem(LEGACY_STORAGE_KEY_PROJECT)
  if (v) {
    localStorage.setItem(STORAGE_KEY_CURRENT_PROJECT, v)
    localStorage.removeItem(LEGACY_STORAGE_KEY_PROJECT)
    return v
  }
  return null
}
