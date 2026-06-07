"use strict";
import {state} from './state.js';

export const COLOR_FILTER_CSS = {
  none:'',
  mono:'grayscale(100%)',
  warm:'brightness(103%) saturate(118%) sepia(12%)',
  food:'brightness(106%) saturate(132%) sepia(10%) hue-rotate(-5deg)',
  golden:'brightness(108%) saturate(125%) sepia(25%)',
  vivid:'saturate(155%) contrast(108%)',
  fade:'brightness(95%) contrast(82%) saturate(72%)',
  cool:'hue-rotate(15deg) saturate(108%) brightness(97%)',
  dramatic:'contrast(130%) saturate(78%) brightness(90%)',
  mist:'brightness(105%) contrast(88%) saturate(85%)',
  sepia:'sepia(80%)',
};

export const COLOR_FILTERS = [
  {id:'none', label:'なし'},
  {id:'mono', label:'モノクロ'},
  {id:'warm', label:'ウォーム'},
  {id:'food', label:'フード'},
  {id:'golden', label:'ゴールデン'},
  {id:'vivid', label:'ビビッド'},
  {id:'fade', label:'フェード'},
  {id:'cool', label:'クール'},
  {id:'dramatic', label:'ドラマ'},
  {id:'mist', label:'ミスト'},
  {id:'sepia', label:'セピア'},
];

let _cache = null;

export function getAdjusted(src) {
  const {brightness, contrast, saturation, colorFilter} = state.adj;
  if(_cache && _cache.src===src && _cache.b===brightness &&
     _cache.c===contrast && _cache.s===saturation && _cache.f===colorFilter)
    return _cache.result;

  const parts = [];
  if(brightness!==100) parts.push(`brightness(${brightness}%)`);
  if(contrast!==100) parts.push(`contrast(${contrast}%)`);
  if(saturation!==100) parts.push(`saturate(${saturation}%)`);
  const cfcss = COLOR_FILTER_CSS[colorFilter];
  if(cfcss) parts.push(cfcss);

  let result;
  if(!parts.length) {
    result = src;
  } else {
    const tmp = document.createElement('canvas');
    tmp.width = src.width; tmp.height = src.height;
    const tc = tmp.getContext('2d');
    tc.filter = parts.join(' ');
    tc.drawImage(src, 0, 0);
    result = tmp;
  }

  _cache = {src, b:brightness, c:contrast, s:saturation, f:colorFilter, result};
  return result;
}

export function invalidateAdjCache() { _cache = null; }

export function generateFilterThumbs(srcCanvas) {
  const TH = 60;
  const TW = Math.max(1, Math.round(TH * srcCanvas.width / srcCanvas.height));
  const base = document.createElement('canvas');
  base.width = TW; base.height = TH;
  base.getContext('2d').drawImage(srcCanvas, 0, 0, TW, TH);

  return COLOR_FILTERS.map(({id, label}) => {
    const thumb = document.createElement('canvas');
    thumb.width = TW; thumb.height = TH;
    const tc = thumb.getContext('2d');
    const css = COLOR_FILTER_CSS[id];
    if(css) { tc.filter = css; }
    tc.drawImage(base, 0, 0);
    tc.filter = 'none';
    return {id, label, thumb};
  });
}
