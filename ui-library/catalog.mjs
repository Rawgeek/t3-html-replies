import { heights, heightFor } from './heights.mjs';
export const sizes = ['small', 'medium', 'large'];
export const catalog = [];
const add = (family, label, guides, data) => sizes.forEach((size, i) => catalog.push({
  id: `${family}-${size}`, family, familyLabel: label, size,
  title: `${label} · ${size}`, useWhen: guides[i][0], avoidWhen: guides[i][1],
  data: data(i, size), sample: true
}));
const trend = [48,45,46,42,39,40,36,35,34,30,31,28];
const baseline = [66,65,63,67,62,61,59,60,58,60,57,56];

add('benchmarks','Benchmarks',[
  ['Compare one measured change with a known baseline.', 'Several workloads or uncertain measurements need explanation.'],
  ['Compare typical and tail latency for one workload.', 'The distributions or test environments are not comparable.'],
  ['Review several workloads with sample counts and a decision.', 'Only one number matters or the method is still undefined.']
], i => ({
  title: ['Build duration','Request latency','Benchmark review'][i],
  unit: i === 0 ? 's' : 'ms', n: [30,5000,5000][i],
  rows: i === 0 ? [['Baseline',148,0],['Current',92,1]] : i === 1 ?
    [['p50 · baseline',42,0],['p50 · current',28,1],['p95 · baseline',118,0],['p95 · current',64,1],['p99 · baseline',221,0],['p99 · current',110,1]] :
    [['Read · baseline',66,0],['Read · current',41,1],['Write · baseline',84,0],['Write · current',67,1],['Search · baseline',188,0],['Search · current',102,1],['Export · baseline',312,0],['Export · current',248,1]],
  baseline: [148,118,188][i], current: [92,64,102][i],
  method: 'Same input, warm cache, identical runner. Each sample excludes setup time.'
}));
add('graphs','Graphs',[
  ['Show the direction of one short series beside a single metric.', 'Exact comparisons, multiple series, or uncertainty matter.'],
  ['Compare two trends on one shared scale.', 'The series have incompatible units or sampling intervals.'],
  ['Inspect several series with range controls and point details.', 'A static value or a simple comparison answers the question.']
], i => ({ title: ['Latency over 12 runs','Latency before and after','Latency by workload'][i], unit:'ms',
  spark: i === 0, detailed:i === 2, height:[100,190,250][i],
  series: i === 0 ? [{name:'Current',values:trend}] : [{name:'Baseline',values:baseline},{name:'Current',values:trend},...(i===2?[{name:'Write',values:trend.map((v,j)=>v+14+(j%3)*3)}]:[])]
}));
const tableRows = [
  ['Portal','Healthy','99.98%','32 ms','Morgan','Checked'],['Rates','Healthy','99.95%','46 ms','Riley','Checked'],
  ['Shipping','Review','99.91%','71 ms','Sam','Review'],['Search','Healthy','99.97%','38 ms','Alex','Checked'],
  ['Exports','Waiting','99.89%','184 ms','Taylor','Queue'],['Billing','Healthy','99.99%','29 ms','Jamie','Checked'],
  ['Labels','Healthy','99.96%','54 ms','Casey','Checked'],['Support','Review','99.93%','61 ms','Jordan','Review'],
  ['Inventory','Healthy','99.98%','42 ms','Robin','Checked'],['Returns','Waiting','99.92%','78 ms','Drew','Queue']
];
add('tables','Tables',[
  ['Show a few named items and one or two facts.', 'A sentence is clearer or more than three columns are needed.'],
  ['Compare a bounded set of items across several fields.', 'Rows need extensive narrative or a large filter workflow.'],
  ['Inspect a dense inventory with sorting and local filtering.', 'Phone readers only need the main finding, not the full dataset.']
], i => ({ headers:['Service','State','Availability','p95','Owner','Action'].slice(0,[3,4,6][i]), rows:tableRows.slice(0,[3,6,10][i]).map(r=>r.slice(0,[3,4,6][i])), filter:i===2 }));
add('task-progress','Task progress',[
  ['Give a quick result, next action, and continuation state.', 'The reader needs evidence or a consequential decision.'],
  ['Explain what is done, what is pending, and what happens next.', 'The task is already complete and needs only a final result.'],
  ['Hand over a task with several verified gates and one clear owner.', 'A routine update would become a long status document.']
], i => ({ level:i, title:'The fix passes its focused checks.', progress:[55,70,85][i], next:['Run the full checks','Wait for the review','Verify the released flow'][i], eta:['15-25 min estimate','Unknown until review','10-20 min estimate'][i], wake:i===1?'Example PR watch':'Not armed' }));
catalog.push({id:'summary-basic',family:'summaries',familyLabel:'Basic summary',size:'small',title:'Basic summary',sample:true,
  useWhen:'State one result and its practical effect without a full report.',avoidWhen:'The result is uncertain, blocked, or needs supporting evidence.',data:{title:'The build now uses fewer resources.',body:'Peak memory fell from 1.8 GB to 1.1 GB on the sample workload. The same tests still run.'}});
add('reports','Reports',[
  ['Explain one bounded result with evidence and the next action.', 'Only a short confirmation is needed.'],
  ['Present findings, alternatives, and unresolved work for a decision.', 'There is no decision and the evidence fits in a brief update.'],
  ['Hand over a consequential change with method, results, risks, and ownership.', 'The audience needs a fast answer and will not use the supporting material.']
], i => ({level:i,title:['Build review','Performance investigation','Comprehensive release report'][i]}));
add('pr-actions','PR action tables',[
  ['Triage two or three PRs with one next action each.', 'The work belongs to one PR and can be described directly.'],
  ['Compare ownership, review state, and checks across a small queue.', 'The queue needs repository-wide search or live automation.'],
  ['Review a larger queue and prepare explicit per-PR actions.', 'The state is stale or the user has not authorized the proposed action.']
], i => ({count:[3,5,8][i],level:i}));
add('slack','Slack messages',[
  ['Send a short factual update with one result or request.', 'The message needs caveats, evidence, or several actions.'],
  ['Share a result plus a brief explanation and one next action.', 'A one-line confirmation would do.'],
  ['Prepare an incident or handoff message with evidence and owners.', 'The channel needs a quick update rather than a full handoff.']
], i => ({level:i,text:[
  'The build fix is ready for review. The focused checks pass.',
  'The build fix is ready for review.\n\nPeak memory is 1.1 GB on the sample workload, down from 1.8 GB. The same tests still run.\n\nNext: Morgan will review the change.',
  '*Build resource update*\n\nThe fix passes the focused checks. It is not released yet.\n\n*Evidence*\n• Peak memory: 1.8 GB to 1.1 GB.\n• Runtime: 148 s to 92 s.\n• Input and runner stayed the same.\n\n*Next*\nMorgan owns review. Riley will verify the released flow after the checks pass. ETA depends on review.'
][i]}));
add('github-pr','GitHub PRs',[
  ['Describe a small change and the checks that cover it.', 'The behavior change or rollout needs context.'],
  ['Explain the problem, resulting behavior, and validation for a bounded change.', 'The change needs a migration, rollout plan, or risk analysis.'],
  ['Review a consequential change with a concrete example, risks, and rollout evidence.', 'The extra sections repeat the diff or add no useful review context.']
], i => ({level:i,title:'Reduce the test runner memory peak',text:[
  'The runner processes bounded batches so the test job stays below its memory limit.\n\nValidation: the focused suite passes.',
  'The test job exceeded its memory limit when all bundles loaded together. The runner now loads bounded batches and preserves the same test coverage.\n\n## Validation\n- The focused suite passes.\n- The sample memory peak fell from 1.8 GB to 1.1 GB.\n\n## Next\nWait for full CI and review.',
  '## Problem and result\nThe job loaded every bundle at once and exceeded its memory limit. Bounded batches keep the same tests within the limit.\n\n## Example\nThe sample peak falls from 1.8 GB to 1.1 GB. Runtime falls from 148 s to 92 s.\n\n## Validation\n- Identical spec inventory before and after.\n- Focused checks pass.\n- Full CI and review remain pending.\n\n## Risk and rollout\nThe runner could omit a batch if discovery changes. Compare the discovered and executed spec counts before release. Revert the runner change if parity fails.'
][i]}));
add('progress','Progress bars',[
  ['Show one measured completion value beside the current action.', 'The percentage is invented or elapsed time is the only evidence.'],
  ['Pair a verified milestone estimate with the work still pending.', 'The task has no stable scope or the milestone weights are unclear.'],
  ['Show completed, active, and pending gates in one task.', 'The gates belong to unrelated work or imply equal effort when that is false.']
], i => ({level:i,value:[45,70,75][i]}));
add('buttons','Button groups',[
  ['Offer one main action and one sensible alternative.', 'The agent can already take the next action autonomously.'],
  ['Offer one main action plus two distinct secondary choices.', 'The choices overlap or the primary action is unclear.'],
  ['Expose four familiar, distinct actions for a dense work item.', 'A menu or a simpler two-action choice would reduce effort.']
], i => ({count:i+2}));
add('timelines','Timelines',[
  ['Show a short completed sequence and its current point.', 'Order or time does not help explain the result.'],
  ['Explain several completed and pending steps with ownership.', 'The steps are independent and belong in a grid or table.'],
  ['Explain a handoff, blocker, and release sequence across owners.', 'A true schedule needs shared time scales and durations.']
], i => ({level:i,count:[3,5,7][i]}));
add('layouts','Column layouts',[
  ['Compare two substantial items or pair a result with evidence.', 'One item needs the full width or the columns are unrelated.'],
  ['Compare three peers with similar content density at 1024px.', 'The content is long, has wide tables, or collapses poorly on phones.'],
  ['Scan four brief peers in a dense 1024px overview.', 'The cells contain paragraphs or need more than a few metrics.']
], i => ({count:i+2}));
add('metrics','Metric groups',[
  ['Show one important measurement and its unit.', 'A standalone number hides the baseline or uncertainty.'],
  ['Compare a few related measurements with units and context.', 'The measurements use incompatible definitions.'],
  ['Scan several stable operational metrics with concise context.', 'The metric collection adds noise or needs trend analysis.']
], i => ({count:[1,3,4][i]}));
add('callouts','Callouts',[
  ['Show a small piece of information that affects the next step.', 'The note repeats the body or is merely reassuring.'],
  ['Explain a concrete caution that affects a decision.', 'The risk is hypothetical or has no practical action.'],
  ['Show a blocking failure, its effect, and the recovery action.', 'The problem is minor or can be resolved without interrupting the reader.']
], i => ({tone:['info','waiting','error'][i],title:['A review is still pending','Sample counts differ','The release check failed'][i],body:['Continue independent work while the review runs.','Compare the same input before interpreting the runtime difference.','The affected flow is not verified. Fix the failed check before claiming completion.'][i]}));
add('checklists','Checklists',[
  ['Track a few observable completion gates.', 'The items are prose, optional ideas, or cannot be checked.'],
  ['Review a bounded acceptance checklist with partial completion.', 'The list replaces a clear owner or hides dependencies.'],
  ['Inspect a detailed release gate list with evidence notes.', 'The list is too long to keep current or implies unverified proof.']
], i => ({count:[3,5,8][i]}));
add('states','Empty, loading, and error states',[
  ['Explain a valid empty result and an optional next action.', 'Data is still loading or a request actually failed.'],
  ['Represent an operation that has started and has no result yet.', 'The operation is finished, stalled, or has a known failure.'],
  ['Explain an actual failure and provide a bounded local retry.', 'The issue is a valid empty state or retries cannot help.']
], i => ({kind:['empty','loading','error'][i]}));
add('statuses','Status labels',[
  ['Label one state with text as well as color.', 'The label adds no information beyond the sentence.'],
  ['Compare several distinct states in one small work queue.', 'Every item has the same state and a single caption is clearer.'],
  ['Separate verified, pending, and blocked evidence in a handoff.', 'The labels substitute for proof or imply that a check actually ran.']
], i => ({level:i}));

for (const [name,size,title,state,progress,next,eta,wake,useWhen,avoidWhen] of [
  ['ready','small','Ready','complete','100%','None','Complete','Not needed','Show that every required gate is verified.','Only local checks pass or a release gate is still pending.'],
  ['running','medium','Running','working','62% estimate','Run the full checks','15-25 min estimate','Not armed','Show an active task with a real next action and a supported estimate.','No work is running or the percentage has no milestone basis.'],
  ['waiting','medium','Waiting','waiting','78% estimate','Finish the review','Unknown until review','Example PR watch','Show a pending gate and its confirmed continuation.','The wake is only planned or independent work can still continue.'],
  ['blocked','large','Blocked','blocked','55% estimate','Morgan: fix check','Unknown until check','Not armed','Show a concrete blocker with a named owner and recovery action.','The agent can resolve the issue within its current authority.']
]) catalog.push({id:`status-${name}`,family:'status-panels',familyLabel:'Status panels',size,title,sample:true,useWhen,avoidWhen,data:{state,progress,next,eta,wake}});

for (const [field,label,value,name,useWhen,avoidWhen] of [
  ['progress','Progress','62% est.','activity','Show one milestone estimate as a compact visual.','The scope is unclear or the percentage has no basis.'],
  ['next','Next','Review','arrow-right','Keep one immediate action visible in a dense grid.','The action needs an owner or explanation that will not fit.'],
  ['eta','ETA','15m','clock','Show a supported short time estimate.','The timing is unknown or depends on an uncertain gate.'],
  ['wake','Wake','Off','bell-off','Show whether a continuation is armed.','A scheduled wake needs a date or timezone that must stay visible.']
]) catalog.push({id:`atom-${field}`,family:'status-atoms',familyLabel:'Status atoms',size:'small',title:label,sample:true,useWhen,avoidWhen,data:{field,label,value,icon:name}});

for (const item of catalog) {
  if (item.family==='buttons') item.title=`${item.data.count} action buttons`;
  if (item.family==='layouts') item.title=`${item.data.count} column arrangement`;
  if (item.family==='reports' && item.size==='large') item.title='Comprehensive report';
  if (item.family==='states') item.title=`${item.data.kind[0].toUpperCase()+item.data.kind.slice(1)} state`;
  item.height=heightFor(item);
  item.heightUseWhen=heights[item.height].useWhen;
  item.heightAvoidWhen=heights[item.height].avoidWhen;
}
export const families = [...new Map(catalog.map(x=>[x.family,{id:x.family,label:x.familyLabel}])).values()];
