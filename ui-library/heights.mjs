export const heights = {
  slim: { label:'Slim', pixels:88, rows:1, useWhen:'One compact metric, status, or action row.', avoidWhen:'A heading, list, graph, or several controls need room.' },
  small: { label:'Small', pixels:184, rows:2, useWhen:'A brief result, a small checklist, or a few actions.', avoidWhen:'The content needs several sections or a detailed chart.' },
  medium: { label:'Medium', pixels:280, rows:3, useWhen:'A small chart, short table, or related measurements.', avoidWhen:'A full report or many rows would need continuous scrolling.' },
  tall: { label:'Tall', pixels:376, rows:4, useWhen:'A detailed graph, status panel, table, or bounded report.', avoidWhen:'A smaller preset fits the information without overflow.' }
};

export function heightFor(item) {
  const byFamily={
    'status-atoms':['slim','slim','slim'],
    'status-panels':['medium','medium','medium'],
    'benchmarks':['medium','tall','tall'],
    'graphs':['small','tall','tall'],
    'tables':['medium','tall','tall'],
    'task-progress':['medium','medium','medium'],
    'summaries':['small','small','small'],
    'reports':['tall','tall','tall'],
    'pr-actions':['medium','tall','tall'],
    'slack':['medium','tall','tall'],
    'github-pr':['medium','tall','tall'],
    'progress':['slim','small','medium'],
    'buttons':['small','small','small'],
    'timelines':['medium','tall','tall'],
    'layouts':['tall','tall','tall'],
    'metrics':['small','medium','medium'],
    'callouts':['small','small','small'],
    'checklists':['medium','medium','tall'],
    'states':['small','small','small'],
    'statuses':['slim','small','tall']
  };
  return (byFamily[item.family]||['small','medium','tall'])[['small','medium','large'].indexOf(item.size)]||'medium';
}
