import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { icon, pill, progressBoard, resultGrid, metric, escapeHTML as e } from './components.mjs';
import { percentValue, measure } from './parse.mjs';

const LIMITS=Object.freeze({
  title:64,summary:80,results:4,resultLabel:12,resultValue:8,resultNote:18,
  sections:8,sectionTitle:24,
  factsItems:4,listItems:3,listItem:48,
  tableColumns:2,tableRows:3,tableLabel:14,tableCell:18,
  swimlaneItems:6,swimlaneLabel:18,swimlaneNote:20,swimlaneTime:5,swimlaneProgress:12,
  changeItems:3,changeTitle:18,changeDescription:22,
  compareItems:3,compareLabel:18,compareValue:10,compareDelta:12,
  cardItems:3,cardLabel:12,cardNote:18,
  barsItems:3,barLabel:18,barNote:22,
  progress:12,next:18,eta:16,wake:20,actions:3,actionLabel:14,actionSend:400,
  milestones:4,milestoneLabel:8,
  sectionText:{facts:240,list:175,table:240,swimlane:340,bars:170,changes:280,compare:170,cards:220},
  visibleText:1200
});
const STATES=new Set(['complete','working','waiting','blocked']);
const SECTION_TYPES=new Set(['facts','list','table','swimlane','bars','changes','compare','cards']);
// Every supporting block uses one shared height, so rows always align.
const SECTION_HEIGHT='small';
const TOP_KEYS=['title','state','summary','results','sections','progress','eta','wake','milestones','actions'];
const OPAQUE=/\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*[0-9])[0-9a-f]{7,}\b|[0-9a-f]{8}-[0-9a-f-]{20,}/i;
const CLOCK=/^(?:[01]\d|2[0-3]):[0-5]\d$/;

const fail=message=>{throw Error(message);};
const LIBRARY_CSS=readFileSync(new URL('./library.css',import.meta.url),'utf8');
const inferType=(section)=>{
  if(Array.isArray(section.done)||Array.isArray(section.todo))return 'changes';
  if(Array.isArray(section.columns)&&Array.isArray(section.rows))return 'table';
  if(!Array.isArray(section.items))return 'list';
  const first=section.items[0];
  if(!first||typeof first!=='object')return 'list';
  if('before' in first&&'after' in first)return 'compare';
  if('value' in first&&'label' in first)return 'facts';
  if('time' in first&&'label' in first)return 'swimlane';
  if('state' in first&&'label' in first)return section.items.length>=5?'swimlane':'cards';
  return 'list';
};
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
    .filter(([key])=>!['href','icon','type','height','state','primary','send','beforeValue','afterValue'].includes(key))
    .reduce((sum,[,item])=>sum+visibleChars(item),0);
  return 0;
};

function validateStatus(data,done){
  const progress=field(data.progress??(done?'100%':undefined),'Progress',LIMITS.progress);
  const eta=field(data.eta??(done?'Complete':'Unknown'),'ETA',LIMITS.eta);
  const wake=field(data.wake??(done?'Not needed':'Not armed'),'Wake',LIMITS.wake);
  const value=percentValue(progress,'Progress');
  if(value===null)fail('Progress needs a numeric percentage for unfinished work, such as 62%. Use Unknown for the ETA only.');
  if(done&&value!==100)fail('Complete replies require 100%.');
  if(!done&&value===100)fail('Pending work cannot be shown at 100%.');
  return {progress,eta,wake};
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
    if(hasHref){
      if(typeof action.href!=='string'||action.href.length>500)fail(`${name}.href must be an HTTPS link up to 500 characters.`);
      let url;
      try{url=new URL(action.href);}catch{url=null;}
      if(!url||url.protocol!=='https:'||!url.hostname)fail(`${name}.href must be a full HTTPS link with a hostname.`);
    }
    const send=hasSend?field(action.send,`${name} send`,LIMITS.actionSend):'';
    const iconName=field(action.icon??'arrow-right',`${name} icon`,32);
    if(!/^[a-z0-9-]+$/.test(iconName))fail(`${name} icon must use a lowercase Lucide name.`);
    return {
      label,
      ...(hasHref?{href:new URL(action.href).href}:{send}),
      icon:iconName,
      primary:Boolean(action.primary)
    };
  });
}

function validateSection(section,index){
  const name=`Sections[${index}]`;
  if(!section||typeof section!=='object'||Array.isArray(section))fail(`${name} must be an object.`);
  const type=section.type??inferType(section);
  if(!SECTION_TYPES.has(type))fail(`${name} type must be facts, list, table, swimlane, bars, changes, compare, or cards.`);
  const title=field(section.title,`${name} title`,LIMITS.sectionTitle);
  let result;
  if(type==='facts'){
    assertKeys(section,['title','type','items'],name);
    const factItems=facts(section.items,`${name} items`,2);
    if(factItems.length%2)fail(`${name} needs 2 or 4 facts so the grid fills. Add one or remove one.`);
    result={type,title,items:factItems};
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
      if(objectRow)assertKeys(row,['cells'],rowName);
      const cells=objectRow?row.cells:row;
      if(!Array.isArray(cells)||cells.length!==columns.length)fail(`${rowName} must match the column count.`);
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
      return {cells:mapped};
    });
    result={type,title,columns,rows};
  }else if(type==='changes'){
    assertKeys(section,['title','type','done','todo'],name);
    const lists=(value,label)=>{
      if(value===undefined)return [];
      if(!Array.isArray(value))fail(`${name} ${label} must be an array.`);
      if(value.length>LIMITS.changeItems)fail(`${name} ${label} allows at most ${LIMITS.changeItems} items.`);
      return value.map((item,itemIndex)=>{
        const itemName=`${name} ${label} ${itemIndex+1}`;
        if(!item||typeof item!=='object'||Array.isArray(item))fail(`${itemName} must be an object with title and description.`);
        assertKeys(item,['title','description'],itemName);
        return {
          title:field(item.title,`${itemName} title`,LIMITS.changeTitle),
          description:field(item.description,`${itemName} description`,LIMITS.changeDescription)
        };
      });
    };
    const done=lists(section.done,'done');
    const todo=lists(section.todo,'todo');
    if(done.length+todo.length<1)fail(`${name} needs at least one change item.`);
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
      const before=field(item.before,`${itemName} before`,LIMITS.compareValue);
      const after=field(item.after,`${itemName} after`,LIMITS.compareValue);
      const b=measure(before,`${itemName} before`),a=measure(after,`${itemName} after`);
      if((b.family==='')!==(a.family===''))fail(`${itemName} must use a unit on both sides or on neither.`);
      if(b.family&&a.family&&b.family!==a.family)fail(`${itemName} compares ${b.unit} with ${a.unit}. Use the same unit on both sides.`);
      return {
        label:field(item.label,`${itemName} label`,LIMITS.compareLabel),
        before,
        after,
        beforeValue:b.value,
        afterValue:a.value,
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
      if(progress&&percentValue(progress,`${itemName} progress`)===null)fail(`${itemName} progress must include a percentage, for example 62%.`);
      const time=field(item.time,`${itemName} time`,LIMITS.swimlaneTime);
      if(!CLOCK.test(time))fail(`${itemName} time must be a 24-hour clock time such as 17:35.`);
      return {
        label:field(item.label,`${itemName} label`,LIMITS.swimlaneLabel),
        note:field(item.note,`${itemName} note`,LIMITS.swimlaneNote,{optional:true}),
        time,
        state,
        progress
      };
    });
    const stageLabels=items.map(item=>item.label.trim().toLowerCase());
    if(new Set(stageLabels).size!==stageLabels.length)fail(`${name} needs distinct stage labels so each milestone matches one step.`);
    const order=items.map(item=>item.state).join('');
    if(!/^(?:done)*(?:waiting)?(?:pending)*$/.test(order))fail(`${name} "${title}" must list done steps first, then the current step, then pending steps.`);
    result={type,title,items};
  }else{
    assertKeys(section,['title','type','items'],name);
    const items=array(section.items,`${name} items`,2,LIMITS.barsItems).map((item,itemIndex)=>{
      const itemName=`${name} item ${itemIndex+1}`;
      assertKeys(item,['label','value','note'],itemName);
      if(typeof item.value==='boolean')fail(`${itemName} value must be a non-negative number, not a boolean.`);
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
  if(visible>LIMITS.sectionText[type])fail(type==='changes'
    ?`${name} has ${visible} visible characters; changes allow ${LIMITS.sectionText[type]}. Shorten the items or move detail into a supporting block.`
    :`${name} has ${visible} visible characters; ${type} blocks allow ${LIMITS.sectionText[type]}. Shorten this block or add a different supporting block.`);
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
      return `<tr>${row.cells.map(cell=>{
      if(cell&&typeof cell==='object'){
        return `<td class="cell-action"><button class="btn compact${cell.primary?' primary':''}" type="button" data-t3-send="${e(cell.send)}">${icon(cell.icon)}<span>${e(cell.label)}</span></button></td>`;
      }
      return `<td${/^(?:[\d.,]+%|[\d.,]+ (?:s|ms|GB|MB))$/.test(cell)?' class="numeric"':''}>${e(cell)}</td>`;
    }).join('')}</tr>`;
    }).join('')}</tbody></table></div>`;
  }else if(section.type==='swimlane'){
    const clock=value=>{const m=CLOCK.exec(String(value||'').trim());return m?Number(m[0].slice(0,-3))*60+Number(m[0].slice(-2)):null;};
    const span=mins=>mins>=60?`${Math.floor(mins/60)}h ${String(mins%60).padStart(2,'0')}m`:`${mins}m`;
    section.items.forEach((item,index)=>{
      if(index===0)return;
      const prev=clock(section.items[index-1].time),cur=clock(item.time);
      if(prev!==null&&cur!==null&&item.state==='done'){
        const gap=(cur-prev+24*60)%(24*60);
        if(gap>0)item.took=span(gap);
      }
    });
    body=`<ol class="swimlane">${section.items.map(item=>{
      const percent=item.progress?Number(String(item.progress).match(/\d+(?:\.\d+)?/)[0]):null;
      const took=item.took?`<small class="stage-took">${e(item.took)}</small>`:'';
      return `<li class="${item.state}"><span class="dot ${item.state}" aria-hidden="true"></span><span class="swimlane-copy"><b>${e(item.label)}</b>${item.note?`<small>${e(item.note)}</small>`:''}</span><time>${e(item.time)}</time>${took}${item.progress?`<span class="swimlane-step"><span class="swimlane-meter" role="progressbar" aria-label="Current step progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="--value:${percent}%"></i></span>${item.sameAsOverall?'':`<small>${percent}%</small>`}</span>`:''}</li>`;
    }).join('')}</ol>`;
  }else if(section.type==='cards'){
    const tone={done:['Checked','ok','check'],waiting:['In progress','active','activity'],pending:['Next','waiting','arrow-right'],blocked:['Blocked','error','circle-x']};
    body=`<div class="reply-cards">${section.items.map(item=>{
      const [text,toneName,iconName]=tone[item.state];
      return `<article class="reply-card"><h3>${e(item.label)}</h3>${pill(text,toneName,iconName)}${item.note?`<p>${e(item.note)}</p>`:''}</article>`;
    }).join('')}</div>`;
  }else if(section.type==='compare'){
    body=`<div class="compare">${section.items.map(item=>{
      const before=item.beforeValue,after=item.afterValue;
      const max=Math.max(before,after)||1;
      const scale=value=>Math.round(value/max*1000)/10;
      const bar=(kind,value,width)=>`<div class="compare-bar ${kind}"><span class="compare-value">${e(value)}</span><span class="compare-track"><i style="--value:${width}%"></i></span></div>`;
      return `<div class="compare-row"><div class="compare-line"><span class="compare-label">${e(item.label)}</span>${item.delta?`<span class="compare-delta">${e(item.delta)}</span>`:''}</div>${bar('before',item.before,scale(before))}${bar('after',item.after,scale(after))}</div>`;
    }).join('')}</div>`;
  }else if(section.type==='changes'){
    const column=(label,items,state)=>items.length?`<div class="change-col ${state}"><p class="change-head">${e(label)}</p><ul class="change-list">${items.map(item=>`<li><span class="dot ${state}" aria-hidden="true"></span><span class="change-copy"><b>${e(item.title)}</b>${item.description?`<small>${e(item.description)}</small>`:''}</span></li>`).join('')}</ul></div>`:'';
    body=`<div class="changes">${column('Done',section.done,'done')}${column('To do',section.todo,'pending')}</div>`;
  }else{
    const max=Math.max(...section.items.map(item=>item.value),1);
    body=`<div class="reply-bars">${section.items.map(item=>`<div class="reply-bar"><div class="reply-bar-head"><span>${e(item.label)}</span><strong>${e(item.display)}</strong></div><div class="reply-bar-track" aria-hidden="true"><span style="--value:${item.value/max*100}%"></span></div>${item.note?`<p class="metric-note">${e(item.note)}</p>`:''}</div>`).join('')}</div>`;
  }
  return `<section class="component-tile reply-section-tile" data-height="${section.height}" data-section-type="${section.type}" data-span="${section.span||1}"${section.slot?` style="${section.slot}"`:''}><div class="demo tile-body"><h2>${e(section.title)}</h2><div class="reply-body">${body}</div></div></section>`;
}

function embedData(data){return `<script type="application/json" id="t3-reply-data">${JSON.stringify(data).replace(/</g,'\\u003c')}</script>`;}
function renderedVisible(html){
  const text=String(html);
  const body=text.slice(text.indexOf('<body>')+6,text.lastIndexOf('</body>'));
  return body.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi,'x').replace(/\s+/g,'').length;
}
function finishReply(html){
  if(renderedVisible(html)>LIMITS.visibleText)fail(`Reply exceeds ${LIMITS.visibleText} visible characters. Move long material to a linked artifact.`);
  return html;
}
export async function renderReply(data){return finishReply(renderReplyPage(data));}
function renderReplyPage(data){
  const css=LIBRARY_CSS;
  if(!data||typeof data!=='object'||Array.isArray(data))fail('Reply data must be an object.');
  if(data.kind==='question')return renderQuestion(data,css);
  assertKeys(data,TOP_KEYS,'Reply');
  const state=data.state;
  if(!STATES.has(state))fail('State must be complete, working, waiting, or blocked.');
  const done=state==='complete';
  const title=field(data.title,'Title',LIMITS.title);
  const summary=field(data.summary,'Summary',LIMITS.summary,{optional:true});
  const results=present(data.results)?facts(data.results,'Results',3):[];
  if(!results.length)fail('Every reply needs 3 or 4 result facts so the top band has evidence.');
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
  if(!done&&nextSteps<2)fail('The swimlane needs at least two pending steps so the next steps are visible.');
  if(done&&currentSteps)fail('A complete reply cannot keep a waiting step in its swimlane.');
  if(!done&&currentSteps!==1)fail('A pending reply needs exactly one waiting step for the current step.');
  if(done&&nextSteps)fail('A complete reply cannot keep pending steps. Finish them, or keep the reply working and add a to do list.');
  const active=swimlane.items.find(item=>item.state==='waiting');
  if(active&&!active.progress)fail('The current swimlane step needs its own progress, for example 62%.');
  if(done&&!changes[0].done.length)fail('A complete reply needs at least one done change.');
  if(!done&&!changes[0].done.length)fail('A pending reply needs at least one done change.');
  if(!done&&!changes[0].todo.length)fail('A pending reply needs at least one to do change.');
  if(done&&changes[0].todo.length)fail('A complete reply cannot keep a to do list. Remove the remaining items or keep the reply unfinished.');
  if(done){
    const open=sections.filter(section=>section.type==='cards').flatMap(section=>section.items.map(item=>({...item,section:section.title}))).find(item=>item.state!=='done');
    if(open)fail(`A complete reply cannot keep the ${open.state} card "${open.label}" in ${open.section}. Mark every card done or keep the reply unfinished.`);
  }
  const status=validateStatus(data,done);
  const overallPercent=percentValue(status.progress,'Progress');
  const currentStep=swimlane.items.find(item=>item.state==='waiting');
  const stepPercent=currentStep&&currentStep.progress?percentValue(currentStep.progress,'Step progress'):null;
  if(currentStep&&stepPercent!==null&&stepPercent===overallPercent)currentStep.sameAsOverall=true;
  const milestones=data.milestones===undefined?[]:array(data.milestones,'Milestones',2,LIMITS.milestones).map((item,index)=>field(item,`Milestones ${index+1}`,LIMITS.milestoneLabel));
  if(!milestones.length)fail('Every reply needs 2 to 4 milestones so the progress bar can show its gates.');
  const actions=validateActions(data.actions);
  const visible=visibleChars({title,summary,results,sections,status,milestones,actions:actions.map(({label})=>({label}))});
  if(visible>LIMITS.visibleText)fail(`Reply exceeds ${LIMITS.visibleText} visible characters. Move long material to a linked artifact.`);
  const actionsHtml=actions.map(action=>{
    const className=`btn${action.primary?' primary':''}`;
    return action.send
      ?`<button class="${className}" type="button" data-t3-send="${e(action.send)}">${icon(action.icon)}<span>${e(action.label)}</span></button>`
      :`<a class="${className}" href="${e(action.href)}">${icon(action.icon)}<span>${e(action.label)}</span></a>`;
  }).join('');
  const swimlaneSection=sections.find(section=>section.type==='swimlane');
  const supporting=sections.filter(section=>section!==swimlaneSection);
  if(supporting.length<2)fail('Add at least two supporting blocks beside the swimlane so the grid stays full.');
  const swimlaneHtml=renderSection({...swimlaneSection,slot:'grid-row:1/4;grid-column:1/2'});
  if(overallPercent!==null&&swimlaneHtml.includes(`<small>${overallPercent}%</small>`))fail('The rail repeats the overall percentage. Keep the step number only when it differs from Progress.');
  const resultsHtml=resultGrid(results);
  const changesSection=supporting.find(section=>section.type==='changes');
  const blockSections=supporting.filter(section=>section!==changesSection);
  const groups=[];
  for(let index=1;index<blockSections.length;index+=4)groups.push(blockSections.slice(index,index+4));
  const extraHeights=groups.map(group=>group.every(section=>['facts','cards','list'].includes(section.type))?'slim':'small');
  const gridRows=`repeat(2,minmax(var(--height-slim),auto)) minmax(var(--height-small),auto)${extraHeights.map(height=>` minmax(var(--height-${height}),auto)`).join('')}`;
  const slot=(section,row,columns,span=1)=>renderSection({...section,span,slot:`grid-row:${row};grid-column:${columns}`});
  const firstHtml=blockSections.length?slot(blockSections[0],3,'4/5',1):'';
  const extraHtml=groups.map((group,groupIndex)=>{
    const spans=group.length===1?[4]:group.length===2?[2,2]:group.length===3?[2,1,1]:[1,1,1,1];
    const height=extraHeights[groupIndex];
    let column=1;
    return group.map((section,index)=>{
      const width=spans[index];
      const style=`grid-row:${4+groupIndex};grid-column:${column}/${column+width}`;
      column+=width;
      return renderSection({...section,span:width,height,slot:style});
    }).join('');
  }).join('');
  const changePart=(kind)=>{
    if(!changesSection)return '';
    const items=kind==='done'?changesSection.done:changesSection.todo;
    if(!items.length)return '';
    const title=kind==='done'?'Done':'To do';
    const columns=kind==='done'?(changesSection.todo.length?'2/3':'2/4'):'3/4';
    const list=`<ul class="change-list">${items.map(item=>`<li><span class="dot ${kind==='done'?'done':'pending'}" aria-hidden="true"></span><span class="change-copy"><b>${e(item.title)}</b>${item.description?`<small>${e(item.description)}</small>`:''}</span></li>`).join('')}</ul>`;
    const span=kind==='done'&&!changesSection.todo.length?2:1;
    const slot=`grid-row:3;grid-column:${columns}`;
    return `<section class="component-tile reply-section-tile" data-height="small" data-section-type="changes" data-span="${span}" data-change="${kind}" style="${slot}"><div class="demo tile-body"><h2>${title}</h2><div class="reply-body"><div class="changes" data-kind="${kind}">${list}</div></div></div></section>`;
  };
  const progressHtml=progressBoard({...status,state,milestones,stages:swimlane.items});
  const sectionsHtml=`<section class="bento" aria-label="Task layout" style="grid-template-rows:${gridRows}">${swimlaneHtml}${progressHtml}${resultsHtml}${changePart('done')}${changePart('todo')}${firstHtml}${extraHtml}</section>`;
  const wakeText=String(status.wake||'').trim();
  const wakeOff=!wakeText||/^(?:not armed|not needed|off|none|unknown|unverified)$/i.test(wakeText);
  const wakeLabel=wakeText.replace(/^on\s+/i,'');
  const wakeChip=wakeOff?'':`<span class="wake-chip" title="Subscribed to ${e(wakeText)}">${icon('bell')}<span>${e(wakeLabel)}</span></span>`;
  const metaHtml=`<div class="reply-meta">${wakeChip}${actionsHtml?`<div class="actions">${actionsHtml}</div>`:''}</div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="t3lib reply" data-state="${state}"><header class="reply-head"><h1>${e(title)}</h1>${metaHtml}</header>${summary?`<p class="reply-text">${e(summary)}</p>`:''}${sectionsHtml}</main>${embedData(data)}</body></html>`;
}

const QUESTION_KEYS=['kind','title','context','question','options','actions'];
function renderQuestion(data,css){
  assertKeys(data,QUESTION_KEYS,'Question');
  const title=field(data.title,'Title',LIMITS.title);
  const context=field(data.context,'Context',160);
  const question=field(data.question,'Question',120);
  const options=array(data.options,'Options',2,3).map((option,index)=>{
    const name=`Options[${index}]`;
    if(!option||typeof option!=='object'||Array.isArray(option))fail(`${name} must be an object.`);
    assertKeys(option,['label','note','send','primary'],name);
    if(!present(option.send))fail(`${name} needs the message to send when the user picks it.`);
    return {
      label:field(option.label,`${name} label`,28),
      note:field(option.note,`${name} note`,60,{optional:true}),
      send:field(option.send,`${name} send`,LIMITS.actionSend),
      primary:Boolean(option.primary)
    };
  });
  const actions=validateActions(data.actions);
  const actionsHtml=actions.map(action=>action.send
    ?`<button class="btn" type="button" data-t3-send="${e(action.send)}">${icon(action.icon)}<span>${e(action.label)}</span></button>`
    :`<a class="btn" href="${e(action.href)}">${icon(action.icon)}<span>${e(action.label)}</span></a>`).join('');
  const optionHtml=options.map((option,index)=>`<button class="ask-option${option.primary||index===0?' primary':''}" type="button" data-t3-send="${e(option.send)}"><span class="ask-copy"><b>${e(option.label)}</b>${option.note?`<small>${e(option.note)}</small>`:''}</span>${icon('arrow-right')}</button>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="t3lib reply question"><header class="reply-head"><h1>${e(title)}</h1>${actionsHtml?`<div class="reply-meta"><div class="actions">${actionsHtml}</div></div>`:''}</header><p class="reply-text">${e(context)}</p><section class="ask" aria-label="Question"><p class="ask-question">${e(question)}</p><div class="ask-options">${optionHtml}</div></section></main>${embedData(data)}</body></html>`;
}

export function assertRenderedReply(html){
  const text=String(html);
  if(!/^<!doctype html>/i.test(text.trim()))fail('Not a reply page: the file needs a doctype. A fragment such as <p>Text</p> is invalid.');
  const match=text.match(/<script type="application\/json" id="t3-reply-data">([\s\S]*?)<\/script>/);
  if(!match)fail('Not a reply page: it needs the embedded reply data. Render reply JSON with node ui-library/ui.mjs reply.');
  let data;
  try{data=JSON.parse(match[1]);}catch{fail('Not a reply page: its embedded reply data is not valid JSON.');}
  let canonical;
  try{canonical=finishReply(renderReplyPage(data));}catch(error){fail('Not a reply page: its embedded reply data does not validate. '+error.message);}
  if(canonical!==text)fail('Not a reply page: the HTML does not match a fresh render of its embedded data. Render reply JSON instead of editing HTML.');
  return true;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw Error('Usage: node render-reply.mjs input.json output.html');
  const data=JSON.parse(await readFile(input,'utf8'));await writeFile(output,await renderReply(data));
  console.log('Reply saved.');
}
