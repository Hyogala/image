"use strict";
import {state, DEFAULT_STYLE} from './state.js';
import {mkField} from './exif.js';
import {scheduleDraw} from './draw.js';
import {makeSeg} from './dock.js';
import {loadPresets, storePresets, loadFramePresets, storeFramePresets,
        snapshotGlobal, snapshotFrame, applyGlobal, applyFrame, applyBuiltin} from './presets.js';

const $=id=>document.getElementById(id);

function row(label,control,sub){
  const r=document.createElement('div');r.className='srow';
  const l=document.createElement('div');l.className='lab';l.innerHTML=label+(sub?`<div class="sub">${sub}</div>`:'');
  const right=document.createElement('div');right.className='right';right.appendChild(control);
  r.appendChild(l);r.appendChild(right);return r;
}
function toggle(checked,onChange){
  const w=document.createElement('label');w.className='tg';
  w.innerHTML=`<input type="checkbox" ${checked?'checked':''}><span class="tk"></span>`;
  w.querySelector('input').addEventListener('change',e=>onChange(e.target.checked));return w;
}
function colorIn(val,onChange){
  const i=document.createElement('input');i.type='color';i.value=val;
  i.addEventListener('input',e=>onChange(e.target.value));return i;
}
function rangeRow(label,min,max,val,onChange,sub,fmt){
  const q=document.createElement('div');q.style.cssText='display:flex;gap:10px;align-items:center;';
  const r=document.createElement('input');r.type='range';r.min=min;r.max=max;r.step=(max-min)<=20?0.1:1;r.value=val;
  const rv=document.createElement('span');rv.className='rangeval';rv.textContent=fmt?fmt(val):val;
  r.addEventListener('input',e=>{const v=parseFloat(e.target.value);rv.textContent=fmt?fmt(v):v;onChange(v);});
  q.appendChild(r);q.appendChild(rv);return row(label,q,sub);
}
function fl(label,val,onInput,full,ph){
  const w=document.createElement('div');w.className='fl'+(full?' full':'');
  const l=document.createElement('label');l.textContent=label;
  const i=document.createElement('input');i.type='text';i.value=val||'';if(ph)i.placeholder=ph;
  i.addEventListener('input',e=>onInput(e.target.value));w.appendChild(l);w.appendChild(i);return w;
}

let renderCallbacks = null;
export function setRenderCallbacks(cb){renderCallbacks=cb;}

export function renderPresetUI(){
  const arr=loadPresets(), sp=$('sPresets');sp.innerHTML='';
  [['minimal','ミニマル'],['detail','詳細'],['all','全表示'],['none','全非表示']].forEach(([v,l])=>{
    const b=document.createElement('button');b.className='pchip';b.textContent=l;
    b.onclick=()=>applyBuiltin(v,renderCallbacks);sp.appendChild(b);
  });
  arr.forEach(p=>{
    const b=document.createElement('button');b.className='pchip';b.innerHTML=`${p.name}<span class="x">×</span>`;
    b.onclick=e=>{
      if(e.target.classList.contains('x')){storePresets(loadPresets().filter(x=>x.ts!==p.ts));renderPresetUI();}
      else{applyGlobal(p,renderCallbacks);toast('「'+p.name+'」を適用');}
    };sp.appendChild(b);
  });
  const add=document.createElement('button');add.className='pchip add';add.textContent='＋ 現在の設定を保存';
  add.onclick=savePresetPrompt;sp.appendChild(add);

  // Frame presets row
  const fh=$('sFramePresetsHead');
  if(fh) fh.nextElementSibling && renderFramePresetUI();

  // Populate popover
  const pop=$('popover');pop.innerHTML='<div class="ttl">プリセット</div>';
  [['minimal','ミニマル'],['detail','詳細'],['all','全表示'],['none','全非表示']].forEach(([v,l])=>{
    const b=document.createElement('button');b.textContent=l;
    b.onclick=()=>{applyBuiltin(v,renderCallbacks);pop.classList.add('hidden');};pop.appendChild(b);
  });
  if(arr.length){const d=document.createElement('div');d.className='divider';pop.appendChild(d);arr.forEach(p=>{const b=document.createElement('button');b.className='usr';b.innerHTML=`<span>${p.name}</span><span class="del">×</span>`;b.onclick=e=>{if(e.target.classList.contains('del')){storePresets(loadPresets().filter(x=>x.ts!==p.ts));renderPresetUI();}else{applyGlobal(p,renderCallbacks);pop.classList.add('hidden');}};pop.appendChild(b);});}
  const d2=document.createElement('div');d2.className='divider';pop.appendChild(d2);
  const save=document.createElement('button');save.className='save';save.textContent='＋ 現在の設定を保存';save.onclick=()=>savePresetPrompt();pop.appendChild(save);
}

function renderFramePresetUI(){
  const wrap=$('sFramePresets');if(!wrap)return;
  wrap.innerHTML='';
  const arr=loadFramePresets();
  arr.forEach(p=>{
    const b=document.createElement('button');b.className='pchip';b.innerHTML=`${p.name}<span class="x">×</span>`;
    b.onclick=e=>{
      if(e.target.classList.contains('x')){storeFramePresets(loadFramePresets().filter(x=>x.ts!==p.ts));renderFramePresetUI();}
      else{applyFrame(p,renderCallbacks);toast('フレーム「'+p.name+'」を適用');}
    };wrap.appendChild(b);
  });
  const add=document.createElement('button');add.className='pchip add';add.textContent='＋ 現在のフレームを保存';
  add.onclick=()=>{
    if(!state.image){toast('先に画像を読み込んでください');return;}
    const def='フレーム '+(arr.length+1);
    const name=(window.prompt&&window.prompt('フレームプリセット名',def))||def;
    const farr=loadFramePresets();farr.push(snapshotFrame(name.trim()||def));
    storeFramePresets(farr);renderFramePresetUI();toast('フレームプリセットを保存しました');
  };
  wrap.appendChild(add);
}

function savePresetPrompt(){
  if(!state.image){toast('先に画像を読み込んでください');return;}
  const arr=loadPresets(),def='プリセット '+(arr.length+1);
  const name=(window.prompt&&window.prompt('プリセット名',def))||def;
  arr.push(snapshotGlobal(name.trim()||def));storePresets(arr);renderPresetUI();toast('保存しました');
}

function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2400);}

export function renderStyleCard(){
  const c=$('styleCard');c.querySelectorAll('.srow').forEach(n=>n.remove());
  const s=state.style;
  c.appendChild(row('バーデザイン',makeSeg([['solid','ベタ'],['rounded','角丸'],['filmstrip','フィルム'],['gradient','グラデ']],s.barStyle,v=>{s.barStyle=v;scheduleDraw();})));
  c.appendChild(row('配置',makeSeg([['bottom','下'],['top','上']],s.position,v=>{s.position=v;scheduleDraw();})));
  c.appendChild(row('モード',makeSeg([['extend','外に追加'],['overlay','重ねる']],s.mode,v=>{s.mode=v;scheduleDraw();})));
  c.appendChild(row('フォント',makeSeg([['sans','Sans'],['serif','Serif'],['mono','Mono'],['condensed','細幅']],s.family,v=>{s.family=v;scheduleDraw();})));
  c.appendChild(row('文字色',colorIn(s.color,v=>{s.color=v;scheduleDraw();})));
  c.appendChild(row('背景色',colorIn(s.bg,v=>{s.bg=v;scheduleDraw();})));
  const lw=document.createElement('div');lw.style.cssText='display:flex;gap:10px;align-items:center;';
  lw.appendChild(toggle(s.line,v=>{s.line=v;scheduleDraw();}));lw.appendChild(colorIn(s.lineColor,v=>{s.lineColor=v;scheduleDraw();}));
  c.appendChild(row('仕切り線',lw));
  c.appendChild(rangeRow('2段の行間',0,3,s.lineGap,v=>{s.lineGap=v;scheduleDraw();},'2段表示時の上下間隔(%)',v=>v.toFixed(1)));
  const sep=document.createElement('input');sep.type='text';sep.value=s.sep;sep.style.width='120px';sep.addEventListener('input',e=>{s.sep=e.target.value;scheduleDraw();});c.appendChild(row('区切り文字',sep));
  const lab=document.createElement('div');lab.style.cssText='display:flex;gap:10px;align-items:center;';
  const sepi=document.createElement('input');sepi.type='text';sepi.value=s.labelSep;sepi.style.width='64px';sepi.className='w-narrow';sepi.addEventListener('input',e=>{s.labelSep=e.target.value;scheduleDraw();});
  lab.appendChild(toggle(s.showLabels,v=>{s.showLabels=v;scheduleDraw();}));lab.appendChild(sepi);
  c.appendChild(row('ラベル表示',lab,'ラベルと値の区切り'));
  c.appendChild(row('自動縮小',toggle(s.autofit,v=>{s.autofit=v;scheduleDraw();}),'重なり防止のため縮小'));

  // Border section
  const bHead=$('borderHead');if(bHead)bHead.parentNode.querySelectorAll('.srow.border-row').forEach(n=>n.remove());
  const addBorder=(label,key,max)=>{
    const r=rangeRow(label,0,max,s[key]||0,v=>{s[key]=v;scheduleDraw();},'%',v=>v.toFixed(1));
    r.classList.add('border-row'); return r;
  };
  const bc=$('borderCard');
  if(bc){
    bc.querySelectorAll('.srow').forEach(n=>n.remove());
    bc.appendChild(addBorder('上の枠',  'borderTop',   30));
    bc.appendChild(addBorder('下の枠',  'borderBottom',30));
    bc.appendChild(addBorder('左の枠',  'borderLeft',  30));
    bc.appendChild(addBorder('右の枠',  'borderRight', 30));
    bc.appendChild(row('枠の色',colorIn(s.borderColor||'#ffffff',v=>{s.borderColor=v;scheduleDraw();})));
  }
}

export function renderExportCard(){
  const c=$('exportCard');c.querySelectorAll('.srow').forEach(n=>n.remove());
  c.appendChild(row('形式',makeSeg([['jpeg','JPEG'],['png','PNG'],['webp','WebP']],state.out.format,v=>{state.out.format=v;if(renderCallbacks)renderCallbacks.renderTools();})));
  c.appendChild(rangeRow('画質',50,100,Math.round(state.out.quality*100),v=>{state.out.quality=v/100;},'JPEG / WebP のみ',v=>String(Math.round(v))));
  const me=document.createElement('input');me.type='number';me.min=0;me.step=100;me.value=state.out.maxEdge;me.className='w-narrow';me.placeholder='0';me.addEventListener('input',e=>{state.out.maxEdge=parseInt(e.target.value)||0;scheduleDraw();});
  c.appendChild(row('最大長辺(px)',me,'0で原寸'));
}

export function renderSettingsFields(){
  const wrap=$('sFields');wrap.innerHTML='';
  if(!state.fields.length){wrap.innerHTML='<div class="fitem" style="color:var(--muted);font-size:13px">EXIFが見つかりませんでした。カスタム項目を追加してください。</div>';return;}
  state.fields.forEach((f,idx)=>{
    const it=document.createElement('div');it.className='fitem';
    const head=document.createElement('div');head.className='fhead';
    head.appendChild(toggle(f.enabled,v=>{f.enabled=v;if(v&&!state.focusId)state.focusId=f.id;renderSettingsFields();if(renderCallbacks&&state.tab==='items')renderCallbacks.renderTools();scheduleDraw();}));
    const nm=document.createElement('div');nm.className='fname';nm.innerHTML=f.custom?`<div class="ft">カスタム項目</div><div class="fjp">自由入力</div>`:`<div class="ft">${f.name}</div>`+(f.jp?`<div class="fjp">${f.jp}</div>`:'');
    head.appendChild(nm);
    if(!f.custom){const pv=document.createElement('span');pv.className='fpv';pv.textContent=f.display||'—';head.appendChild(pv);}
    const ord=document.createElement('div');ord.className='ford';
    const up=document.createElement('button');up.textContent='▲';up.disabled=idx===0;
    const dn=document.createElement('button');dn.textContent='▼';dn.disabled=idx===state.fields.length-1;
    up.addEventListener('click',()=>move(idx,-1));dn.addEventListener('click',()=>move(idx,1));
    ord.appendChild(up);ord.appendChild(dn);head.appendChild(ord);it.appendChild(head);
    if(f.enabled){
      const d=document.createElement('div');d.className='fdetail';
      if(f.custom){d.appendChild(fl('内容',f.value,v=>{f.value=v;scheduleDraw();},true));d.appendChild(fl('ラベル名',f.label,v=>{f.label=v;scheduleDraw();}));}
      else{d.appendChild(fl('ラベル名',f.label,v=>{f.label=v;scheduleDraw();},false,f.jp||f.name));const z=document.createElement('div');z.className='fl';const zl=document.createElement('label');zl.textContent='配置';z.appendChild(zl);z.appendChild(makeSeg([['left','左'],['center','中'],['right','右']],f.zone,v=>{f.zone=v;scheduleDraw();}));d.appendChild(z);}
      d.appendChild(fl('前に付ける',f.prefix,v=>{f.prefix=v;scheduleDraw();}));d.appendChild(fl('後に付ける',f.suffix,v=>{f.suffix=v;scheduleDraw();}));
      const rw=document.createElement('div');rw.className='fl';const rl=document.createElement('label');rl.textContent='段';rw.appendChild(rl);rw.appendChild(makeSeg([[1,'1段'],[2,'2段']],f.row,v=>{f.row=v;scheduleDraw();}));d.appendChild(rw);
      if(f.custom){const z=document.createElement('div');z.className='fl';const zl=document.createElement('label');zl.textContent='配置';z.appendChild(zl);z.appendChild(makeSeg([['left','左'],['center','中'],['right','右']],f.zone,v=>{f.zone=v;scheduleDraw();}));d.appendChild(z);const rm=document.createElement('div');rm.className='fl full';const b=document.createElement('button');b.className='frm-btn';b.textContent='この項目を削除';b.addEventListener('click',()=>{state.fields=state.fields.filter(x=>x.id!==f.id);renderSettingsFields();if(renderCallbacks&&state.tab==='items')renderCallbacks.renderTools();scheduleDraw();});rm.appendChild(b);d.appendChild(rm);}
      it.appendChild(d);
    }
    wrap.appendChild(it);
  });
}

function move(idx,dir){const j=idx+dir;if(j<0||j>=state.fields.length)return;const a=state.fields;[a[idx],a[j]]=[a[j],a[idx]];renderSettingsFields();if(renderCallbacks&&state.tab==='items')renderCallbacks.renderTools();scheduleDraw();}
export function addCustom(){const f=mkField('Custom','',{custom:true,name:'Custom',jp:'',enabled:true,zone:'left',row:1,value:'',label:''});state.fields.push(f);state.focusId=f.id;renderSettingsFields();if(renderCallbacks&&state.tab==='items')renderCallbacks.renderTools();scheduleDraw();}
