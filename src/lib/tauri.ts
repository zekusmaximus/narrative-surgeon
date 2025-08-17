import { invoke } from '@tauri-apps/api/core'
import type { Scene, ManuscriptSummary, ImportResult, ExportFormat } from '../types'

export class TauriAPI {
  // Database Operations
  static async createManuscript(title: string, content: string): Promise<{ id: string }> {
    return await invoke('create_manuscript_safe', { title, text: content })
  }

  static async loadManuscript(): Promise<ManuscriptSummary | null> {
    const result = await invoke('get_manuscript')
    return result || null
  }

  static async deleteManuscript(): Promise<{ success: boolean }> {
    return await invoke('delete_manuscript_safe')
  }

  // Scene Management
  static async getScenes(): Promise<Scene[]> {
    const result = await invoke('get_all_scenes')
    return Array.isArray(result) ? result : []
  }

  static async updateScene(id: string, updates: Partial<Scene>): Promise<{ success: boolean }> {
    return await invoke('update_scene_safe', { sceneId: id, updates })
  }

  // File Operations
  static async importFile(path: string): Promise<ImportResult> {
    return await invoke('import_file', { path })
  }

  static async batchImportFiles(): Promise<ImportResult[]> {
    return await invoke('batch_import_files')
  }

  static async exportManuscript(
    id: string, 
    format: ExportFormat, 
    path: string
  ): Promise<{ success: boolean }> {
    return await invoke('export_manuscript', { id, format, path })
  }

  // Error Handling
  static async getRecentErrors(limit?: number): Promise<any[]> {
    return await invoke('get_recent_errors', { limit })
  }

  // Utility method for handling Tauri command errors
  static async safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    try {
      return await invoke(command, args)
    } catch (error) {
      console.error(`Tauri command ${command} failed:`, error)
      throw error
    }
  }
}