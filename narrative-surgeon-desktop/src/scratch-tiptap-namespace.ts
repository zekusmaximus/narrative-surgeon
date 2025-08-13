// Namespace import test
import * as Tiptap from '@tiptap/core'

// Accessing expected classes/types
const editorCtor = (Tiptap as any).Editor
const extensionCtor = (Tiptap as any).Extension
const nodeCtor = (Tiptap as any).Node

console.log('Namespace keys:', Object.keys(Tiptap).slice(0, 20))
console.log('Has Editor?', typeof editorCtor)
