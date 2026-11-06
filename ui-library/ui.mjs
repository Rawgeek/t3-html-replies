import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { catalog, families } from './catalog.mjs';
import { renderExample } from './components.mjs';
import { loadAssets } from './assets.mjs';
import { exampleDocument } from './document.mjs';
import { renderReply, assertRenderedReply } from './render-reply.mjs';

const [command='list',id,output]=process.argv.slice(2);
async function save(html) {
  const path=resolve(output);await mkdir(dirname(path),{recursive:true});
  await writeFile(path,html);console.log(path);
}
const item=()=>{const found=catalog.find(x=>x.id===id);if(!found)throw Error('Unknown example. Use list <type>.');return found;};
const starter={
  title:'Task title',state:'waiting',summary:'One sentence on the outcome.',
  progress:'40% estimate',eta:'Unknown',wake:'Not armed',
  results:[{label:'Scope',value:'Ready',note:'Checked'},{label:'Checks',value:'12',note:'All pass'},{label:'Review',value:'Next',note:'Pending'}],
  milestones:['Scope','Build','Review','Ship'],
  sections:[
    {title:'Stages',type:'swimlane',items:[
      {label:'Step done',note:'Short note',time:'09:10',state:'done'},
      {label:'Step done',note:'Short note',time:'09:24',state:'done'},
      {label:'Current step',note:'What is running',time:'09:48',state:'waiting',progress:'40%'},
      {label:'Next step',note:'What follows',time:'10:10',state:'pending'},
      {label:'Later step',note:'What closes it',time:'10:30',state:'pending'}]},
    {title:'Changes',type:'changes',done:[{title:'What shipped',description:'Focused checks passed'}],todo:[{title:'What is left',description:'Owned by next step'}]},
    {title:'Proof',type:'facts',items:[{label:'Metric',value:'1',note:'Compared with'},{label:'Metric',value:'2',note:'Compared with'}]},
    {title:'Work',type:'cards',items:[{label:'Area',state:'done',note:'Short note'},{label:'Area',state:'pending',note:'Short note'}]}
  ]
};
try {
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
  case 'check':
    if(!id)throw Error('Use check <data.json>');await renderReply(JSON.parse(await readFile(id,'utf8')));console.log('Valid reply.');break;
  case 'guard':
    if(!id)throw Error('Use guard <reply.html>');assertRenderedReply(await readFile(id,'utf8'));console.log('Valid reply page.');break;
  case 'new': {
    if(!id)throw Error('Use new <data.json>');const path=resolve(id);await mkdir(dirname(path),{recursive:true});
    await writeFile(path,JSON.stringify(starter,null,2)+'\n');console.log(path);break;
  }
  default: throw Error('Use new, check, reply, guard, list, show, render, or html.');
}
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
