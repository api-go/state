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
    
    // 增量 5: 立即同步 Hash 字符串，确保响应式实时可见
    window.location.hash = '#' + _hashParams.toString()
})

if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', () => {
        const newParams = new URLSearchParams(window.location.hash?.substring(1) || '')
        const keys = new Set([..._hashParams.keys(), ...newParams.keys()])
        _hashParams = newParams
        keys.forEach(k => Hash[k] = Hash[k]) // 触发更新
    })
}

// localstorage 状态
export const LocalStorage = NewState({}, k => Util.safeJson(localStorage.getItem(k)), (k, v) => {
    const oldStr = localStorage.getItem(k)
    const newStr = v === undefined ? undefined : JSON.stringify(v)
    if (oldStr === newStr || (oldStr === null && newStr === undefined)) return
    v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, newStr)
})

// 增量：显式定义 State 单例
export const State = NewState({
    exitBlocks: 0
});

globalThis.Hash = Hash;
globalThis.LocalStorage = LocalStorage;
globalThis.State = State;
