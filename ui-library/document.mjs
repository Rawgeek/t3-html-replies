// One standalone example builder for the CLI, gallery, and generated files.
export function exampleDocument(item,assets) {
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const start="const root=document.querySelector('.t3lib');T3UI.init(root);if(!getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim()){document.body.style.background=getComputedStyle(root).getPropertyValue('--ui-canvas');document.body.style.margin='16px';}";
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+assets.css+'</style></head><body><main class="t3lib"><p class="muted small">Demo</p><section class="component-tile" data-height="'+escape(item.height)+'"><div class="demo tile-body">'+item.html+'</div></section></main><script>'+assets.runtime+';'+start+'<'+'/script></body></html>';
}
