(function () {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const color = i => `var(--ui-series-${i+1})`;
  const number = value => Number.isInteger(value) ? String(value) : value.toFixed(1);
  const text = (x,y,value,attrs='') => `<text x="${x}" y="${y}" ${attrs}>${esc(value)}</text>`;
  function renderChart(figure) {
    const data=figure.__data, svg=figure.querySelector('svg');
    const w=Math.floor(figure.getBoundingClientRect().width);
    if(w<80) return;
    let h=data.height||190;
    svg.setAttribute('height',h);
    const body=figure.closest('.tile-body');
    if(body){const minimum=data.type==='bars'?Math.min(180,data.rows.length*18+46):data.spark?80:150;h=Math.max(minimum,h-Math.max(0,body.scrollHeight-body.clientHeight));}
    svg.setAttribute('height',h); svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    if(data.type==='bars') {
      const probe=document.createElementNS(svg.namespaceURI,'text');probe.setAttribute('visibility','hidden');svg.append(probe);
      const labelWidth=Math.max(...data.rows.map(row=>{probe.textContent=row[0];return probe.getComputedTextLength();}));probe.remove();
      const left=Math.max(78,Math.ceil(labelWidth)+9), right=40, top=22, bottom=25;
      const max=Math.max(...data.rows.map(r=>r[1]))*1.12, pw=w-left-right, step=(h-top-bottom)/data.rows.length;
      let out=`<title>${esc(data.title)}. Duration in ${esc(data.unit)}. Lower is better.</title>`+text(0,12,`Duration (${data.unit})`);
      const ticks=w<290?2:3;
      for(let i=0;i<=ticks;i++) {const value=max*i/ticks,x=left+pw*i/ticks;out+=`<line class="axis" x1="${x}" x2="${x}" y1="${top}" y2="${h-bottom}"/>`+text(x,h-8,Math.round(value),'text-anchor="middle"');}
      data.rows.forEach(([label,value,series],i)=>{const y=top+step*i+step*.18,bh=Math.max(7,step*.56);out+=text(left-7,y+bh*.75,label,'text-anchor="end"')+`<rect class="bar-${series}" x="${left}" y="${y}" width="${pw*value/max}" height="${bh}" rx="2"/>`+text(left+pw*value/max+5,y+bh*.75,number(value));});
      svg.innerHTML=out; figure.__chartMetrics={width:w,height:h,marks:data.rows.length}; return;
    }
    const count=figure.__range||12;
    const series=data.series.map((s,i)=>({...s,index:i,values:s.values.slice(-count)})).filter(s=>figure.__visible[s.index]);
    const all=series.flatMap(s=>s.values), n=series[0].values.length, offset=data.series[0].values.length-n;
    const left=data.spark?1:42,right=data.spark?37:12,top=data.spark?23:27,bottom=data.spark?20:29;
    const min=data.spark?Math.min(...all)*.9:0,max=data.spark?Math.max(...all)*1.08:Math.ceil(Math.max(...all)/20)*20;
    const pw=w-left-right,ph=h-top-bottom,x=i=>left+pw*i/Math.max(1,n-1),y=v=>top+ph*(1-(v-min)/(max-min||1));
    let out=`<title>${esc(data.title)}. ${esc(data.unit)} across ${n} sample runs.</title>`;
    if(!data.spark){
      out+=text(left,12,`Duration (${data.unit})`)+`<rect class="axis" fill="none" x="${left}" y="${top}" width="${pw}" height="${ph}"/>`;
      for(let i=0;i<=4;i++){const val=min+(max-min)*i/4,py=y(val);out+=`<line class="axis" x1="${left}" x2="${w-right}" y1="${py}" y2="${py}"/>`+text(left-7,py+4,number(val),'text-anchor="end"');}
      [...new Set([0,Math.round((n-1)/3),Math.round(2*(n-1)/3),n-1])].forEach(i=>{out+=text(x(i),h-12,offset+i+1,`text-anchor="${i===0?'start':i===n-1?'end':'middle'}"`);});
      out+=text(left+pw/2,h-1,'Run','text-anchor="middle"');
    }
    series.forEach(s=>{const path=s.values.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');out+=`<path class="series-${s.index}" d="${path}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;if(data.spark){out+=text(x(0),14,s.values[0])+text(w-2,y(s.values[n-1])+4,s.values[n-1],'text-anchor="end"');}});
    out+='<g data-chart-hover></g>';
    svg.innerHTML=out;
    figure.__chartMetrics={width:w,height:h,marks:series.length,series:series.length};
    const readout=figure.querySelector('.chart-readout');
    const base=`${series.map(s=>`${s.name} ${s.values[n-1]} ${data.unit}`).join(' · ')}. Latest sample.`;
    readout.textContent=base;
    const hover=event=>{
      if(figure.__pinned && event.type!=='pointerdown')return;
      const bounds=svg.getBoundingClientRect(),px=Math.max(left,Math.min(w-right,(event.clientX-bounds.left)*w/bounds.width));
      const position=(px-left)/pw*(n-1),lo=Math.floor(position),hi=Math.min(n-1,lo+1),t=position-lo;
      let marks=`<line class="hover-guide" x1="${px}" x2="${px}" y1="${top}" y2="${h-bottom}"/>`;
      const values=series.map(s=>{const v=s.values[lo]+(s.values[hi]-s.values[lo])*t;marks+=`<circle cx="${px}" cy="${y(v)}" r="3" fill="${color(s.index)}"/>`;return `${s.name} ${v.toFixed(1)} ${data.unit}`;});
      svg.querySelector('[data-chart-hover]').innerHTML=marks;
      readout.textContent=`Run ${(offset+position+1).toFixed(1)} · ${values.join(' · ')}`;
    };
    svg.onpointermove=hover;
    svg.onpointerdown=event=>{figure.__pinned=!figure.__pinned;hover(event);};
    svg.onpointerleave=()=>{if(!figure.__pinned){svg.querySelector('[data-chart-hover]').innerHTML='';readout.textContent=base;}};
  }
  function initCharts(root) {
    root.querySelectorAll('[data-chart]').forEach(figure=>{
      if(figure.__data)return;
      figure.__data=JSON.parse(figure.dataset.chart);figure.__range=12;figure.__visible=(figure.__data.series||[]).map(()=>true);
      renderChart(figure);
      if(window.ResizeObserver){figure.__observer=new ResizeObserver(()=>renderChart(figure));figure.__observer.observe(figure);}
    });
  }
  async function copyText(value,anchor,writer) {
    const target=anchor.closest('.source,.interactive,.specimen,.t3lib');
    let output=target.querySelector('.feedback');
    if(!output){output=document.createElement('output');output.className='feedback';output.setAttribute('aria-live','polite');target.append(output);}
    try {
      const write=writer||((text)=>{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');return navigator.clipboard.writeText(text);});
      await write(value);output.textContent='Copied.';return 'copied';
    } catch {
      let box=target.querySelector('textarea[data-copy-fallback]');
      if(!box){box=document.createElement('textarea');box.dataset.copyFallback='';box.readOnly=true;box.setAttribute('aria-label','Content to copy');box.style.cssText='width:100%;min-height:90px;font:12px/1.5 var(--ui-mono);';target.append(box);}
      box.value=value;box.hidden=false;box.focus();box.select();
      output.textContent='Clipboard access is unavailable. Select and copy the text below.';return 'fallback';
    }
  }
  function downloadText(value,filename,anchor,saver) {
    const blob=new Blob([value],{type:filename.endsWith('.html')?'text/html;charset=utf-8':'text/plain;charset=utf-8'});
    if(saver)saver(blob,filename);
    else {const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    const region=anchor?.closest('.source,.interactive,.specimen,.t3lib'),output=region?.querySelector('.feedback');
    if(output)output.textContent='Download requested.';
    return {name:filename,bytes:blob.size};
  }
  function init(root=document) {
    initCharts(root);
    if(root.__t3UIBound)return;root.__t3UIBound=true;
    root.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button||button.disabled)return;
      if(button.hasAttribute('data-series')){
        const figure=button.closest('[data-chart]'),i=Number(button.dataset.series);
        if(figure.__visible.filter(Boolean).length===1 && figure.__visible[i])return;
        figure.__visible[i]=!figure.__visible[i];button.setAttribute('aria-pressed',String(figure.__visible[i]));figure.__pinned=false;renderChart(figure);return;
      }
      if(button.hasAttribute('data-range')){
        const figure=button.closest('[data-chart]');figure.__range=Number(button.dataset.range);figure.__pinned=false;
        figure.querySelectorAll('[data-range]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderChart(figure);return;
      }
      if(button.hasAttribute('data-sort-col')){
        const table=button.closest('table'),body=table.tBodies[0],column=Number(button.dataset.sortCol),th=button.closest('th');
        const ascending=th.getAttribute('aria-sort')!=='ascending';table.querySelectorAll('th').forEach(n=>n.removeAttribute('aria-sort'));th.setAttribute('aria-sort',ascending?'ascending':'descending');
        const key=row=>row.cells[column].textContent.trim();
        [...body.rows].sort((a,b)=>key(a).localeCompare(key(b),undefined,{numeric:true})*(ascending?1:-1)).forEach(row=>body.append(row));return;
      }
      const action=button.dataset.demoAction;if(!action)return;
      const region=button.closest('.interactive'),output=region?.querySelector('.feedback');
      if(action==='copy'){copyText(button.dataset.copyText||'',button);return;}
      if(action==='download'){downloadText(button.dataset.downloadText||'Sample review request.',button.dataset.downloadName||'review.txt',button);return;}
      if(action==='parallel'){
        let view=region.querySelector('.parallel-result');if(!view){view=document.createElement('div');view.className='parallel-result';region.append(view);}
        view.innerHTML=['Specs','Types'].map(label=>'<span class="pill" data-tone="active">'+(window.T3Icons?.['git-branch']||'')+'<span>'+label+'</span></span>').join('');
        if(output)output.textContent='Parallel preview.';return;
      }
      if(action==='retry'){
        button.disabled=true;button.setAttribute('aria-busy','true');if(output)output.textContent='Running…';
        queueMicrotask(()=>{button.disabled=false;button.removeAttribute('aria-busy');if(output)output.textContent='Done · demo';});return;
      }
      if(output)output.textContent=action;
    });
    root.addEventListener('input',event=>{
      if(event.target.matches('[data-table-filter]')){
        const region=event.target.closest('.interactive'),query=event.target.value.toLowerCase();let shown=0;
        region.querySelectorAll('tbody tr').forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(query);if(!row.hidden)shown++;});
        const output=region.querySelector('.feedback');if(output)output.textContent=`${shown} matching rows.`;
      }
    });
    root.addEventListener('change',event=>{
      if(event.target.matches('[data-gate]')){
        const region=event.target.closest('[data-milestone-progress]'),gates=[...region.querySelectorAll('[data-gate]')],value=Math.round(100*gates.filter(g=>g.checked).length/gates.length);
        region.querySelector('[role=progressbar]').setAttribute('aria-valuenow',value);region.querySelector('.meter-fill').style.setProperty('--value',value+'%');region.querySelector('[data-progress-label]').textContent=value+'%';
        region.querySelector('.meter').dataset.state=value===100?'complete':value===0?'idle':'working';
        const firstPending=gates.findIndex(g=>!g.checked);region.querySelectorAll('.milestones span').forEach((step,i)=>{step.classList.toggle('done',gates[i].checked);step.classList.toggle('active',i===firstPending);});
      }
      if(event.target.matches('[data-check]')){
        const region=event.target.closest('.interactive'),checks=[...region.querySelectorAll('[data-check]')];region.querySelector('[data-check-count]').textContent=`${checks.filter(c=>c.checked).length} of ${checks.length} sample gates checked`;
      }
    });
  }
  window.T3UI={init,initCharts,renderChart,copyText,downloadText};
})();
