"use strict";
import {state, DEFAULT_STYLE, DEFAULT_OUT, DEFAULT_ADJ, ENABLED, ZL, ZC, ORDER} from './state.js';
import {mkField, zoneFor} from './exif.js';
import {scheduleDraw} from './draw.js';
import {invalidateAdjCache} from './filters.js';
import {invalidateRotCache} from './draw.js';

const LS_KEY = 'exifstamp.presets.v3';
const LS_FRAME_KEY = 'exifstamp.framepresets.v1';

function load(key){try{return JSON.parse(localStorage.getItem(key)||'[]');}catch(e){return[];}}
function save(key,arr){try{localStorage.setItem(key,JSON.stringify(arr));}catch(e){}}

export function loadPresets(){return load(LS_KEY);}
export function loadFramePresets(){return load(LS_FRAME_KEY);}

export function storePresets(arr){save(LS_KEY,arr);}
export function storeFramePresets(arr){save(LS_FRAME_KEY,arr);}

export function snapshotGlobal(name){
  return{
    name, ts:Date.now(),
    style:{...state.style},
    out:{...state.out},
    adj:{...state.adj},
    zoom:state.zoom,
    fields:state.fields.map(f=>({key:f.key,custom:f.custom,enabled:f.enabled,zone:f.zone,row:f.row,label:f.label,prefix:f.prefix,suffix:f.suffix,value:f.value})),
  };
}

export function snapshotFrame(name){
  return{name, ts:Date.now(), style:{...state.style}};
}

export function applyGlobal(p, {renderSettingsFields, renderStyleCard, renderExportCard, renderPresetUI, renderTools}){
  Object.assign(state.style, DEFAULT_STYLE, p.style||{});
  Object.assign(state.out, DEFAULT_OUT, p.out||{});
  Object.assign(state.adj, DEFAULT_ADJ, p.adj||{});
  state.zoom=p.zoom||1.0; state.crop=null;
  invalidateAdjCache(); invalidateRotCache();
  state.fields=state.fields.filter(f=>!f.custom);
  state.fields.forEach(f=>f.enabled=false);
  (p.fields||[]).forEach(pf=>{
    if(pf.custom){state.fields.push(mkField('Custom','',{custom:true,name:'Custom',jp:'',enabled:pf.enabled,zone:pf.zone||'left',row:pf.row||1,label:pf.label||'',prefix:pf.prefix||'',suffix:pf.suffix||'',value:pf.value||''}));}
    else{const f=state.fields.find(x=>x.key===pf.key&&!x.custom);if(f){f.enabled=pf.enabled;f.zone=pf.zone||'left';f.row=pf.row||1;f.label=pf.label||'';f.prefix=pf.prefix||'';f.suffix=pf.suffix||'';}}
  });
  state.focusId=(state.fields.find(f=>f.enabled)||{}).id||null;
  renderSettingsFields(); renderStyleCard(); renderExportCard(); renderPresetUI(); renderTools();
  scheduleDraw();
}

export function applyFrame(p, {renderStyleCard, renderTools}){
  Object.assign(state.style, p.style||{});
  renderStyleCard(); renderTools(); scheduleDraw();
}

export function applyBuiltin(name, {renderSettingsFields, renderStyleCard, renderTools}){
  const on=(keys,zone,row)=>state.fields.forEach(f=>{if(keys.includes(f.key)){f.enabled=true;if(zone)f.zone=zone;f.row=row||1;}});
  if(name==='none')state.fields.forEach(f=>f.enabled=false);
  else if(name==='all')state.fields.forEach(f=>{f.enabled=true;f.row=1;});
  else if(name==='minimal'){state.fields.forEach(f=>f.enabled=false);on(['Camera'],'left');on(['FNumber','ExposureTime','ISO','FocalLength'],'right');}
  else if(name==='detail'){state.fields.forEach(f=>f.enabled=false);on(['DateTimeOriginal','Camera','Lens'],'left');on(['FNumber','ExposureTime','ISO','FocalLength'],'right');}
  state.focusId=(state.fields.find(f=>f.enabled)||{}).id||null;
  renderSettingsFields(); renderStyleCard(); renderTools(); scheduleDraw();
}
