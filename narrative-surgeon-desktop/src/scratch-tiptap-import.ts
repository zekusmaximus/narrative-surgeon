// Minimal import test for @tiptap/core exports
import { Editor, Extension, Node } from '@tiptap/core'

// Use the imported symbols in a type context and minimal runtime usage
type _Check = [Editor, Extension<any, any>, Node<any, any>]

console.log('Loaded tiptap core symbols (type check only)')
