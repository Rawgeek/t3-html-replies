import { readFile } from 'node:fs/promises';
import { icons } from './icons.mjs';
import { exampleDocument } from './document.mjs';
export async function loadAssets() {
  const [css,base]=await Promise.all([readFile(new URL('./library.css',import.meta.url),'utf8'),readFile(new URL('./runtime.js',import.meta.url),'utf8')]);
  const json=JSON.stringify(icons).replaceAll('<','\\u003c');
  return {css,runtime:'window.T3Icons='+json+';\n'+base+'\nT3UI.exampleDocument='+exampleDocument.toString()+';'};
}
