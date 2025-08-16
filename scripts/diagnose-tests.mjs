import { createRequire } from 'module';
const req = createRequire(import.meta.url);

const deps = [
  'react', 
  'next', 
  '@tauri-apps/plugin-sql',
  '@tiptap/core',
  '@tiptap/react'
];

for (const p of deps) {
  try { 
    const resolved = req.resolve(p);
    console.log('✅', p, '->', resolved); 
  } catch { 
    console.log('❌', p, '-> NOT FOUND'); 
  }
}