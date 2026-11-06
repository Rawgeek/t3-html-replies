import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { icon, pill, statusFooter, resultGrid, metric, escapeHTML as e } from './components.mjs';

const LIMITS=Object.freeze({
  title:64,summary:80,results:4,resultLabel:14,resultValue:14,resultNote:24,
  sections:8,sectionTitle:24,
  factsItems:4,listItems:3,listItem:48,
  tableColumns:2,tableRows:3,tableLabel:14,tableCell:18,rowDetail:260,
  swimlaneItems:6,swimlaneLabel:30,swimlaneNote:32,swimlaneTime:8,swimlaneProgress:12,
  changeItems:3,changeItem:44,
  compareItems:3,compareLabel:18,compareValue:10,compareDelta:12,
  cardItems:4,cardLabel:18,cardNote:40,
  barsItems:3,barLabel:18,barNote:22,
  progress:12,next:18,eta:16,wake:20,actions:3,actionLabel:14,actionSend:400,
  milestones:4,milestoneLabel:8,
  sectionText:{facts:240,list:175,table:240,swimlane:320,bars:170,changes:200,compare:170,cards:220},
  visibleText:1600
});
const STATES=new Set(['complete','working','waiting','blocked']);
const SECTION_TYPES=new Set(['facts','list','table','swimlane','bars','changes','compare','cards']);
// Every supporting block uses one shared height, so rows always align.
const SECTION_HEIGHT='small';
const TOP_KEYS=['title','state','summary','results','sections','progress','next','eta','wake','milestones','actions','columns'];
const OPAQUE=/\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*[0-9])[0-9a-f]{7,}\b|[0-9a-f]{8}-[0-9a-f-]{20,}/i;

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
  if(OPAQUE.test(text))fail(`${name} contains a hash or machine ID. Replace it with a readable reference such as "PR 22687".`);
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
    .filter(([key])=>!['href','icon','type','height','state','primary','send','detail'].includes(key))
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
  if(!SECTION_TYPES.has(type))fail(`${name} type must be facts, list, table, swimlane, bars, changes, compare, or cards.`);
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
      const rowName=`${name} row ${rowIndex+1}`;
      const objectRow=row&&typeof row==='object'&&!Array.isArray(row);
      if(objectRow)assertKeys(row,['cells','detail'],rowName);
      const cells=objectRow?row.cells:row;
      if(!Array.isArray(cells)||cells.length!==columns.length)fail(`${rowName} must match the column count.`);
      const detail=objectRow?field(row.detail,`${rowName} detail`,LIMITS.rowDetail,{optional:true}):'';
      const mapped=cells.map((cell,columnIndex)=>{
        const cellName=`${name} row ${rowIndex+1} cell ${columnIndex+1}`;
        if(cell&&typeof cell==='object'&&!Array.isArray(cell)){
          assertKeys(cell,['label','send','icon','primary'],cellName);
          const label=field(cell.label,`${cellName} label`,LIMITS.actionLabel);
          const send=field(cell.send,`${cellName} send`,LIMITS.actionSend);
          const iconName=field(cell.icon??'arrow-right',`${cellName} icon`,32);
          if(!/^[a-z0-9-]+$/.test(iconName))fail(`${cellName} icon must use a lowercase Lucide name.`);
          return {label,send,icon:iconName,primary:Boolean(cell.primary)};
        }
        return field(cell,cellName,LIMITS.tableCell);
      });
      return {cells:mapped,detail};
    });
    result={type,title,columns,rows};
  }else if(type==='changes'){
    assertKeys(section,['title','type','done','todo'],name);
    const lists=(value,label)=>{
      if(value===undefined)return [];
      if(!Array.isArray(value))fail(`${name} ${label} must be an array.`);
      if(value.length>LIMITS.changeItems)fail(`${name} ${label} allows at most ${LIMITS.changeItems} items.`);
      return value.map((item,itemIndex)=>field(item,`${name} ${label} ${itemIndex+1}`,LIMITS.changeItem));
    };
    const done=lists(section.done,'done');
    const todo=lists(section.todo,'todo');
    if(done.length+todo.length<2)fail(`${name} needs at least two changes across done and todo.`);
    result={type,title,done,todo};
  }else if(type==='cards'){
    assertKeys(section,['title','type','items'],name);
    const items=array(section.items,`${name} items`,2,LIMITS.cardItems).map((item,itemIndex)=>{
      const itemName=`${name} item ${itemIndex+1}`;
      assertKeys(item,['label','state','note'],itemName);
      const state=item.state??'pending';
      if(!['done','waiting','pending','blocked'].includes(state))fail(`${itemName} state must be done, waiting, pending, or blocked.`);
      return {
        label:field(item.label,`${itemName} label`,LIMITS.cardLabel),
        note:field(item.note,`${itemName} note`,LIMITS.cardNote,{optional:true}),
        state
      };
    });
    result={type,title,items};
  }else if(type==='compare'){
    assertKeys(section,['title','type','items'],name);
    const items=array(section.items,`${name} items`,1,LIMITS.compareItems).map((item,itemIndex)=>{
      const itemName=`${name} item ${itemIndex+1}`;
      assertKeys(item,['label','before','after','delta'],itemName);
      return {
        label:field(item.label,`${itemName} label`,LIMITS.compareLabel),
        before:field(item.before,`${itemName} before`,LIMITS.compareValue),
        after:field(item.after,`${itemName} after`,LIMITS.compareValue),
        delta:field(item.delta,`${itemName} delta`,LIMITS.compareDelta,{optional:true})
      };
    });
    result={type,title,items};
  }else if(type==='swimlane'){
    assertKeys(section,['title','type','items'],name);
    const items=array(section.items,`${name} items`,5,LIMITS.swimlaneItems).map((item,itemIndex)=>{
      const itemName=`${name} item ${itemIndex+1}`;
      assertKeys(item,['label','note','time','state','progress'],itemName);
      const state=item.state??'pending';
      if(!['done','waiting','pending'].includes(state))fail(`${itemName} state must be done, waiting, or pending.`);
      const progress=field(item.progress,`${itemName} progress`,LIMITS.swimlaneProgress,{optional:true});
      if(progress&&state!=='waiting')fail(`${itemName} progress belongs on the current step, the only waiting item.`);
      if(progress&&!/\d+\s*%/.test(progress))fail(`${itemName} progress must include a percentage, for example 62%.`);
      return {
        label:field(item.label,`${itemName} label`,LIMITS.swimlaneLabel),
        note:field(item.note,`${itemName} note`,LIMITS.swimlaneNote,{optional:true}),
        time:field(item.time,`${itemName} time`,LIMITS.swimlaneTime,{optional:true}),
        state,
        progress
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
  return {...result,height:type==='swimlane'?'tall':SECTION_HEIGHT};
}

function renderSection(section){
  let body='';
  if(section.type==='facts'){
    body=`<div class="metric-grid">${section.items.map(item=>metric(item.value,item.label,item.note)).join('')}</div>`;
  }else if(section.type==='list'){
    body=`<ul class="bullets">${section.items.map(item=>`<li><span>${e(item)}</span></li>`).join('')}</ul>`;
  }else if(section.type==='table'){
    const hasActions=section.rows.some(row=>row.cells.some(cell=>cell&&typeof cell==='object'));
    const tableClass=hasActions?' class="has-actions"':'';
    body=`<div class="table-wrap${hasActions?' has-actions':''}"><table${tableClass}><thead><tr>${section.columns.map(column=>`<th scope="col">${e(column)}</th>`).join('')}</tr></thead><tbody>${section.rows.map(row=>{
      const title=row.detail||row.cells.find(cell=>cell&&typeof cell==='object')?.send||'';
      return `<tr${title?` class="has-detail" title="${e(title)}"`:''}>${row.cells.map(cell=>{
      if(cell&&typeof cell==='object'){
        return `<td class="cell-action"><button class="btn compact${cell.primary?' primary':''}" type="button" data-t3-send="${e(cell.send)}">${icon(cell.icon)}<span>${e(cell.label)}</span></button></td>`;
      }
      return `<td${/^(?:[\d.,]+%|[\d.,]+ (?:s|ms|GB|MB))$/.test(cell)?' class="numeric"':''}>${e(cell)}</td>`;
    }).join('')}</tr>`;
    }).join('')}</tbody></table></div>`;
  }else if(section.type==='swimlane'){
    body=`<ol class="swimlane">${section.items.map(item=>{
      const percent=item.progress?Number(String(item.progress).match(/\d+(?:\.\d+)?/)[0]):null;
      return `<li class="${item.state}"><span class="dot ${item.state}" aria-hidden="true"></span><span class="swimlane-copy"><b>${e(item.label)}</b>${item.note?`<small>${e(item.note)}</small>`:''}</span>${item.time?`<time>${e(item.time)}</time>`:''}${item.progress?`<span class="swimlane-step"><span class="swimlane-meter" role="progressbar" aria-label="Current step progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="--value:${percent}%"></i></span><small>${e(item.progress)}</small></span>`:''}</li>`;
    }).join('')}</ol>`;
  }else if(section.type==='cards'){
    const tone={done:['Checked','ok','check'],waiting:['In progress','active','activity'],pending:['Next','waiting','arrow-right'],blocked:['Blocked','error','circle-x']};
    body=`<div class="reply-cards">${section.items.map(item=>{
      const [text,toneName,iconName]=tone[item.state];
      return `<article class="reply-card"><h3>${e(item.label)}</h3>${pill(text,toneName,iconName)}${item.note?`<p>${e(item.note)}</p>`:''}</article>`;
    }).join('')}</div>`;
  }else if(section.type==='compare'){
    const number=text=>{
      const match=String(text).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
      return match?Number(match[0]):null;
    };
    body=`<div class="compare">${section.items.map(item=>{
      const before=number(item.before),after=number(item.after);
      const max=Math.max(before??0,after??0)||1;
      const scale=value=>Math.round((value===null?100:value/max*100)*10)/10;
      const widths=`--before:${scale(before)}%;--after:${scale(after)}%`;
      return `<div class="compare-row"><div class="compare-line"><span class="compare-label">${e(item.label)}</span>${item.delta?`<span class="compare-delta">${e(item.delta)}</span>`:''}<span class="compare-values"><span>${e(item.before)}</span><span aria-hidden="true">→</span><b>${e(item.after)}</b></span></div><div class="compare-track" style="${widths}"><span class="before"></span><span class="after"></span></div></div>`;
    }).join('')}</div>`;
  }else if(section.type==='changes'){
    const column=(label,items,state)=>items.length?`<div class="change-col ${state}"><p class="change-head">${e(label)}</p><ul class="change-list">${items.map(item=>`<li><span class="dot ${state}" aria-hidden="true"></span><span>${e(item)}</span></li>`).join('')}</ul></div>`:'';
    body=`<div class="changes">${column('Done',section.done,'done')}${column('To do',section.todo,'pending')}</div>`;
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
  const columns=data.columns===undefined?3:Number(data.columns);
  if(!Number.isInteger(columns)||![2,3].includes(columns))fail('Columns must be 2 or 3.');
  const results=present(data.results)?facts(data.results,'Results',1):[];
  if(done&&!results.length)fail('Complete replies require result facts.');
  const sections=present(data.sections)?array(data.sections,'Sections',1,LIMITS.sections).map(validateSection):[];
  const swimlanes=sections.filter(section=>section.type==='swimlane');
  const changes=sections.filter(section=>section.type==='changes');
  if(swimlanes.length!==1)fail('Every reply needs exactly one swimlane block: history, the current step, and the next steps.');
  if(changes.length!==1)fail('Every reply needs exactly one changes block listing done and to do work.');
  const [swimlane]=swimlanes;
  const doneSteps=swimlane.items.filter(item=>item.state==='done').length;
  const currentSteps=swimlane.items.filter(item=>item.state==='waiting').length;
  const nextSteps=swimlane.items.filter(item=>item.state==='pending').length;
  if(doneSteps<2)fail('The swimlane needs at least two done steps so the history is visible.');
  if(nextSteps<2)fail('The swimlane needs at least two pending steps so the next steps are visible.');
  if(done&&currentSteps)fail('A complete reply cannot keep a waiting step in its swimlane.');
  if(!done&&currentSteps!==1)fail('A pending reply needs exactly one waiting step for the current step.');
  const active=swimlane.items.find(item=>item.state==='waiting');
  if(active&&!active.progress)fail('The current swimlane step needs its own progress, for example 62%.');
  if(done&&!changes[0].done.length)fail('A complete reply needs at least one done change.');
  if(!done&&!changes[0].todo.length)fail('A pending reply needs at least one to do change.');
  const status=validateStatus(data,done);
  const milestones=data.milestones===undefined?[]:array(data.milestones,'Milestones',2,LIMITS.milestones).map((item,index)=>field(item,`Milestones ${index+1}`,LIMITS.milestoneLabel));
  if(!milestones.length)fail('Every reply needs 2 to 4 milestones so the progress bar can show its gates.');
  const actions=validateActions(data.actions);
  const visible=visibleChars({title,summary,results,sections,status,milestones,actions:actions.map(({label})=>({label}))});
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="t3lib reply" data-state="${state}" data-columns="${columns}"><header class="reply-head"><h1>${e(title)}</h1>${pill(label,tone)}</header>${summary?`<p class="reply-text">${e(summary)}</p>`:''}${results.length?resultGrid(results):''}${sectionsHtml}${statusFooter({...status,state,milestones})}${actionsHtml?`<div class="actions">${actionsHtml}</div>`:''}</main></body></html>`;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw Error('Usage: node render-reply.mjs input.json output.html');
  const data=JSON.parse(await readFile(input,'utf8'));await writeFile(output,await renderReply(data));
  console.log('Reply saved.');
}
