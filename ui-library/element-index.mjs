const groups=[
  {title:'Reply composition',families:['task-progress','summaries','reports','callouts']},
  {title:'Status and progress',families:['status-panels','status-atoms','progress','statuses','checklists','states']},
  {title:'Data, sequence, and layout',families:['metrics','benchmarks','graphs','tables','timelines','layouts']},
  {title:'Communication',families:['slack','github-pr','pr-actions']},
  {title:'Actions',families:['buttons']}
];

const label=value=>String(value).replace(/[\[\]]/g,'');
const height=value=>value.charAt(0).toUpperCase()+value.slice(1);
const baseTitle=value=>String(value).replace(/ · (?:small|medium|large)$/i,'');

export function renderElementIndex(records){
  const lines=[
    '# Element index',
    '',
    'Start with [the reply guide](AGENT_GUIDE.md) for the schema and hard limits.',
    'The reply renderer accepts facts, list, table, timeline, and bars, and assigns every block the same 184px height. Use these samples for visual reference; do not copy a sample height or long copy into a reply.',
    'Pick the closest element below. Open its demo or logic, then run `node ui.mjs show <id>` for use and avoid guidance.',
    '',
    '- Elements ('+records.length+')'
  ];
  for(const group of groups){
    lines.push('  - '+group.title);
    for(const family of group.families){
      const items=records.filter(item=>item.family===family);
      if(!items.length)throw Error('Missing element family: '+family);
      lines.push('    - '+items[0].familyLabel);
      for(const item of items){
        lines.push('      - ['+label(baseTitle(item.title))+' · '+height(item.size)+' · '+height(item.height)+' tile]('+item.sourceFile+') · [logic](logic/'+item.id+'.json) — '+item.useWhen);
      }
    }
  }
  lines.push('', 'Every sample is standalone and illustrative. Use the reply CLI for main-session replies.', '');
  return lines.join('\n');
}
