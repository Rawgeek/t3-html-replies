import assert from 'node:assert/strict';
import { readFile,writeFile,mkdtemp,rm,cp } from 'node:fs/promises';
import { spawn,execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { library } from './library-path.mjs';
const {renderReply,assertRenderedReply}=await import(pathToFileURL(join(library,'render-reply.mjs')).href);
const {conciseText}=await import(pathToFileURL(join(library,'interactive.mjs')).href);

const load=async name=>JSON.parse(await readFile(join(library,`${name}-example.json`),'utf8'));
const progress=await load('reply'),data=await load('data'),interactive=await load('interactive');
const implicit=await renderReply(progress);
const explicit=await renderReply({...progress,replyType:'progress'});
assert(implicit.includes('class="bento"')&&explicit.includes('class="bento"'));
for(const value of ['unknown','',null,23])await assert.rejects(renderReply({...data,replyType:value}),/replyType must/);
await assert.rejects(renderReply({...data,kind:'question'}),/Legacy questions cannot/);
for(const [key,value] of [['state','complete'],['progress','100%'],['milestones',['A','B']]])await assert.rejects(renderReply({...data,[key]:value}),/unsupported fields/);
await assert.rejects(renderReply({...interactive,state:'working'}),/final outputs/);
await assert.rejects(renderReply({...interactive,sections:[{title:'Bad',html:'<script>alert(1)</script>'}]}),/visible local markup/);
await assert.rejects(renderReply({...interactive,css:'.x{display:none}'}),/cannot hide/);
await assert.rejects(renderReply({...interactive,script:'function {'}),/Unexpected token/);
const longHTML='<p>One two three four five six seven <b>eight nine ten eleven twelve thirteen fourteen fifteen.</b></p>';
await assert.rejects(renderReply({...interactive,sections:[{title:'Budget',html:longHTML+interactive.sections[0].html}]}),/15-word sentence/);
await assert.rejects(renderReply({...interactive,sections:[{title:'Control',html:'<input type="hidden" aria-label="Jobs">'}]}),/visible and usable/);
const inlineBox='<div>One two three four five six seven <div style="display:inline">eight nine ten eleven twelve thirteen fourteen fifteen.</div></div>';
await assert.rejects(renderReply({...interactive,sections:[{title:'Budget',html:inlineBox+interactive.sections[0].html}]}),/block layout/);
await assert.rejects(renderReply({...data,sections:[{type:'line',title:'Caption',labels:Array.from({length:8},(_,i)=>'Day '+i),values:Array(8).fill(1)}]}),/caption.*24-word sentence/);
for(const values of [[0,0],[-1,3],[999999999,-999999999]])assertRenderedReply(await renderReply({...data,sections:[{type:'line',title:'Trend',labels:['A','B'],values}]}));
for(const values of [[true,2],[NaN,2],[Infinity,2],['2',3]])await assert.rejects(renderReply({...data,sections:[{type:'line',title:'Trend',labels:['A','B'],values}]}),/finite numbers/);
await assert.rejects(renderReply({...data,sections:[{type:'line',title:'Trend',labels:['A','B'],values:[1,2,3]}]}),/equal lengths/);
await assert.rejects(renderReply({...data,sections:[{type:'text',title:'Note',description:'Only text.'}]}),/need a chart/);
await assert.rejects(renderReply({...data,sections:[...data.sections,...data.sections]}),/repeats a section/);
assert.doesNotThrow(()=>conciseText(Array.from({length:90},()=> 'A.').join(' ')));
assert.throws(()=>conciseText(Array.from({length:91},()=> 'A.').join(' ')),/90 words/);
assert.doesNotThrow(()=>conciseText('a'.repeat(1200)));
assert.throws(()=>conciseText('a'.repeat(1201)),/1200/);
assert.doesNotThrow(()=>conciseText(Array(12).fill('word').join(' ')));
assert.throws(()=>conciseText(Array(13).fill('word').join(' ')),/12 words/);
const actions=[{label:'Continue',send:'Continue.'},{label:'Open PR',href:'https://github.com/example/repo/pull/1',icon:'git-pull-request'}];
const actionPage=await renderReply({...data,actions});
assert.match(actionPage,/disabled aria-disabled="true" data-t3-send/);
assert.match(actionPage,/data-steer-icon/);assert.match(actionPage,/Steering unavailable/);
assert.match(actionPage,/<a class="btn" href="https:/);
assertRenderedReply(actionPage);
assert.throws(()=>assertRenderedReply(actionPage.replace('Build time fell','Tampered title')),/does not match/);
for(const sample of [data,interactive])assertRenderedReply(await renderReply(sample));
if(process.argv.includes('--schema-only')){console.log('Reply type schemas passed.');process.exit(0);}

const folder=await mkdtemp(join(tmpdir(),'t3-types-'));
const chrome=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port=10300+Math.floor(Math.random()*300);
const browser=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${join(folder,'profile')}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let launchError='';browser.on('error',error=>{launchError=error.message;});browser.stderr.on('data',chunk=>{launchError=(launchError+chunk).slice(-2000);});
async function connect(page,width) {
  const target=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json());
  const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;
  let loaded;const loadEvent=new Promise(resolve=>{loaded=resolve;});
  socket.addEventListener('message',({data})=>{const event=JSON.parse(data);if(event.method==='Page.loadEventFired')loaded();const p=pending.get(event.id);if(!p)return;pending.delete(event.id);event.error?p.reject(Error(event.error.message)):p.resolve(event.result);});
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(Error(method+' timed out'));},10000);pending.set(key,{resolve:value=>{clearTimeout(timer);resolve(value);},reject});socket.send(JSON.stringify({id:key,method,params,...sessionId?{sessionId}:{}}));});
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width,height:1400,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:page});
  await loadEvent;
  const evaluate=async(expression,context)=>{
    const reply=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,...context?{contextId:context.contextId}:{}},context?.sessionId);
    if(reply.exceptionDetails)throw Error(reply.exceptionDetails.text+' '+JSON.stringify(reply.exceptionDetails.exception));
    return reply.result.value;
  };
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  return {send,evaluate,close:async()=>{socket.close();await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);}};
}
async function childWorld(client,depth=1) {
  let frame=(await client.send('Page.getFrameTree')).frameTree;
  let sessionId;
  for(let i=0;i<depth;i++) {
    if(frame.childFrames?.length)frame=frame.childFrames[0];
    else {
      const targets=await client.send('Target.getTargets');
      const child=targets.targetInfos.find(target=>target.type==='iframe'&&(target.parentFrameId===frame.frame.id||target.parentId===frame.frame.id));
      assert(child,'Missing custom frame');
      sessionId=(await client.send('Target.attachToTarget',{targetId:child.targetId,flatten:true})).sessionId;
      frame=(await client.send('Page.getFrameTree',{},sessionId)).frameTree;
    }
  }
  return {contextId:(await client.send('Page.createIsolatedWorld',{frameId:frame.frame.id,worldName:'t3-audit'},sessionId)).executionContextId,sessionId};
}
async function file(name,html){const path=join(folder,name+'.html');await writeFile(path,html);return pathToFileURL(path).href;}
const audit=`(()=>{const root=document.querySelector('main');return {text:root?.innerText,overflow:document.documentElement.scrollWidth>innerWidth+2,clipped:[...document.querySelectorAll('.tile-body')].some(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2)};})()`;
try {
  let ready=false;for(let i=0;i<50&&!ready;i++){try{await fetch(`http://127.0.0.1:${port}/json/version`);ready=true;}catch{await new Promise(resolve=>setTimeout(resolve,200));}}
  assert(ready,'Chrome did not start: '+launchError);
  const report={...data,sections:[...data.sections,{type:'line',title:'Errors',labels:['Mon','Tue','Wed'],values:[2,0,1]},{type:'table',title:'Checks',columns:['Area','Result'],rows:[['API','Pass'],['UI','Pass']]},{type:'text',title:'Note',description:'All checks passed.'}]};
  for(const width of [1024,728,390]) {
    const client=await connect(await file('data',await renderReply(report)),width);
    const result=await client.evaluate(audit);assert(!result.overflow&&!result.clipped,JSON.stringify(result));await client.close();
    const compact={replyType:'data',title:'Read the final review and open the published release',actions:[{label:'Open release',href:'https://example.com/release'},{label:'Merged PR',href:'https://example.com/pr'}],sections:[{type:'facts',title:'Checks',items:[{label:'Types',value:'3'},{label:'Result',value:'Passed'}]},{type:'text',title:'Next',description:'Restart the provider session.'}]};
    const density=await connect(await file('compact',await renderReply(compact)),width);
    const heights=await density.evaluate("[...document.querySelectorAll('.report-grid>section')].map(section=>section.getBoundingClientRect().height)");
    assert(heights.every(height=>height>30&&height<140),'Sparse report cards must fit their content: '+heights);
    assert(await density.evaluate("[...document.querySelectorAll('.reply-head .btn')].every(button=>button.scrollWidth<=button.clientWidth+2&&button.scrollHeight<=button.clientHeight+2)"),'Header actions must fit without clipping');
    const denseLayout=await density.evaluate(audit);assert(!denseLayout.overflow&&!denseLayout.clipped,JSON.stringify(denseLayout));await density.close();
    const custom=await connect(await file('custom',await renderReply(interactive)),width);
    const context=await childWorld(custom);
    await custom.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',context);
    assert.match((await custom.evaluate(audit,context)).text,/92 seconds/);
    assert(await custom.evaluate("[...document.querySelectorAll('.interactive-section')].every(section=>section.getBoundingClientRect().height<160)",context),'Simple interactive cards must fit their controls');
    for(let jobs=1;jobs<=8;jobs++) {
      const text=await custom.evaluate(`(()=>{const input=document.querySelector('input');input.value=${jobs};input.dispatchEvent(new Event('input',{bubbles:true}));return document.querySelector('output').textContent})()`,context);
      assert.equal(text,`${jobs*92} seconds`);
    }
    const layout=await custom.evaluate(audit,context);assert(!layout.overflow&&!layout.text.includes('failed validation'),JSON.stringify(layout));
    assert.equal(await custom.evaluate("(()=>{try{return parent.document.body.innerText}catch(error){return error.name}})()",context),'SecurityError');
    assert.equal(await custom.evaluate("fetch('https://example.com').then(()=>false,()=>true)",context),true);
    await custom.evaluate("document.querySelector('input').focus()",context);
    await custom.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft'});
    await custom.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft'});
    assert.equal(await custom.evaluate("document.querySelector('output').textContent",context),'644 seconds');
    await custom.close();
  }
  for(const mutation of ["document.querySelector('output').hidden=true", "document.querySelector('input').hidden=true", "document.querySelector('input').style.opacity='0'", "document.querySelector('output').textContent=Array(13).fill('word').join(' ')", `document.querySelector('output').innerHTML=${JSON.stringify(longHTML)}`, `document.querySelector('output').innerHTML=${JSON.stringify(inlineBox)}`, "document.querySelector('.interactive-section').inert=true", "(()=>{const input=document.querySelector('input');const fieldset=document.createElement('fieldset');fieldset.disabled=true;input.before(fieldset);fieldset.append(input)})()", "document.querySelector('output').style.width='2000px'"]) {
    const client=await connect(await file('invalid-runtime',await renderReply(interactive)),390);
    const context=await childWorld(client);
    await client.evaluate(mutation,context);
    await client.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',context);
    assert.match(await client.evaluate('document.body.innerText',context),/Reply failed validation/);
    await client.close();
  }
  // Exercise the real app shell with a mock host. No chat message may leave any button.
  const app=await readFile(new URL('../assets/mcp-app.html',import.meta.url),'utf8');
  const question={kind:'question',title:'Pick one',context:'One choice steers.',question:'Choose a path.',options:[{label:'First',send:'First.'},{label:'Second',send:'Second.'}]};
  for(const carrier of ['metadata','legacy'])for(const sample of [{...progress,actions},{...data,actions},question,interactive]) {
    const page=await renderReply(sample);
    const payload=carrier==='metadata'?{structuredContent:{status:'rendered'},_meta:{html:page}}:{structuredContent:{html:page}};
    const host=`<!doctype html><html><body style="margin:0"><iframe id="app" style="width:100%;height:1200px;border:0" srcdoc="${app.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></iframe><script>window.calls=[];addEventListener('message',event=>{const m=event.data;if(!m?.method)return;calls.push(m);const frame=document.getElementById('app');if(m.method==='ui/initialize'){frame.contentWindow.postMessage({jsonrpc:'2.0',id:m.id,result:{hostContext:{theme:'dark'}}},'*');for(let i=0;i<2;i++)frame.contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:${JSON.stringify(payload).replace(/</g,'\\u003c')}},'*');}else if(m.id)frame.contentWindow.postMessage({jsonrpc:'2.0',id:m.id,result:{}},'*');});</script></body></html>`;
    const client=await connect(await file('host',host),728);
    const context=await childWorld(client);
    await client.evaluate('new Promise(resolve=>setTimeout(resolve,100))',context);
    if(sample.replyType==='interactive') {
      assert.equal(await client.evaluate("document.querySelectorAll('iframe[data-t3-interactive]').length",context),1,'Repeated delivery must mount exactly one interactive frame');
      const nested=await childWorld(client,2);
      assert.match(await client.evaluate("document.body.innerText",nested),/92 seconds/);
    }else {
      assert.equal(await client.evaluate("document.querySelectorAll('#reply > main').length",context),1,'Repeated delivery must mount exactly one reply');
      assert(await client.evaluate("[...document.querySelectorAll('[data-t3-send]')].every(button=>button.disabled&&button.querySelector('[data-steer-icon]'))",context));
      await client.evaluate("document.querySelectorAll('[data-t3-send]').forEach(button=>button.click());document.querySelector('a')?.click()",context);
      const calls=await client.evaluate('calls');assert(!calls.some(call=>call.method==='ui/message'));
      if(sample!==question)assert(calls.some(call=>call.method==='ui/open-link'));
    }
    await client.close();
  }
  if(!process.env.T3_SPLIT_PROBE) {
    const split=join(folder,'split-skill');
    await cp(new URL('./',import.meta.url),join(split,'scripts'),{recursive:true});
    await cp(new URL('../assets/',import.meta.url),join(split,'assets'),{recursive:true});
    const exec=promisify(execFile),env={...process.env,T3_UI_LIBRARY:library,T3_SPLIT_PROBE:'1'};
    await exec(process.execPath,[join(split,'scripts/selftest.mjs')],{env,timeout:30000});
    await exec(process.execPath,[join(split,'scripts/types-check.mjs'),'--schema-only'],{env,timeout:30000});
  }
  console.log('Reply types passed: schemas, budgets, canonical guard, 3 widths, 8 input states, keyboard, MCP mounting, steer-only failure, and HTTPS links.');
} finally {
  if(browser.exitCode===null&&browser.signalCode===null){const stopped=new Promise(resolve=>browser.once('exit',resolve));browser.kill();await stopped;}
  browser.stderr.destroy();
  await rm(folder,{recursive:true,force:true});
}
