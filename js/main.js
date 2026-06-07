"use strict";
import {state, DEFAULT_ADJ} from './state.js';
import {loadImage} from './exif.js';
import {canvas, draw, scheduleDraw} from './draw.js';
import {invalidateRotCache} from './draw.js';
import {invalidateAdjCache} from './filters.js';
import {pushHistory, undo, redo, resetHistory} from './history.js';
import {renderTools, initScrub, toast, updateScrubVal, setStripFromValue, curTool} from './dock.js';
import {renderPresetUI, renderStyleCard, renderExportCard, renderSettingsFields, addCustom, setRenderCallbacks} from './settings.js';

const $=id=>document.getElementById(id);

const renderCallbacks = {
  renderTools, renderStyleCard, renderExportCard, renderPresetUI, renderSettingsFields,
};
setRenderCallbacks(renderCallbacks);

function handleFile(file){
  if(!file||!file.type.startsWith('image/')){toast('画像ファイルを選択してください');return;}
  toast('読み込み中…');
  loadImage(file).then(()=>{
    $('upload').classList.add('hidden');
    canvas.classList.remove('hidden');
    toast(state.exifCount===0?'EXIFなし：カスタム項目をご利用ください':`${state.exifCount}件のメタデータを検出`);
    renderSettingsFields(); renderStyleCard(); renderExportCard(); renderPresetUI();
    resetHistory();
    renderTools(); draw();
  }).catch(()=>toast('読み込めませんでした（HEIC等は非対応の場合あり）'));
}

function showConfirm(onYes){
  const bg=$('confbg');bg.classList.remove('hidden');
  $('confYes').onclick=()=>{bg.classList.add('hidden');onYes();};
  $('confNo').onclick=()=>bg.classList.add('hidden');
  bg.onclick=e=>{if(e.target===bg)bg.classList.add('hidden');};
}

function resetToUpload(){
  state.image=null; state.fields=[]; state.focusId=null;
  state.rotate=0; Object.assign(state.adj,DEFAULT_ADJ); state.zoom=1.0; state.crop=null; state.markup=[];
  invalidateRotCache(); invalidateAdjCache();
  canvas.classList.add('hidden'); $('upload').classList.remove('hidden'); renderTools();
}

function openSheet(){renderSettingsFields();renderStyleCard();renderExportCard();renderPresetUI();$('sheet').classList.add('open');}
function closeSheet(){$('sheet').classList.remove('open');renderTools();scheduleDraw();}

function saveImage(){
  if(!state.image){toast('先に画像を追加してください');return;}
  draw();
  const type='image/'+state.out.format, ext=state.out.format==='jpeg'?'jpg':state.out.format;
  const fname=`${state.fileName}_exif.${ext}`;
  toast('書き出し中…');
  canvas.toBlob(async blob=>{
    if(!blob){toast('書き出しに失敗しました');return;}
    const url=URL.createObjectURL(blob);
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
    const isAndroid=/Android/.test(navigator.userAgent);
    if(isAndroid){
      const a=document.createElement('a');a.href=url;a.download=fname;
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),3000); toast('ダウンロードフォルダに保存しました');return;
    }
    if(isIOS){
      try{
        const f=new File([blob],fname,{type});
        if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:fname});URL.revokeObjectURL(url);return;}
      }catch(err){if(err?.name==='AbortError'){URL.revokeObjectURL(url);return;}}
    }
    showSaveOverlay(url,fname,type);
  },type,state.out.format==='png'?undefined:state.out.quality);
}

function showSaveOverlay(url,fname,type){
  const old=document.getElementById('saveov');if(old)old.remove();
  const ov=document.createElement('div');ov.className='saveov';ov.id='saveov';
  const img=document.createElement('img');img.src=url;img.alt=fname;
  const hint=document.createElement('div');hint.className='ovhint';
  hint.innerHTML='画像を長押しして <b>「写真に保存」</b><br>または下のボタンで保存できます';
  const btns=document.createElement('div');btns.className='ovbtns';
  const dl=document.createElement('a');dl.className='ovbtn';dl.href=url;dl.download=fname;dl.textContent='ダウンロード';
  const cl=document.createElement('button');cl.className='ovbtn ovclose';cl.textContent='閉じる';
  cl.onclick=()=>{ov.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  btns.append(dl,cl);ov.append(img,hint,btns);document.body.appendChild(ov);
}

function init(){
  const up=$('upload'), file=$('file');
  up.addEventListener('click',()=>file.click());
  $('btnNew').addEventListener('click',()=>{
    if(state.image){showConfirm(()=>resetToUpload());}else{file.click();}
  });
  file.addEventListener('change',e=>{if(e.target.files[0])handleFile(e.target.files[0]);file.value='';});
  ['dragenter','dragover'].forEach(ev=>up.addEventListener(ev,e=>{e.preventDefault();up.classList.add('over');}));
  ['dragleave','drop'].forEach(ev=>up.addEventListener(ev,e=>{e.preventDefault();up.classList.remove('over');}));
  $('stage').addEventListener('dragover',e=>e.preventDefault());
  $('stage').addEventListener('drop',e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);});
  window.addEventListener('paste',e=>{const it=e.clipboardData?.items;if(!it)return;for(const i of it){if(i.type.startsWith('image/')){const f=i.getAsFile();if(f){handleFile(f);break;}}}});
  $('btnSave').addEventListener('click',saveImage);
  $('btnUndo').addEventListener('click',()=>{if(!undo(()=>{scheduleDraw();renderTools();}))toast('これ以上戻れません');});
  $('btnRedo').addEventListener('click',()=>{if(!redo(()=>{scheduleDraw();renderTools();}))toast('これ以上進めません');});
  $('btnSettings').addEventListener('click',openSheet);
  $('sheetDone').addEventListener('click',closeSheet);
  $('addCustom').addEventListener('click',addCustom);
  const pop=$('popover');
  $('btnMore').addEventListener('click',e=>{e.stopPropagation();renderPresetUI();pop.classList.toggle('hidden');});
  document.addEventListener('click',e=>{if(!pop.classList.contains('hidden')&&!pop.contains(e.target)&&!e.target.closest('#btnMore'))pop.classList.add('hidden');});
  $('tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;state.tab=b.dataset.tab;[...document.querySelectorAll('.tab')].forEach(x=>x.classList.toggle('active',x===b));renderTools();});
  window.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();undo(()=>{scheduleDraw();renderTools();});}
    if((e.metaKey||e.ctrlKey)&&(e.key==='y'||(e.shiftKey&&e.key==='z'))){e.preventDefault();redo(()=>{scheduleDraw();renderTools();});}
  });
  window.addEventListener('resize',()=>{
    if(curTool&&!$('scrub').classList.contains('hidden')){setStripFromValue();updateScrubVal();}
  });
  initScrub();
  renderPresetUI(); renderTools();
}

document.addEventListener('DOMContentLoaded', init);
