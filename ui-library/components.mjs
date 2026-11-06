import { icon } from './icons.mjs';
import { heights } from './heights.mjs';
export { icon } from './icons.mjs';
export const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHTML;
export function tile(content,height='medium') {
  if(!heights[height])throw Error('Unknown tile height');
  return `<section class="component-tile" data-height="${height}"><div class="demo tile-body">${content}</div></section>`;
}
export function pill(text,tone='',name='') {
  let label=String(text).replace('In progress','Working').replace('Not started','Next').replace('Not verified','Unverified');
  if(!name){
    if(/unknown|unverified/i.test(label))name='circle-help';
    else if(/blocked|fail|error/i.test(label)){name='circle-x';tone=tone||'error';}
    else if(/draft|parked/i.test(label))name=label==='Parked'?'lock':'file-text';
    else if(/review/i.test(label)){name='git-pull-request';tone=tone||'waiting';}
    else if(/running|working|checks/i.test(label)){name='activity';tone=tone||'active';}
    else if(/wait|pending/i.test(label)){name='clock';tone=tone||'waiting';}
    else if(/verified|ready|healthy|checked|pass|done|complete/i.test(label)){name='check';tone=tone||'ok';}
    else if(/%/.test(label))name='arrow-down-right';
  }
  return `<span class="pill" data-tone="${e(tone)}">${name?icon(name):''}<span>${e(label)}</span></span>`;
}
const bullets = rows => `<ul class="bullets">${rows.map(s=>`<li><span>${e(s)}</span></li>`).join('')}</ul>`;
const feedback = () => '<output class="feedback" aria-live="polite"></output>';
const btn = (label,action,primary=false,extra='',name='') => `<button type="button" class="btn${primary?' primary':''}" data-demo-action="${e(action)}" ${extra}>${icon(name||(action==='copy'?'copy':action==='parallel'?'git-branch':action==='download'?'download':action==='retry'?'play':'send'))}<span>${e(label)}</span></button>`;
const markdown = text => text.split(/\n\n/).map(part => {
  const formatted=e(part).replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g,(_,a,b)=>`<strong>${a||b}</strong>`);
  return part.startsWith('## ')?`<h4>${e(part.slice(3))}</h4>`:`<p class="copy-text">${formatted}</p>`;
}).join('');
export function statusFooter({progress='Unknown',next='None',eta='Unknown',wake='Not armed',state='working'}={}) {
  const matches=String(progress).match(/(\d+(?:\.\d+)?)\s*%/),value=matches?Math.max(0,Math.min(100,Number(matches[1]))):null;
  const done=value===100,blocked=state==='blocked',waiting=state==='waiting';
  const tone=done?'ok':blocked?'error':waiting?'waiting':'active';
  const shorts={'None':'Done','Run the full checks':'Full checks','Wait for the review':'Review','Verify the released flow':'Verify flow','Complete CI and review':'CI + review','Choose an example':'Pick one','Finish the review':'Review','Fix the check':'Fix check'};
  const compact=(text)=>shorts[text]||String(text);
  const shortEta=/unknown/i.test(eta)?'Unknown':/complete/i.test(eta)?'Done':/ready/i.test(eta)?'Ready':String(eta).replace(/ min(?:utes?)?/g,'m').replace(/ estimate/g,'');
  const off=/not armed|not needed|^off$|^none$/i.test(wake),uncertain=/unknown|unverified/i.test(wake),wakeOn=!off&&!uncertain;
  const shortWake=off?(/not needed/i.test(wake)?'None':'Off'):uncertain?'Unknown':/review|pr watch/i.test(wake)?'Review':compact(wake);
  const tile=(label,name,text,tileTone='',extra='',field='')=>`<div class="status-tile" data-field="${field}" data-tone="${tileTone}"><dt>${icon(name)}<span>${label}</span></dt><dd>${e(text)}</dd>${extra}</div>`;
  const track=`<div class="status-meter" role="progressbar" aria-label="Progress${/estimate/i.test(progress)?', estimate':''}" aria-valuemin="0" aria-valuemax="100" ${value===null?'aria-valuetext="Unknown"':`aria-valuenow="${value}"`}><span style="--value:${value||0}%"></span></div>`;
  const nextDone=/^(None|Done)$/i.test(next);
  const nextText=nextDone?(/^None$/i.test(next)?'None':'Done'):compact(next);
  return `<section class="status-board" data-state="${e(state)}"><dl class="status-tiles" aria-label="Task status">${tile('Progress',done?'check':blocked?'circle-x':'activity',value===null?'Unknown':value+'%'+(/estimate/i.test(progress)?' est.':''),tone,track,'progress')}${tile('Next',nextDone?'check':'arrow-right',nextText,nextDone?'ok':'')}${tile('ETA',shortEta==='Done'?'check':'clock',shortEta,shortEta==='Unknown'?'waiting':done?'ok':'')}${tile('Wake',wakeOn?'bell':uncertain?'circle-help':'bell-off',shortWake,wakeOn?'ok':uncertain?'waiting':'muted')}</dl></section>`;
}
export function metric(value,label,note='') {
  return `<div class="metric"><p class="metric-label">${e(label)}</p><p class="metric-value">${e(value)}</p>${note?`<p class="metric-note">${e(note)}</p>`:''}</div>`;
}
export function resultGrid(rows) {
  return `<section class="tile-grid reply-results" aria-label="Results" style="--columns:${Math.min(4,rows.length)}">${rows.map(row=>tile(metric(row.value,row.label,row.note),'slim')).join('')}</section>`;
}
export function meter(value,label='Verified milestones',extra='') {
  return `<div class="meter" data-state="${value===100?'complete':value===0?'idle':'working'}"><div class="meter-head"><span>${e(label)}</span><strong class="num" data-progress-label>${value}%</strong></div><div class="meter-track" role="progressbar" aria-label="${e(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><div class="meter-fill" style="--value:${value}%"></div></div>${extra}</div>`;
}
export function chart(data) {
  const legend = data.series?.length>1 ? `<div class="legend">${data.series.map((s,i)=>`<button type="button" data-series="${i}" aria-pressed="true" style="--legend-color:var(--ui-series-${i+1})">${e(s.name)}</button>`).join('')}</div>`:'';
  const range = data.detailed?'<div class="actions"><button class="btn" type="button" data-range="6" aria-pressed="false">6 runs</button><button class="btn" type="button" data-range="12" aria-pressed="true">12 runs</button></div>':'';
  return `<figure class="chart" data-chart="${e(JSON.stringify(data))}">${legend}${range}<svg role="img" aria-label="${e(data.title)}"></svg><figcaption class="chart-readout">${e(data.type==='bars'?`Duration in ${data.unit}. Lower is better.`:`Duration in ${data.unit}, across 12 sample runs.`)}</figcaption></figure>`;
}
export function table(headers, rows,{filter=false,caption='Illustrative service inventory'}={}) {
  return `<div class="stack interactive">${filter?'<label class="field">Filter these rows<input class="text-input" data-table-filter placeholder="Service, owner, or state"></label>':''}<div class="table-wrap"><table><caption>${e(caption)}</caption><thead><tr>${headers.map((h,i)=>`<th scope="col"><button type="button" data-sort-col="${i}" aria-label="Sort by ${e(h)}">${e(h)}</button></th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((v,i)=>`<td${/^(?:[\d.]+%|\d+ ms)$/.test(String(v))?' class="numeric"':''}>${e(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${feedback()}</div>`;
}
function timeline(count) {
  const rows=[['Change prepared','Morgan · focused scope','09:10','done'],['Focused checks passed','Riley · same spec inventory','09:18','done'],['Review received','Sam · evidence recorded','09:24','done'],['Full checks running','Alex · expected result pending','09:30','waiting'],['Release approval','Owner · pending','Next','pending'],['Deploy exact revision','Riley · after the gates pass','Next','pending'],['Verify the affected flow','Morgan · runtime and user path','Last','pending']];
  return `<ol class="timeline">${rows.slice(0,count).map(([title,note,time,state],i)=>`<li><span class="dot ${state}" aria-hidden="true"></span><div><p>${e(title)}</p><p class="muted small">${e(note)}</p></div><time>${e(time)}</time></li>`).join('')}</ol>`;
}
function report(level,id) {
  const nav=level===2?`<nav class="report-nav" aria-label="Report sections"><a href="#${id}-evidence">Evidence</a><a href="#${id}-risk">Risk</a><a href="#${id}-next">Next actions</a></nav>`:'';
  return `<article class="report">
    <p class="lead">The sample build uses 39% less peak memory.</p>
    <p class="muted">Bounded batches keep the same test inventory within the runner's memory limit. Full CI and release verification remain pending.</p>${nav}
    <section id="${id}-evidence"><h4>Evidence</h4>${table(['Measure','Baseline','Current'],[['Peak memory','1.8 GB','1.1 GB'],['Duration','148 s','92 s'],['Specs','1,248','1,248']],{caption:'Identical sample workload and runner'})}</section>
    ${level>0?`<section><h4>Method</h4><p>Use identical inputs, the same runner, and 30 repeated runs. Exclude setup time. Check that every discovered spec also executes.</p></section><section><h4>Decision</h4><p>Keep bounded batching. It reduces the sample peak without changing the executed spec count.</p></section>`:''}
    ${level===2?`<section><h4>Alternatives</h4>${bullets(['A larger runner hides the memory peak and increases cost.','Removing tests reduces coverage.','Bounded batches preserve the current test inventory.'])}</section><section><h4>Open work</h4>${bullets(['Full CI is still pending.','The review has not produced a verdict.','No deployed revision or affected-flow evidence exists yet.'])}</section>`:''}
    <section id="${id}-risk"><h4>Risk</h4><p>Batch discovery could omit a spec. Compare discovered and executed counts before release.</p></section>
    <section id="${id}-next"><h4>Next actions</h4><p>Morgan owns review. Riley owns deployment and the affected-flow check after the gates pass.</p></section>
    ${statusFooter({progress:'70% estimate',next:'Complete CI and review',eta:'Unknown until review',wake:'Example PR watch'})}
  </article>`;
}
export function renderExample(item,{instance=item.id}={}) {
  const d=item.data, id=`ex-${String(instance).replace(/[^a-z0-9-]/gi,'-')}`;
  switch(item.family) {
    case 'status-atoms': return `<div class="status-atom" data-tone="${d.field==='progress'?'active':'muted'}"><p>${icon(d.icon)}<span>${e(d.label)}</span></p><strong>${e(d.value)}</strong>${d.field==='progress'?'<div class="status-meter" role="progressbar" aria-label="Estimated progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="62"><span style="--value:62%"></span></div>':''}</div>`;
    case 'status-panels': return `<article class="stack">${pill(item.title,d.state==='complete'?'ok':d.state==='blocked'?'error':d.state==='waiting'?'waiting':'active')}${statusFooter(d)}</article>`;
    case 'benchmarks': {
      const improvement=Math.round(100*(d.baseline-d.current)/d.baseline);
      const label=item.size==='small'?'':item.size==='medium'?'p95 · ':'Search · ';
      return `<article class="stack"><div class="split"><h3>${e(d.title)}</h3>${pill(`${label}${improvement}% less`,'ok')}</div>${chart({type:'bars',title:d.title,unit:d.unit,rows:d.rows,height:[115,220,280][['small','medium','large'].indexOf(item.size)]})}<p class="muted small">${d.n.toLocaleString('en-US')} runs</p></article>`;
    }
    case 'graphs': return `<div class="stack"><h3>${e(d.title)}</h3>${chart(d)}</div>`;
    case 'tables': return table(d.headers,d.rows,{filter:d.filter});
    case 'task-progress': return `<article class="report"><div class="split"><p class="lead">Checks pass.</p>${pill('Working','active')}</div>${statusFooter({progress:`${d.progress}% estimate`,next:d.next,eta:d.eta,wake:d.wake,state:d.level===1?'waiting':'working'})}</article>`;
    case 'summaries': return `<article class="stack"><h3>${e(d.title)}</h3><p class="muted">${e(d.body)}</p></article>`;
    case 'reports': return report(d.level,id);
    case 'pr-actions': {
      const states=['Review','Checks','Ready','Blocked','Draft','Review','Checks','Parked'];
      const names=['Morgan','Riley','Sam','Alex','Taylor','Jamie','Casey','Robin'];
      return `<div class="stack interactive"><div class="table-wrap"><table><caption>Illustrative PR queue. Actions prepare local drafts.</caption><thead><tr><th>PR</th><th>State</th>${d.level>0?'<th>Checks / review</th><th>Owner</th>':''}<th>Next action</th></tr></thead><tbody>${states.slice(0,d.count).map((state,i)=>`<tr><td class="mono">#${142+i}</td><td>${pill(state,state==='Blocked'?'error':state==='Ready'?'ok':'waiting')}</td>${d.level>0?`<td>${e(['Pass / pending','Running / pass','Pass / pass','Fail / pending','Not run','Pass / pending','Running','Unchanged'][i])}</td><td>${e(names[i])}</td>`:''}<td>${state==='Parked'||state==='Draft'?'<span class="muted">Owner decides</span>':btn('Prepare',`Draft: inspect sample PR #${142+i}; preserve its current owner and scope.`)}</td></tr>`).join('')}</tbody></table></div>${feedback()}</div>`;
    }
    case 'slack': return `<article class="message interactive"><div class="avatar" aria-hidden="true">MC</div><div class="stack"><div class="message-head"><strong>Morgan Chen</strong><time>10:24</time></div>${markdown(d.text)}<div class="actions">${btn('Copy','copy',false,`data-copy-text="${e(d.text)}"`)}</div>${feedback()}</div></article>`;
    case 'github-pr': return `<article class="stack interactive"><div class="split"><h3>${e(d.title)}</h3>${pill('Draft')}</div><div class="report">${markdown(d.text)}</div><div class="actions">${btn('Copy','copy',false,`data-copy-text="${e(d.text)}"`)}</div>${feedback()}</article>`;
    case 'progress': return `<div class="stack interactive" data-milestone-progress>${meter(d.value,d.level===2?'4 gates':'Progress · est.')}${d.level===1?`<div class="row">${pill('Checks','ok','check')}${pill('Review','waiting')}</div>`:''}${d.level===2?'<div class="milestones"><span class="done">Code</span><span class="done">Checks</span><span class="done">Review</span><span class="active">Live</span></div><div class="checklist">'+['Code','Checks','Review','Live flow'].map((s,i)=>`<label><input type="checkbox" data-gate ${i<3?'checked':''}><span>${s}</span></label>`).join('')+'</div>':''}</div>`;
    case 'buttons': return `<div class="stack interactive"><div class="actions" data-button-count="${d.count}">${btn('Send','Draft: Review this change.',true)}${d.count>2?btn('Parallel','parallel',false,'','git-branch'):''}${d.count===4?btn('Run','retry',false,'','play')+btn('Save','download',false,'data-download-text="Review this example change." data-download-name="review.txt"','download'):btn('Copy','copy',false,'data-copy-text="Review this example change."')}</div>${feedback()}</div>`;
    case 'timelines': return timeline(d.count);
    case 'layouts': return `<div class="arrangement" style="--n:${d.count}" data-columns="${d.count}">${['Build','Review','Release','Verify'].slice(0,d.count).map((name,i)=>`<article><h3>${name}</h3>${pill(['Checked','Pending','Waiting','Not started'][i],i===0?'ok':'waiting')}<p class="muted small">${['The focused checks pass.','Morgan owns the review.','Release follows the gates.','Check the deployed flow.'][i]}</p>${meter([100,35,0,0][i],'Milestone')}</article>`).join('')}</div>`;
    case 'metrics': return `<div class="grid grid-${d.count===1?2:d.count}"${d.count===1?' style="--n:1"':''}>${[['92 s','Build duration','30 sample runs'],['1.1 GB','Peak memory','Same workload'],['1,248','Specs executed','Matches discovery'],['0','Failed checks','Focused suite only']].slice(0,d.count).map(a=>metric(...a)).join('')}</div>`;
    case 'callouts': return `<aside class="callout" style="--tone:var(${d.tone==='error'?'--ui-error':d.tone==='waiting'?'--ui-warning':'--ui-series-1'})"><div class="stack"><h3>${e(d.title)}</h3><p>${e(d.body)}</p></div></aside>`;
    case 'checklists': return `<div class="stack interactive"><div class="checklist">${['Scope confirmed','Spec inventory compared','Focused checks passed','Full CI passed','Review complete','Revision deployed','Runtime healthy','Affected flow verified'].slice(0,d.count).map((s,i)=>`<label><input type="checkbox" data-check ${i<2?'checked':''}><span>${s}</span></label>`).join('')}</div><output class="feedback" data-check-count aria-live="polite">2 of ${d.count} sample gates checked</output></div>`;
    case 'states': return d.kind==='loading'?'<div class="stack" aria-busy="true" role="status"><h3>Checking the sample results</h3><p class="muted small">The operation has started. No result is available yet.</p><div class="skeleton" aria-hidden="true"><span></span><span></span><span></span></div></div>':`<div class="stack interactive"><h3>${d.kind==='empty'?'No PRs match this filter':'The sample check could not finish'}</h3><p class="muted small">${d.kind==='empty'?'The queue is valid and empty. Change the filter to inspect another group.':'The result is unavailable. Try one local retry to inspect the recovery state.'}</p><div class="actions">${btn(d.kind==='empty'?'Reset sample filter':'Retry sample',d.kind==='empty'?'Filter reset. The example remains empty.':'retry',true)}</div>${feedback()}</div>`;
    case 'statuses': return `<div class="stack">${d.level===0?pill('Verified','ok'):d.level===1?`<div class="row">${pill('Verified','ok')}${pill('Pending','waiting')}${pill('Blocked','error')}</div>`:table(['Evidence','State'],[['Focused checks','Verified'],['Full CI','Pending'],['Released flow','Not verified']],{caption:'Keep supplied and verified evidence separate'})}${d.level>0?'<p class="muted small">Labels describe the sample state. They do not prove that a check ran.</p>':''}</div>`;
    default: throw new Error(`Unknown component family ${item.family}`);
  }
}
