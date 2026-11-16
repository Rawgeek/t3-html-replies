import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { escapeHTML as e } from './components.mjs';

// Also runs in the isolated custom document after every local interaction.
export function conciseText(text) {
  const clean=String(text).replace(/\s+/g,' ').trim();
  if(clean.length>1200)throw Error('Report exceeds 1200 visible characters.');
  if(clean.split(/\s+/u).filter(Boolean).length>90)throw Error('Report exceeds 90 words, the 30-second reading budget.');
  const longest=Math.max(...clean.split(/[.!?。！？]+(?:\s|$)/u).map(sentence=>sentence.trim().split(/\s+/u).filter(Boolean).length));
  if(longest>12)throw Error(`Text has a ${longest}-word sentence. Use at most 12 words per sentence or text box.`);
  if(/[\u2013\u2014\u2018\u2019\u201c\u201d]/u.test(clean))throw Error('Use straight quotes and plain punctuation.');
  if(/\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*[0-9])[0-9a-f]{7,}\b|[0-9a-f]{8}-[0-9a-f-]{20,}/i.test(clean))throw Error('Replace machine IDs with readable names.');
}

function interactiveRuntime() {
  let queued=false,failed=false;
  function audit() {
    queued=false;
    if(failed)return;
    try {
      const root=document.querySelector('main');
      const texts=[],boxes=new Map();
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()) {
        const node=walker.currentNode;
        const text=node.textContent.trim();
        if(!text)continue;
        const box=node.parentElement.closest('p,h1,h2,h3,h4,h5,h6,label,button,output,li,td,th,figcaption,text,div,section');
        const parts=boxes.get(box)||[];parts.push(text);boxes.set(box,parts);
        texts.push(text);
        for(let parent=node.parentElement;parent&&parent!==document.body;parent=parent.parentElement) {
          const style=getComputedStyle(parent);
          if(style.display==='none'||style.visibility!=='visible'||Number(style.opacity)===0||parent.hidden)throw Error('Keep all text visible.');
          if(style.textOverflow==='ellipsis'||style.webkitLineClamp!=='none')throw Error('Do not truncate text.');
          if(parent.clientWidth&&parent.scrollWidth>parent.clientWidth+2||parent.clientHeight&&parent.scrollHeight>parent.clientHeight+2)throw Error('Content must fit without internal scrolling.');
        }
      }
      for(const parts of boxes.values())conciseText(parts.join(' '));
      const text=texts.join(' ');
      if(text.length>1200||text.split(/\s+/u).length>90)throw Error('Keep the report within 90 words and 1200 characters.');
      if(root.querySelectorAll('section').length>8)throw Error('Use at most eight sections.');
      const controls=[...root.querySelectorAll('button,input')];
      for(const control of controls) {
        const rect=control.getBoundingClientRect();
        if(control.type==='hidden'||rect.width<12||rect.height<12)throw Error('Every control must be visible and usable.');
        for(let node=control;node&&node!==document.body;node=node.parentElement){
          const style=getComputedStyle(node);
          if(node.hidden||style.display==='none'||style.visibility!=='visible'||Number(style.opacity)===0)throw Error('Every control must be visible and usable.');
        }
        if(!control.labels?.length&&!control.getAttribute('aria-label')&&!control.textContent.trim())throw Error('Name every control.');
      }
      if(!controls.some(control=>!control.disabled))throw Error('Provide an enabled local control.');
      if(document.documentElement.scrollWidth>innerWidth+2)throw Error('The report must fit the viewport.');
      window.__t3Audit={ok:true,words:text.split(/\s+/u).length};
    } catch(error) {
      failed=true;
      window.__t3Audit={ok:false,error:error.message};
      const main=document.createElement('main');
      const title=document.createElement('h1');title.textContent='Reply failed validation';
      const note=document.createElement('p');note.textContent=error.message;
      main.append(title,note);document.body.replaceChildren(main);
    }
    const height=Math.ceil(document.body.getBoundingClientRect().height);
    parent.postMessage({type:'t3-interactive-size',height},'*');
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(audit);}}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true});
  new ResizeObserver(schedule).observe(document.body);
  addEventListener('input',schedule);addEventListener('click',schedule);addEventListener('resize',schedule);
  schedule();
}

const textFromHTML=html=>html.replace(/<[^>]*>/g,' ').replace(/&(?:#(x[0-9a-f]+|\d+)|([a-z]+));/gi,(_,code,name)=>{
  if(code){const n=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);return n>0&&n<=0x10ffff?String.fromCodePoint(n):' ';}
  return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[name]??' ';
}).replace(/\s+/g,' ').trim();

export function renderInteractive(data,css,embedData) {
  const keys=['replyType','state','title','summary','sections','css','script'];
  const extra=Object.keys(data).filter(key=>!keys.includes(key));
  if(extra.length)throw Error('Interactive reply has unsupported fields: '+extra.join(', ')+'.');
  if(data.state!=='complete')throw Error('Interactive replies are final outputs. Set state to complete.');
  const short=(value,name,max,optional=false)=>{
    if(optional&&value===undefined)return '';
    if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(name+' must be text up to '+max+' characters.');
    conciseText(value);return value.trim();
  };
  const title=short(data.title,'Title',64),summary=short(data.summary,'Summary',80,true);
  if(!Array.isArray(data.sections)||!data.sections.length||data.sections.length>8)throw Error('Interactive sections must contain 1 to 8 items.');
  const texts=[title,summary];
  const sections=data.sections.map((section,index)=>{
    if(!section||typeof section!=='object'||Array.isArray(section))throw Error('Interactive section must be an object.');
    if(Object.keys(section).some(key=>!['title','description','html'].includes(key)))throw Error('Interactive sections accept title, description, and html only.');
    const heading=short(section.title,'Section title',24),description=short(section.description,'Description',80,true);
    const html=section.html;
    if(typeof html!=='string'||!html.trim()||html.length>16000)throw Error('Section html must contain markup up to 16000 characters.');
    if(/<\s*\/?\s*(?:script|style|iframe|object|embed|link|meta|base|html|head|body|details|select|form|section)\b|\s(?:on\w+|hidden|srcdoc|href|src|formaction)\s*(?:=|>)/i.test(html))throw Error('Use visible local markup. Put CSS and JavaScript in css and script.');
    const text=textFromHTML(html);
    const boxes=html.replace(/<\/?(?:p|div|h[1-6]|label|button|output|li|td|th|figcaption|text)\b[^>]*>/gi,'\n').split('\n').map(textFromHTML);
    for(const part of [heading,description,...boxes])if(part)conciseText(part);
    if(/<input\b[^>]*\btype\s*=\s*["']?hidden\b/i.test(html))throw Error('Every control must be visible and usable.');
    texts.push(heading,description,text);
    return `<section class="interactive-section"><h2>${e(heading)}</h2>${description?`<p>${e(description)}</p>`:''}${html}</section>`;
  }).join('');
  const visible=texts.filter(Boolean).join(' ');
  if(visible.length>1200||visible.split(/\s+/u).length>90)throw Error('Keep the report within 90 words and 1200 characters.');
  const customCSS=data.css??'',script=data.script??'';
  if(typeof customCSS!=='string'||customCSS.length>16000||/<\//.test(customCSS))throw Error('css must be CSS text up to 16000 characters without HTML.');
  if(/display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|overflow(?:-[xy])?\s*:\s*(?:hidden|clip|auto|scroll)|text-overflow|line-clamp|\b\d+(?:d|s|l)?vh\b/i.test(customCSS))throw Error('CSS cannot hide, truncate, scroll, or use viewport heights.');
  if(typeof script!=='string'||script.length>32000||/<\/script/i.test(script))throw Error('script must be JavaScript up to 32000 characters without script tags.');
  if(!script.trim())throw Error('Interactive replies need a local script that operates a visible control.');
  if(!/<(?:button|input)\b/i.test(sections))throw Error('Interactive replies need a visible button or input.');
  new vm.Script(script);
  const runtime=`${conciseText.toString()}\n(${interactiveRuntime.toString()})();`;
  const hashes=[runtime,script].map(code=>`'sha256-${createHash('sha256').update(code).digest('base64')}'`).join(' ');
  const policy=`default-src 'none'; script-src ${hashes}; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'`;
  const inner=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><style>${css}\nbody{margin:0;background:transparent}.interactive-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.interactive-section{min-height:184px;display:grid;align-content:start;gap:8px;padding:16px;border:1px solid var(--ui-border);border-radius:var(--ui-radius);background:var(--card);overflow-wrap:anywhere}.interactive-section p{color:var(--ui-muted)}@media(max-width:620px){.interactive-grid{grid-template-columns:1fr}}\n${customCSS}</style></head><body><main class="t3lib reply"><h1>${e(title)}</h1>${summary?`<p>${e(summary)}</p>`:''}<div class="interactive-grid">${sections}</div></main><script>${runtime}</script><script>${script}</script></body></html>`;
  const resize=`addEventListener('message',event=>{const frame=document.querySelector('[data-t3-interactive]');if(event.source!==frame.contentWindow||event.data?.type!=='t3-interactive-size')return;const h=event.data.height;if(Number.isFinite(h)&&h>=80&&h<=20000)frame.style.height=h+'px';});`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:transparent}iframe{display:block;width:100%;height:400px;border:0}</style></head><body><iframe data-t3-interactive sandbox="allow-scripts" title="${e(title)}" srcdoc="${e(inner)}"></iframe><script>${resize}</script>${embedData(data)}</body></html>`;
}
