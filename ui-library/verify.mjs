import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { catalog, families } from './catalog.mjs';
import { renderExample, statusFooter, icon } from './components.mjs';
import { heights } from './heights.mjs';
import { renderReply } from './render-reply.mjs';
const root=dirname(fileURLToPath(import.meta.url));
assert.equal(catalog.length,60);assert.equal(families.length,20);assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);
assert.deepEqual(Object.keys(heights),['slim','small','medium','tall']);
for(const preset of Object.values(heights))assert.equal(preset.pixels,(88+8)*preset.rows-8);
const expected=['benchmarks','graphs','tables','task-progress','reports','pr-actions','slack','github-pr','progress','buttons','timelines','layouts','metrics','callouts','checklists','states','statuses'];
for(const family of expected)assert.deepEqual(catalog.filter(x=>x.family===family).map(x=>x.size),['small','medium','large'],family);
assert(catalog.some(x=>x.id==='summary-basic'));
assert.deepEqual(catalog.filter(x=>x.family==='status-panels').map(x=>x.data.state),['complete','working','waiting','blocked']);
const status=statusFooter({progress:'62% estimate',next:'Fix check',eta:'15-25 min estimate',wake:'Not armed'});
assert.equal((status.match(/class="status-tile"/g)||[]).length,4);assert(status.includes('aria-valuenow="62"'));assert(status.includes('15-25m'));
assert(status.includes('data-field="progress"')&&/data-field="progress"[\s\S]*?class="status-meter"/.test(status),'Progress bar sits inside the progress tile');
const doneStatus=statusFooter({progress:'100%',next:'None',eta:'Complete',wake:'Not needed',state:'complete'});
assert(doneStatus.includes('>None<')&&doneStatus.includes('aria-valuenow="100"'),'Completed status keeps Next and Wake explicit');
const opaque='deadbeef';
assert(!/<details|<summary/i.test(status),'Status strip has no disclosure');
assert(icon('download').includes('<svg'));assert(icon('send').includes('aria-hidden="true"'));
for(const item of catalog){
  assert(item.sample===true);assert(item.useWhen.length>20&&item.avoidWhen.length>20,item.id);
  assert(heights[item.height]&&item.heightUseWhen&&item.heightAvoidWhen,item.id+': fixed height guidance');
  const html=renderExample(item);assert(html.length>30);assert(!/\{\{[A-Z_]+\}\}/.test(html));assert(!/<details|<summary/i.test(html),item.id+': expandable content');
  await access(join(root,`snippets/${item.id}.html`));
  await access(join(root,'logic',item.id+'.json'));
  if(item.family==='graphs'){assert(item.data.series.every(s=>s.values.length===12&&s.values.every(Number.isFinite)));}
  if(item.family==='benchmarks'){assert(item.data.n>0);assert(item.data.rows.every(r=>Number.isFinite(r[1])&&r[1]>=0));assert(item.data.current<item.data.baseline);}
  if(item.family==='buttons'){assert.equal((html.match(/<button /g)||[]).length,item.data.count);}
  if(item.family==='slack'||item.family==='github-pr')assert(item.data.text.length>20);
}
for(const filename of ['runtime.js','gallery.js'])new vm.Script(await readFile(join(root,filename),'utf8'),{filename});
const css=await readFile(join(root,'library.css'),'utf8');assert(!/display\s*:\s*(?:inline-)?flex\b/.test(css),'All layout primitives must use grid');
const index=await readFile(join(root,'index.html'),'utf8');assert(Buffer.byteLength(index)<1000000);assert(!/<script[^>]+src=|\bfetch\s*\(|WebSocket\s*\(|https?:\/\//i.test(index),'Gallery must be self-contained');
assert(!/<details|<summary/i.test(index.replace(/<script\b[\s\S]*?<\/script>/g,'')),'Gallery has no disclosure');
const elementIndex=await readFile(join(root,'ELEMENT_INDEX.md'),'utf8');
assert((elementIndex.match(/\]\(snippets\/[^)]+\.html\)/g)||[]).length===catalog.length,'Element index covers every sample');
assert((elementIndex.match(/\]\(logic\/[^)]+\.json\)/g)||[]).length===catalog.length,'Element index covers every logic file');
for(const item of catalog)assert(elementIndex.includes('](snippets/'+item.id+'.html)'),item.id+' is indexed');
for(const item of catalog)assert(elementIndex.includes('](logic/'+item.id+'.json)'),item.id+' logic is indexed');
let scripts=0;for(const match of index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){scripts++;if(!/application\/json/.test(match[1]))new vm.Script(match[2]);}assert.equal(scripts,2,'Generated script boundaries');
assert(index.includes('data-catalog-grid')&&index.includes('"id":"benchmarks-small"'));assert(!/\{\{[A-Z_]+\}\}/.test(index));
const history=[{label:'Scope read',note:'Four blocks chosen',time:'09:10',state:'done'},{label:'Blocks built',note:'Renderer patched',time:'09:24',state:'done'}];
const swimlane={title:'Stages',type:'swimlane',items:[...history,{label:'Checks running',note:'Focused suite',time:'Now',state:'waiting',progress:'62%'},{label:'Review',note:'After the checks',time:'Next',state:'pending'},{label:'Share post',note:'Then the push',time:'Later',state:'pending'}]};
const completeSwimlane={title:'Stages',type:'swimlane',items:[...history,{label:'Checks run',note:'All pass',time:'09:30',state:'done'},{label:'Review',note:'Approved',time:'09:45',state:'done'},{label:'Share post',note:'Queued',time:'Later',state:'pending'},{label:'Verify post',note:'After upload',time:'Last',state:'pending'}]};
const changes={title:'Changes',type:'changes',done:['Renderer patched','Docs updated'],todo:['Sample reply refreshed']};
const milestones=['Scope','Build','Verify','Share'];
const base={title:'Released',state:'complete',results:[{label:'Errors',value:0},{label:'Change',value:'<script>'}],milestones,sections:[completeSwimlane,changes]};
const withBlocks=(...extra)=>({sections:[completeSwimlane,changes,...extra]});
await assert.rejects(renderReply({title:'Pending',state:'waiting',progress:'100%',milestones,sections:[swimlane,changes]}),/Pending work cannot be shown at 100%/);
await assert.rejects(renderReply({title:'Complete',state:'complete'}),/Complete replies require result facts/);
await assert.rejects(renderReply({title:'Long',state:'working',summary:'x'.repeat(81)}),/Summary exceeds 80 characters/);
await assert.rejects(renderReply({...base,details:'Verified flow.'}),/unsupported fields: details/);
await assert.rejects(renderReply({...base,next:'b611fca'}),/hash or machine ID/);
await assert.rejects(renderReply({...base,title:'x'.repeat(65)}),/Title exceeds 64 characters/);
await assert.rejects(renderReply({...base,results:[{label:'x'.repeat(15),value:'x'}]}),/label exceeds 14 characters/);
await assert.rejects(renderReply({...base,results:Array.from({length:5},()=>({label:'A',value:'1'}))}),/Results must contain 1 to 4 items/);
await assert.rejects(renderReply({...base,sections:[{title:'Long',type:'list',size:'small',items:['One','Two']}]}),/unsupported fields: size/);
await assert.rejects(renderReply({...base,sections:[{title:'Wide',type:'list',span:2,items:['One','Two']}]}),/unsupported fields: span/);
await assert.rejects(renderReply({...base,sections:[{title:'Unknown',type:'text'}]}),/type must be/);
await assert.rejects(renderReply({...base,sections:[{title:'List',type:'list',items:['One']}]}),/must contain 2 to 3 items/);
await assert.rejects(renderReply({...base,sections:[{title:'List',type:'list',items:['One','Two','Three','Four']}]}),/must contain 2 to 3 items/);
await assert.rejects(renderReply({...base,sections:[{title:'List',type:'list',items:['x'.repeat(49),'Two']}]}),/item 1 exceeds 48 characters/);
await assert.rejects(renderReply({...base,sections:[{title:'Facts',type:'facts',items:[{label:'One',value:'1'}]}]}),/must contain 2 to 4 items/);
await assert.rejects(renderReply({...base,sections:[{title:'Table',type:'table',columns:['x'.repeat(15),'State'],rows:[['A','B'],['C','D']]}]}),/column 1 exceeds 14 characters/);
await assert.rejects(renderReply({...base,sections:[{title:'Table',type:'table',columns:['A','B'],rows:[['x'.repeat(19),'B'],['C','D']]}]}),/cell 1 exceeds 18 characters/);
await assert.rejects(renderReply({...base,sections:[{title:'Table',type:'table',columns:['A','B','C'],rows:[['1','2','3'],['4','5','6']]}]}),/must contain 2 to 2 items/);
await assert.rejects(renderReply({...base,sections:[{title:'Table',type:'table',columns:['A','B'],rows:[['A','B'],['C','D'],['E','F'],['G','H']]}]}),/must contain 2 to 3 items/);
const actionTable=await renderReply({...base,...withBlocks({title:'Queue',type:'table',columns:['Item','Next'],rows:[['Mail',{label:'Reply',icon:'message-square',send:'Reply to this mail.'}],['Alert',{label:'Check',icon:'clock',send:'Check this alert.'}]]})});
assert(actionTable.includes('data-t3-send="Reply to this mail."')&&actionTable.includes('class="btn compact"'),'Table cells render send actions');
const detailTable=await renderReply({...base,columns:2,...withBlocks({title:'Queue',type:'table',columns:['Item','Next'],rows:[{cells:['Mail',{label:'Reply',send:'Reply to this mail.'}],detail:'Hover detail'},{cells:['Alert','Check']}]})});
assert(detailTable.includes('data-columns="2"')&&detailTable.includes('title="Hover detail"'),'Two columns and row details render');
await assert.rejects(renderReply({...base,columns:4}),/Columns must be 2 or 3/);
await assert.rejects(renderReply({...base,sections:[{title:'Queue',type:'table',columns:['A','B'],rows:[{cells:['A','B'],detail:'x'.repeat(261)},{cells:['C','D']}]}]}),/detail exceeds 260 characters/);
await assert.rejects(renderReply({...base,sections:[{title:'Queue',type:'table',columns:['Item','Next'],rows:[['Mail',{label:'Reply',send:'x',href:'https://example.com'}],['Alert','Check']]}]}),/unsupported fields: href/);
await assert.rejects(renderReply({...base,sections:[{title:'Queue',type:'table',columns:['Item','Next'],rows:[['Mail',{label:'x'.repeat(15),send:'x'}],['Alert','Check']]}]}),/label exceeds 14 characters/);
await assert.rejects(renderReply({...base,...withBlocks({title:'Steps',type:'swimlane',items:[{label:'Built',note:'x'.repeat(33),state:'done'},{label:'Two',note:'Short',state:'done'},{label:'Three',note:'Short',state:'done'},{label:'Four',note:'Short',state:'pending'},{label:'Five',note:'Short',state:'pending'}]})}),/note exceeds 32 characters/);
await assert.rejects(renderReply({...base,...withBlocks({title:'Steps',type:'swimlane',items:[{label:'Built',state:'done'},{label:'Two',state:'done'},{label:'Three',state:'pending'}]})}),/must contain 5 to 6 items/);
await assert.rejects(renderReply({...base,sections:[changes]}),/exactly one swimlane/);
await assert.rejects(renderReply({...base,sections:[completeSwimlane]}),/exactly one changes block/);
await assert.rejects(renderReply({...base,sections:[swimlane,changes]}),/complete reply cannot keep a waiting step/);
await assert.rejects(renderReply({...base,next:'1deadbe'}),/hash or machine ID/);
await assert.rejects(renderReply({...base,sections:[{title:'Bars',type:'bars',items:[{label:'x'.repeat(19),value:1},{label:'After',value:2}]}]}),/label exceeds 18 characters/);
await assert.rejects(renderReply({...base,sections:Array.from({length:9},(_,index)=>({title:'Item '+index,type:'list',items:['One','Two']}))}),/Sections must contain 1 to 8 items/);
await assert.rejects(renderReply({...base,summary:'x'.repeat(80),...withBlocks(...Array.from({length:6},(_,index)=>({title:'Facts '+index,type:'facts',items:Array.from({length:4},()=>({label:'L'.repeat(14),value:'V'.repeat(14),note:'N'.repeat(24)}))})))}),/visible characters/);
const actionReply=await renderReply({...base,actions:[{label:'Mark read',icon:'check',send:'Mark these as read.'}]});
assert(actionReply.includes('data-t3-send="Mark these as read."'),'MCP app send action renders as a button');
await assert.rejects(renderReply({...base,actions:[{label:'Both',href:'https://example.com',send:'No'}]}),/exactly one of href or send/);
await assert.rejects(renderReply({...base,actions:[{label:'Neither'}]}),/exactly one of href or send/);
const reply=await renderReply({...base,sections:[
  completeSwimlane,
  changes,
  {title:'Facts',type:'facts',items:[{label:'Limit',value:'5 fields',note:'All applied'},{label:'Blocks',value:'1 height'}]},
  {title:'List',type:'list',items:['One','Two']},
  {title:'Table',type:'table',columns:['Gate','State'],rows:[['Tests','Pass'],['Review','Pass']]},
  {title:'Bars',type:'bars',items:[{label:'Before',value:148},{label:'After',value:92}]},
  {title:'Compare',type:'compare',items:[{label:'Build time',before:'148 s',after:'92 s',delta:'38% less'}]},
  {title:'Cards',type:'cards',items:[{label:'Build',state:'done',note:'Checks pass'},{label:'Review',state:'pending',note:'Owner next'}]}
]});
assert(reply.includes('aria-valuenow="100"')&&reply.includes('&lt;script&gt;'));
assert(reply.includes('class="compare-track"')&&reply.includes('--after:62.2%'),'Compare bars scale to the larger value');
assert(reply.includes('reply-card')&&reply.includes('>Checked<'),'Cards render a readable status pill');
assert((reply.match(/class="status-gates"/g)||[]).length===1,'Progress tile carries milestone gates');
const sectionHeights=[...reply.matchAll(/class="component-tile reply-section-tile" data-height="([a-z]+)"/g)].map(match=>match[1]);
assert.equal(sectionHeights.length,8,'Structured blocks render');
assert.deepEqual(sectionHeights,['tall',...Array(7).fill('small')],'The swimlane is taller and every other block shares one height');
assert(!reply.includes('data-span='),'Sections use one grid column');
assert(css.includes(':last-child:nth-child(3n+1)')&&css.includes(':last-child:nth-child(3n+2)')&&css.includes(':last-child:nth-child(odd)'),'The last row fills automatically');
assert(!reply.includes('<details>')&&!reply.includes('<summary')&&!reply.includes('wake-dot')&&!reply.includes('class="status-details"'));
console.log(JSON.stringify({passed:true,examples:catalog.length,families:families.length,guidance:catalog.length*2,standaloneSnippets:catalog.length,gridOnly:true,offline:true,scriptSyntax:true}));
