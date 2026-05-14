// src/dom-utils.js
export const $ = (a, b) => b ? a.querySelector(b) : document.querySelector(a);
export const $$ = (a, b) => b ? a.querySelectorAll(b) : document.querySelectorAll(a);
