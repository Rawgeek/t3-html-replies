import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { icon, pill, statusFooter, resultGrid, metric, escapeHTML as e } from './components.mjs';

const LIMITS=Object.freeze({
  title:64,summary:80,results:4,resultLabel:14,resultValue:14,resultNote:24,
  sections:8,sectionTitle:24,
  factsItems:4,listItems:3,listItem:48,
  tableColumns:2,tableRows:3,tableLabel:14,tableCell:18,
  timelineItems:3,timelineLabel:30,timelineNote:32,timelineTime:8,
  barsItems:3,barLabel:18,barNote:22,
  progress:12,next:18,eta:16,wake:20,actions:3,actionLabel:14,actionSend:400,
  sectionText:{facts:240,list:175,table:240,timeline:240,bars:170},
  visibleText:1200
});
const STATES=new Set(['complete','working','waiting','blocked']);
const SECTION_TYPES=new Set(['facts','list','table','timeline','bars']);
// Every supporting block uses one shared height, so rows always align.
const SECTION_HEIGHT='small';
const TOP_KEYS=['title','state','summary','results','sections','progress','next','eta','wake','actions'];
const OPAQUE=/\b[0-9a-f]{8,}\b|[0-9a-f]{8}-[0-9a-f-]{20,}/i;

const fail=message=>{throw Error(message);};
const present=value=>value!==undefined&&value!==null&&String(value).trim()!=='';
const assertKeys=(value,allowed,field)=>{
  if(!value||typeof value!=='object'||Array.isArray(value))fail(`${field} must be an object.`);
  const extra=Object.keys(value).filter(key=>!allowed.includes(key));
  if(extra.length)fail(`${field} has unsupported fields: ${extra.join(', ')}.`);
};
const field=(value,name,max,{optional=false}={})=>{
  if(!present(value)){
    if(optional)return '';
    fail(`${name} is required.`);
  }
  if(typeof value==='object')fail(`${name} must be text.`);
  const text=String(value).trim();
  if(text.length>max)fail(`${name} exceeds ${max} characters. Split it into another block.`);
  if(OPAQUE.test(text))fail(`${name} contains an opaque machine value. Keep it internal.`);
  return text;
};
const array=(value,name,min,max)=>{
  if(!Array.isArray(value)||value.length<min||value.length>max)fail(`${name} must contain ${min} to ${max} items.`);
  return value;
};
const fact=(value,name)=>{
  assertKeys(value,['label','value','note'],name);
  return {
    label:field(value.label,`${name} label`,LIMITS.resultLabel),
    value:field(value.value,`${name} value`,LIMITS.resultValue),
    note:field(value.note,`${name} note`,LIMITS.resultNote,{optional:true})
  };
};
const facts=(value,name,min=1)=>array(value,name,min,LIMITS.results).map((row,index)=>fact(row,`${name}[${index}]`));
const visibleChars=value=>{
  if(typeof value==='string'||typeof value==='number')return String(value).length;
  if(Array.isArray(value))return value.reduce((sum,item)=>sum+visibleChars(item),0);
  if(value&&typeof value==='object')return Object.entries(value)
    .filter(([key])=>!['href','icon','type','height','state','primary'].includes(key))
    .reduce((sum,[,item])=>sum+visibleChars(item),0);
  return 0;
};

function validateStatus(data,done){
  const progress=field(data.progress??(done?'100%':'Unknown'),'Progress',LIMITS.progress);
  const next=field(data.next??(done?'None':'Unknown'),'Next',LIMITS.next);
  const eta=field(data.eta??(done?'Complete':'Unknown'),'ETA',LIMITS.eta);
  const wake=field(data.wake??(done?'Not needed':'Not armed'),'Wake',LIMITS.wake);
  const percent=progress.match(/(\d+(?:\.\d+)?)\s*%/);
  const value=percent?Number(percent[1]):null;
  if(done&&value!==100)fail('Complete replies require 100%.');
  if(!done&&value===100)fail('Pending work cannot be shown at 100%.');
  return {progress,next,eta,wake};
}

function validateActions(value){
  if(value===undefined)return [];
  const rows=array(value,'Actions',1,LIMITS.actions);
  return rows.map((action,index)=>{
    const name=`Actions[${index}]`;
    assertKeys(action,['label','href','send','icon','primary'],name);
    const label=field(action.label,`${name} label`,LIMITS.actionLabel);
    const hasHref=present(action.href),hasSend=present(action.send);
    if(hasHref===hasSend)fail(`${name} requires exactly one of href or send.`);
    if(hasHref&&(typeof action.href!=='string'||!/^https:\/\//.test(action.href)||action.href.length>500))
      fail(`${name}.href must be an HTTPS link up to 500 characters.`);
    const send=hasSend?field(action.send,`${name} send`,LIMITS.actionSend):'';
    const iconName=field(action.icon??'arrow-right',`${name} icon`,32);
    if(!/^[a-z0-9-]+$/.test(iconName))fail(`${name} icon must use a lowercase Lucide name.`);
    return {
      label,
      ...(hasHref?{href:action.href}:{send}),
      icon:iconName,
      primary:Boolean(action.primary)
    };
  });
}

function validateSection(section,index){
  const name=`Sections[${index}]`;
  if(!section||typeof section!=='object'||Array.isArray(section))fail(`${name} must be an object.`);
  const type=section.type;
  if(!SECTION_TYPES.has(type))fail(`${name} type must be facts, list, table, timeline, or bars.`);
  const title=field(section.title,`${name} title`,LIMITS.sectionTitle);
  let result;
  if(type==='facts'){
    assertKeys(section,['title','type','items'],name);
    result={type,title,items:facts(section.items,`${name} items`,2)};
  }else if(type==='list'){
    assertKeys(section,['title','type','items'],name);
    const items=array(section.items,`${name} items`,2,LIMITS.listItems)
      .map((item,itemIndex)=>field(item,`${name} item ${itemIndex+1}`,LIMITS.listItem));
    result={type,title,items};
  }else if(type==='table'){
    assertKeys(section,['title','type','columns','rows'],name);
    const columns=array(section.columns,`${name} columns`,2,LIMITS.tableColumns)
      .map((column,columnIndex)=>field(column,`${name} column ${columnIndex+1}`,LIMITS.tableLabel));
    const rows=array(section.rows,`${name} rows`,2,LIMITS.tableRows).map((row,rowIndex)=>{
      if(!Array.isArray(row)||row.length!==columns.length)fail(`${name} row ${rowIndex+1} must match the column count.`);
      return row.map((cell,columnIndex)=>field(cell,`${name} row ${rowIndex+1} cell ${columnIndex+1}`,LIMITS.tableCell));
    });
    result={type,title,columns,rows};
  }else if(type==='timeline'){
    assertKeys(section,['title','type','items'],name);
    const items=array(section.items,`${name} items`,2,LIMITS.timelineItems).map((item,itemIndex)=>{
      const itemName=`${name} item ${itemIndex+1}`;
      assertKeys(item,['label','note','time','state'],itemName);
      const state=item.state??'pending';
      if(!['done','waiting','pending'].includes(state))fail(`${itemName} state must be done, waiting, or pending.`);
      return {
        label:field(item.label,`${itemName} label`,LIMITS.timelineLabel),
        note:field(item.note,`${itemName} note`,LIMITS.timelineNote,{optional:true}),
        time:field(item.time,`${itemName} time`,LIMITS.timelineTime,{optional:true}),
        state
      };
    });
    result={type,title,items};
  }else{
    assertKeys(section,['title','type','items'],name);
    const items=array(section.items,`${name} items`,2,LIMITS.barsItems).map((item,itemIndex)=>{
      const itemName=`${name} item ${itemIndex+1}`;
      assertKeys(item,['label','value','note'],itemName);
      const number=Number(item.value);
      if(!Number.isFinite(number)||number<0||number>999999999)fail(`${itemName} value must be a non-negative number.`);
      return {
        label:field(item.label,`${itemName} label`,LIMITS.barLabel),
        note:field(item.note,`${itemName} note`,LIMITS.barNote,{optional:true}),
        value:number,
        display:field(item.value,`${itemName} value`,12)
      };
    });
    result={type,title,items};
  }
  const visible=visibleChars(result);
  if(visible>LIMITS.sectionText[type])fail(`${name} has ${visible} visible characters; ${type} blocks allow ${LIMITS.sectionText[type]}. Split it into another block.`);
  return {...result,height:SECTION_HEIGHT};
}

function renderSection(section){
  let body='';
  if(section.type==='facts'){
    body=`<div class="metric-grid">${section.items.map(item=>metric(item.value,item.label,item.note)).join('')}</div>`;
  }else if(section.type==='list'){
    body=`<ul class="bullets">${section.items.map(item=>`<li><span>${e(item)}</span></li>`).join('')}</ul>`;
  }else if(section.type==='table'){
    body=`<div class="table-wrap"><table><thead><tr>${section.columns.map(column=>`<th scope="col">${e(column)}</th>`).join('')}</tr></thead><tbody>${section.rows.map(row=>`<tr>${row.map(cell=>`<td${/^(?:[\d.,]+%|[\d.,]+ (?:s|ms|GB|MB))$/.test(cell)?' class="numeric"':''}>${e(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }else if(section.type==='timeline'){
    body=`<ol class="timeline">${section.items.map(item=>`<li><span class="dot ${item.state}" aria-hidden="true"></span><div>${item.note?`<p>${e(item.label)}</p><p class="muted small">${e(item.note)}</p>`:`<p>${e(item.label)}</p>`}</div>${item.time?`<time>${e(item.time)}</time>`:''}</li>`).join('')}</ol>`;
  }else{
    const max=Math.max(...section.items.map(item=>item.value),1);
    body=`<div class="reply-bars">${section.items.map(item=>`<div class="reply-bar"><div class="reply-bar-head"><span>${e(item.label)}</span><strong>${e(item.display)}</strong></div><div class="reply-bar-track" aria-hidden="true"><span style="--value:${item.value/max*100}%"></span></div>${item.note?`<p class="metric-note">${e(item.note)}</p>`:''}</div>`).join('')}</div>`;
  }
  return `<section class="component-tile reply-section-tile" data-height="${section.height}" data-section-type="${section.type}"><div class="demo tile-body"><h2>${e(section.title)}</h2><div class="reply-body">${body}</div></div></section>`;
}

export async function renderReply(data){
  const css=await readFile(new URL('./library.css',import.meta.url),'utf8');
  if(!data||typeof data!=='object'||Array.isArray(data))fail('Reply data must be an object.');
  assertKeys(data,TOP_KEYS,'Reply');
  const state=data.state;
  if(!STATES.has(state))fail('State must be complete, working, waiting, or blocked.');
  const done=state==='complete';
  const title=field(data.title,'Title',LIMITS.title);
  const summary=field(data.summary,'Summary',LIMITS.summary,{optional:true});
  const results=present(data.results)?facts(data.results,'Results',1):[];
  if(done&&!results.length)fail('Complete replies require result facts.');
  const sections=present(data.sections)?array(data.sections,'Sections',1,LIMITS.sections).map(validateSection):[];
  const status=validateStatus(data,done);
  const actions=validateActions(data.actions);
  const visible=visibleChars({title,summary,results,sections,status,actions:actions.map(({label})=>({label}))});
  if(visible>LIMITS.visibleText)fail(`Reply exceeds ${LIMITS.visibleText} visible characters. Move long material to a linked artifact.`);
  const label={complete:'Done',working:'Working',waiting:'Waiting',blocked:'Blocked'}[state];
  const tone={complete:'ok',working:'active',waiting:'waiting',blocked:'error'}[state];
  const actionsHtml=actions.map(action=>{
    const className=`btn${action.primary?' primary':''}`;
    return action.send
      ?`<button class="${className}" type="button" data-t3-send="${e(action.send)}">${icon(action.icon)}<span>${e(action.label)}</span></button>`
      :`<a class="${className}" href="${e(action.href)}">${icon(action.icon)}<span>${e(action.label)}</span></a>`;
  }).join('');
  const sectionsHtml=sections.length?`<section class="tile-grid reply-sections" aria-label="Supporting blocks">${sections.map(renderSection).join('')}</section>`:'';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="t3lib reply" data-state="${state}"><header class="reply-head"><h1>${e(title)}</h1>${pill(label,tone)}</header>${summary?`<p class="reply-text">${e(summary)}</p>`:''}${results.length?resultGrid(results):''}${sectionsHtml}${statusFooter({...status,state})}${actionsHtml?`<div class="actions">${actionsHtml}</div>`:''}</main></body></html>`;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw Error('Usage: node render-reply.mjs input.json output.html');
  const data=JSON.parse(await readFile(input,'utf8'));await writeFile(output,await renderReply(data));
  console.log('Reply saved.');
}
