(function () {
  'use strict';
  const catalog=JSON.parse(document.getElementById('t3-library-catalog').textContent);
  const root=document.querySelector('.t3lib'),grid=root.querySelector('[data-catalog-grid]');
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>window.T3Icons[name]||window.T3Icons['circle-help'];
  const familyIcons={'benchmarks':'arrow-down-right','graphs':'activity','tables':'table','task-progress':'play','summaries':'file-text','reports':'file-text','pr-actions':'git-pull-request','slack':'message-square','github-pr':'git-pull-request','progress':'activity','buttons':'send','timelines':'git-branch','layouts':'layers','metrics':'activity','callouts':'triangle-alert','checklists':'list-checks','states':'inbox','statuses':'check','status-panels':'activity','status-atoms':'activity'};
  function card(item){
    const label=item.height[0].toUpperCase()+item.height.slice(1);
    const title=item.family==='status-panels'?'Status':item.title.replace(/ · (small|medium|large)$/,'').replace(' action buttons',' actions').replace(' column arrangement',' columns');
    return '<article class="specimen" data-specimen="'+esc(item.id)+'" data-height="'+item.height+'"><header class="specimen-head"><div class="specimen-title">'+icon(familyIcons[item.family])+'<h2>'+esc(title)+'</h2></div><span class="pill">'+label+'</span></header><div class="demo tile-body">'+item.html+'</div></article>';
  }
  function render(){grid.innerHTML=catalog.map(card).join('');T3UI.initCharts(grid);}
  T3UI.init(root);render();
  if(!getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim()){
    document.body.style.background=getComputedStyle(root).getPropertyValue('--ui-canvas');document.body.style.margin='0';document.body.style.padding='16px';
  }
  async function audit(){
    const failures=[],assert=(condition,note)=>{if(!condition)failures.push(note);};
    let graphs=0,actions=0,tables=0;
    const expectedColumns=window.innerWidth<=540?1:window.innerWidth<=760?2:4;
    assert(getComputedStyle(grid).gridTemplateColumns.split(' ').length===expectedColumns,'Responsive column count');
    assert(grid.querySelectorAll('.specimen').length===catalog.length,'All examples visible');
    assert(root.querySelectorAll('select').length===0,'No dropdown filters');
    assert(!/<details|<summary/i.test(root.innerHTML),'No expandable text');
    const holder=document.createElement('div');holder.className='t3lib';holder.style.cssText='position:absolute;inset:0 auto auto 0;width:'+Math.floor(root.getBoundingClientRect().width)+'px;visibility:hidden;pointer-events:none;';document.body.append(holder);
    try {
      for(const item of catalog){
        holder.querySelectorAll('[data-chart]').forEach(n=>n.__observer?.disconnect());
        holder.innerHTML='<section class="component-tile" data-height="'+item.height+'"><div class="demo tile-body">'+item.html+'</div></section>';T3UI.initCharts(holder);
        assert(Math.abs(holder.querySelector('.component-tile').getBoundingClientRect().height-({slim:88,small:184,medium:280,tall:376}[item.height]))<1,item.id+': fixed height');
        assert(!/<details|<summary/i.test(holder.innerHTML),item.id+': expandable content');
        holder.querySelectorAll('[data-chart]').forEach(figure=>{
          graphs++;const svg=figure.querySelector('svg');assert(svg.querySelector('path,rect'),item.id+': empty chart');
          assert(Math.abs(svg.viewBox.baseVal.width-svg.getBoundingClientRect().width)<2,item.id+': chart width mismatch');
          for(const label of svg.querySelectorAll('text')){const b=label.getBBox();assert(b.x>=-2&&b.x+b.width<=svg.viewBox.baseVal.width+2&&b.y>=-3&&b.y+b.height<=svg.viewBox.baseVal.height+3,item.id+': clipped chart label '+label.textContent);}
        });
        for(const element of holder.querySelectorAll('.demo *')){
          if(element instanceof HTMLElement&&!element.closest('.table-wrap,textarea')&&element.clientWidth>0)assert(element.scrollWidth<=element.clientWidth+2,item.id+': overflow '+element.className);
        }
        T3UI.init(holder);
        const range=holder.querySelector('[data-range="6"]');if(range){range.click();assert(range.getAttribute('aria-pressed')==='true',item.id+': range control');}
        const series=holder.querySelector('[data-series="0"]');if(series){series.click();assert(series.getAttribute('aria-pressed')==='false',item.id+': series control');}
        const filter=holder.querySelector('[data-table-filter]');if(filter){tables++;filter.value='Morgan';filter.dispatchEvent(new Event('input',{bubbles:true}));assert([...holder.querySelectorAll('tbody tr')].filter(r=>!r.hidden).length===1,item.id+': filter result');}
        const sort=holder.querySelector('[data-sort-col]');if(sort){tables++;sort.click();assert(sort.closest('th').getAttribute('aria-sort')==='ascending',item.id+': sort action');}
        const draft=holder.querySelector('[data-demo-action^="Draft:"]');if(draft){actions++;draft.click();assert(holder.querySelector('.feedback').textContent.startsWith('Draft:'),item.id+': draft action');}
        const gate=holder.querySelector('[data-gate]');if(gate){gate.checked=false;gate.dispatchEvent(new Event('change',{bubbles:true}));assert(holder.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='50',item.id+': milestone progress');}
        const count=holder.querySelector('[data-button-count]');if(count)assert(count.querySelectorAll('button').length===item.data.count,item.id+': wrong button count');
        const retry=holder.querySelector('[data-demo-action="retry"]');if(retry){actions++;retry.click();assert(retry.getAttribute('aria-busy')==='true',item.id+': busy state');await Promise.resolve();assert(!retry.disabled&&holder.querySelector('.feedback').textContent.length>0,item.id+': retry state');}
        const parallel=holder.querySelector('[data-demo-action="parallel"]');if(parallel){actions++;parallel.click();assert(holder.querySelectorAll('.parallel-result .pill').length===2,item.id+': parallel preview');}
        if(item.family==='status-panels'){assert(holder.querySelectorAll('.status-tile').length===4,item.id+': status tiles');assert(holder.querySelector('[role=progressbar]'),item.id+': missing progress bar');}
      }
      holder.innerHTML='<div class="interactive"><button class="btn">Test copy fallback</button><output class="feedback"></output></div>';
      const copied=await T3UI.copyText('sample content',holder.querySelector('button'),()=>Promise.reject(new Error('Intentional audit denial')));
      assert(copied==='fallback'&&holder.querySelector('textarea').value==='sample content','Clipboard fallback');
      let downloads=0;const download=T3UI.downloadText('demo','demo.txt',holder.querySelector('button'),(blob,name)=>{downloads++;assert(blob.size===4&&name==='demo.txt','Download payload');});
      assert(downloads===1&&download.bytes===4,'Download control');
    } finally {holder.querySelectorAll('[data-chart]').forEach(n=>n.__observer?.disconnect());holder.remove();}
    assert(document.documentElement.scrollWidth<=document.documentElement.clientWidth+2,'Page horizontal overflow');
    for(const element of grid.querySelectorAll('.demo *'))if(element instanceof HTMLElement&&!element.closest('.table-wrap,textarea')&&element.clientWidth>0)assert(element.scrollWidth<=element.clientWidth+2,'Visible overflow '+element.className);
    for(const svg of grid.querySelectorAll('[data-chart] svg'))for(const label of svg.querySelectorAll('text')){const b=label.getBBox();assert(b.x>=-2&&b.x+b.width<=svg.viewBox.baseVal.width+2,'Visible chart label '+label.textContent);}
    const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);assert(new Set(ids).size===ids.length,'Duplicate IDs');
    return {width:Math.floor(root.getBoundingClientRect().width),components:catalog.length,graphs,tables,actions,failures};
  }
  window.T3Library={catalog,render,audit};
})();

