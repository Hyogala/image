"use strict";
import {state, DEFAULT_STYLE, DEFAULT_ADJ, DEFAULT_OUT} from './state.js';
import {invalidateAdjCache} from './filters.js';

const MAX = 40;
const stack = [];
let idx = -1;

function snap() {
  return {
    adj: Object.assign({}, state.adj),
    rotate: state.rotate,
    zoom: state.zoom,
    crop: state.crop ? Object.assign({}, state.crop) : null,
    markup: state.markup.map(s => Object.assign({}, s, s.points ? {points: s.points.map(p=>Object.assign({},p))} : {})),
    style: Object.assign({}, state.style),
  };
}

function restore(s) {
  Object.assign(state.adj, s.adj);
  state.rotate = s.rotate;
  state.zoom = s.zoom;
  state.crop = s.crop ? Object.assign({}, s.crop) : null;
  state.markup = s.markup.map(ms => Object.assign({}, ms, ms.points ? {points: ms.points.map(p=>Object.assign({},p))} : {}));
  Object.assign(state.style, s.style);
  invalidateAdjCache();
}

export function pushHistory() {
  stack.splice(idx + 1);
  stack.push(snap());
  if(stack.length > MAX) stack.shift();
  idx = stack.length - 1;
}

export function undo(draw) {
  if(idx <= 0) return false;
  idx--;
  restore(stack[idx]);
  draw();
  return true;
}

export function redo(draw) {
  if(idx >= stack.length - 1) return false;
  idx++;
  restore(stack[idx]);
  draw();
  return true;
}

export function canUndo() { return idx > 0; }
export function canRedo() { return idx < stack.length - 1; }

export function resetHistory() {
  stack.length = 0;
  idx = -1;
  stack.push(snap());
  idx = 0;
}
