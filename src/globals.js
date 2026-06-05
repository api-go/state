// src/globals.js
import { NewState } from './observer.js';
import { Util } from './utils.js';

// url hash 状态
let _hashParams = new URLSearchParams(window.location.hash?.substring(1) || '')
export const Hash = NewState({}, k => Util.safeJson(_hashParams.get(k)), (k, v) => {
    const oldStr = _hashParams.get(k)
    const newStr = v === undefined ? undefined : JSON.stringify(v)
    if (oldStr === newStr || (oldStr === null && newStr === undefined)) return
    v === undefined ? _hashParams.delete(k) : _hashParams.set(k, newStr)
    window.location.hash = '#' + _hashParams.toString()
})

if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', () => {
        const oldHashParams = _hashParams
        _hashParams = new URLSearchParams(window.location.hash?.substring(1) || '')
        _hashParams.forEach((v, k) => { if (oldHashParams.get(k) !== v) Hash[k] = Util.safeJson(v) })
        oldHashParams.forEach((v, k) => { if (_hashParams.get(k) === undefined) Hash[k] = undefined })
    })
}

// localstorage 状态
export const LocalStorage = NewState({}, k => Util.safeJson(localStorage.getItem(k)), (k, v) => {
    const oldStr = localStorage.getItem(k)
    const newStr = v === undefined ? undefined : JSON.stringify(v)
    if (oldStr === newStr || (oldStr === null && newStr === undefined)) return
    v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, newStr)
})

// 核心全局状态机
export const State = NewState({
    exitBlocks: 0 // 默认值
});

globalThis.Hash = Hash;
globalThis.LocalStorage = LocalStorage;
globalThis.State = State;
