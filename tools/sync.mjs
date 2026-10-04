import { readFile, writeFile } from 'node:fs/promises';
import { CONFIG } from '../config.js';
import { whatsappLinks } from '../script.js';
const file = new URL('../index.html', import.meta.url);
let html = await readFile(file, 'utf8');
html = html.replace(/(id="cta" class="cta" href=")[^"]+/, `$1${whatsappLinks().web}`);
html = html.replace(/(<a id="cta"[^>]+><span>)[^<]+/, `$1${CONFIG.text.cta}`);
await writeFile(file, html);
console.log('Link HTML senza JavaScript sincronizzato da config.js.');
