/* Ambient module declarations to satisfy plugin imports at compile time. */

declare module '@tauri-apps/plugin-global-shortcut' {
  export function register(name: string, handler: () => void): Promise<void>
  export function unregister(name: string): Promise<void>
  export function isRegistered(name: string): Promise<boolean>
  export function unregisterAll(): Promise<void>
}

declare module '@tauri-apps/plugin-notification' {
  export type Permission = 'granted' | 'denied' | 'default'
  export function isPermissionGranted(): Promise<boolean>
  export function requestPermission(): Promise<Permission>
  export function sendNotification(options: { title?: string; body?: string }): void
}

declare module '@tauri-apps/plugin-updater' {
  export type UpdateInfo = { version: string; body?: string; available?: boolean; date?: string }
  export function check(): Promise<UpdateInfo | null>
  export function installUpdate(): Promise<void>
  export function onUpdaterEvent(
    cb: (event: { status: string; error?: string; downloaded?: number; contentLength?: number }) => void
  ): () => void
}

declare module '@tauri-apps/plugin-process' {
  export function relaunch(): Promise<void>
  export function exit(code?: number): Promise<void>
}

declare module '@tauri-apps/api/window' {
  export const appWindow: any
  export type Window = any
}

declare module '@tauri-apps/api/tauri' {
  export function invoke<T = any>(cmd: string, args?: Record<string, any>): Promise<T>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    // Custom nodes
    insertSceneBreak: () => ReturnType
    insertChapterDivision: (attrs: { number?: number; title?: string }) => ReturnType

    // Focus mode (root-level commands as implemented in FocusMode extension)
    toggleFocusMode: () => ReturnType
    enableFocusMode: () => ReturnType
    disableFocusMode: () => ReturnType
    toggleFocusUnit: () => ReturnType
    setFocusOpacity: (opacity: number) => ReturnType

    // Comments (root-level commands as implemented in Comments extension)
    addComment: (text: string, author: string) => ReturnType
    removeComment: (commentId: string) => ReturnType
    toggleCommentResolution: (commentId: string) => ReturnType
    replyToComment: (commentId: string, text: string, author: string) => ReturnType
    setActiveComment: (commentId: string | null) => ReturnType

    // Find & Replace (root-level commands as implemented in FindAndReplace extension)
    startFindAndReplace: () => ReturnType
    stopFindAndReplace: () => ReturnType
    setSearchTerm: (query: string) => ReturnType
    setReplaceTerm: (query: string) => ReturnType
    findNext: () => ReturnType
    findPrevious: () => ReturnType
    replace: () => ReturnType
    replaceAll: () => ReturnType
    toggleCaseSensitive: () => ReturnType
    toggleRegex: () => ReturnType

  // Track Changes
  toggleTrackChanges: () => ReturnType
  acceptChange: (changeId: string) => ReturnType
  rejectChange: (changeId: string) => ReturnType
  getAllChanges: () => ReturnType

    // Base editor commands used externally (ensure availability in typing context)
    focus: (position?: string | number | { from: number; to?: number }) => ReturnType
    blur: () => ReturnType
    setContent: (content: any, emitUpdate?: boolean, parseOptions?: any) => ReturnType
    insertContent: (value: any) => ReturnType
  }
  interface ChainedCommands {
    focus: (position?: string | number | { from: number; to?: number }) => this
    blur: () => this
    setContent: (content: any, emitUpdate?: boolean, parseOptions?: any) => this
    insertContent: (value: any) => this
    insertSceneBreak: () => this
    insertChapterDivision: (attrs: { number?: number; title?: string }) => this
    toggleFocusMode: () => this
    enableFocusMode: () => this
    disableFocusMode: () => this
    toggleFocusUnit: () => this
    setFocusOpacity: (opacity: number) => this
    addComment: (text: string, author: string) => this
    removeComment: (commentId: string) => this
    toggleCommentResolution: (commentId: string) => this
    replyToComment: (commentId: string, text: string, author: string) => this
    setActiveComment: (commentId: string | null) => this
    startFindAndReplace: () => this
    stopFindAndReplace: () => this
    setSearchTerm: (query: string) => this
    setReplaceTerm: (query: string) => this
    findNext: () => this
    findPrevious: () => this
    replace: () => this
    replaceAll: () => this
    toggleCaseSensitive: () => this
    toggleRegex: () => this
    toggleTrackChanges: () => this
    acceptChange: (changeId: string) => this
    rejectChange: (changeId: string) => this
    getAllChanges: () => this
  }
  interface SingleCommands {
    focus: (position?: string | number | { from: number; to?: number }) => boolean
    blur: () => boolean
    setContent: (content: any, emitUpdate?: boolean, parseOptions?: any) => boolean
    insertContent: (value: any) => boolean
    insertSceneBreak: () => boolean
    insertChapterDivision: (attrs: { number?: number; title?: string }) => boolean
    toggleFocusMode: () => boolean
    enableFocusMode: () => boolean
    disableFocusMode: () => boolean
    toggleFocusUnit: () => boolean
    setFocusOpacity: (opacity: number) => boolean
    addComment: (text: string, author: string) => boolean
    removeComment: (commentId: string) => boolean
    toggleCommentResolution: (commentId: string) => boolean
    replyToComment: (commentId: string, text: string, author: string) => boolean
    setActiveComment: (commentId: string | null) => boolean
    startFindAndReplace: () => boolean
    stopFindAndReplace: () => boolean
    setSearchTerm: (query: string) => boolean
    setReplaceTerm: (query: string) => boolean
    findNext: () => boolean
    findPrevious: () => boolean
    replace: () => boolean
    replaceAll: () => boolean
    toggleCaseSensitive: () => boolean
    toggleRegex: () => boolean
    toggleTrackChanges: () => boolean
    acceptChange: (changeId: string) => boolean
    rejectChange: (changeId: string) => boolean
    getAllChanges: () => any
  }
}

declare global {
  // Convenience aggregate interface if needed elsewhere
  // Use local aliases to satisfy TS parser
  type _BaseCommands = import('@tiptap/core').Commands<any>;
  type _Chained = import('@tiptap/core').ChainedCommands;
  type _Single = import('@tiptap/core').SingleCommands;
  interface TiptapAllCommands extends _BaseCommands, _Chained, _Single {}
}
