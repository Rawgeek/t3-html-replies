import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { catalog, families } from './catalog.mjs';
import { renderExample } from './components.mjs';
import { loadAssets } from './assets.mjs';
import { exampleDocument } from './document.mjs';
import { renderReply } from './render-reply.mjs';

const [command='list',id,output]=process.argv.slice(2);
async function save(html) {
  const path=resolve(output);await mkdir(dirname(path),{recursive:true});
  await writeFile(path,html);console.log(path);
}
const item=()=>{const found=catalog.find(x=>x.id===id);if(!found)throw Error('Unknown example. Use list <type>.');return found;};
switch(command) {
  case 'list':
    console.log(id?catalog.filter(x=>x.family===id).map(x=>`${x.id} ${x.height}`).join('\n'):families.map(x=>x.id).join(' '));break;
  case 'show': {
    const x=item();console.log(JSON.stringify({id:x.id,height:x.height,use:x.useWhen,avoid:x.avoidWhen}));break;
  }
  case 'html': console.log(renderExample(item()));break;
  case 'render': {
    if(!output)throw Error('Use render <id> <output.html>');const x=item();
    await save(exampleDocument({...x,html:renderExample(x)},await loadAssets()));break;
  }
  case 'reply':
    if(!id||!output)throw Error('Use reply <data.json> <output.html>');await save(await renderReply(JSON.parse(await readFile(id,'utf8'))));break;
  default: throw Error('Use list, show, render, reply, or html.');
}
