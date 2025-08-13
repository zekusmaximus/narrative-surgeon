// Shim to ensure TypeScript sees all named exports from @tiptap/core
// Workaround for resolver failing to surface Editor/Extension/Node despite presence in dist index.d.ts
declare module '@tiptap/core' {
  export * from '@tiptap/core/dist/index.d.ts'
}
