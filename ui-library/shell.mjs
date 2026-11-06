const json=value=>JSON.stringify(value).replaceAll('<','\\u003c');
export function renderShell(records,families) {
  return '<main class="t3lib" id="reply-library"><header class="lib-head"><div><h1>Reply library</h1><p>'+records.length+' examples · '+families.length+' types</p></div></header><section class="catalog" data-catalog-grid aria-label="Examples" style="--columns:4"></section></main><script type="application/json" id="t3-library-catalog">'+json(records)+'</script>';
}

