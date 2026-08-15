/**
 * Core Execution Module
 * Provides _runCode, _returnCode, and Global States.
 */

import { NewState } from './observer.js';
import { Util } from './utils.js';

let _hashParams = new URLSearchParams(typeof globalThis !== 'undefined' ? (globalThis.location?.hash?.substring(1) || '') : '');
export const Hash = NewState({}, k => Util.safeJson(_hashParams.get(k)), (k, v) => {
    const oldStr = _hashParams.get(k)
    const newStr = v === undefined ? undefined : JSON.stringify(v)
    if (oldStr === newStr || (oldStr === null && newStr === undefined)) return
    v === undefined ? _hashParams.delete(k) : _hashParams.set(k, newStr)
    globalThis.location.hash = '#' + _hashParams.toString()
});

if (typeof globalThis !== 'undefined') {
    globalThis.addEventListener('hashchange', () => {
        const newParams = new URLSearchParams(globalThis.location.hash?.substring(1) || '')
        const keys = new Set([..._hashParams.keys(), ...newParams.keys()])
        _hashParams = newParams
        keys.forEach(k => Hash[k] = Hash[k]) // 触发更新
    })
}

export const LocalStorage = NewState({}, k => Util.safeJson(localStorage.getItem(k)), (k, v) => {
    const oldStr = localStorage.getItem(k)
    const newStr = v === undefined ? undefined : JSON.stringify(v)
    if (oldStr === newStr || (oldStr === null && newStr === undefined)) return
    v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, newStr)
})

const readCookies = () => Object.fromEntries(document.cookie.split(';').map(item => {
    const index = item.indexOf('=')
    if (index < 0) return [item.trim(), '']
    return [item.slice(0, index).trim(), item.slice(index + 1)]
}).filter(([key]) => key))

export const Cookie = NewState({}, k => {
    const value = readCookies()[k]
    if (value === undefined) return undefined
    try { return Util.safeJson(decodeURIComponent(value)) }
    catch (_) { return undefined }
}, (k, v) => {
    const value = v === undefined ? '' : encodeURIComponent(JSON.stringify(v))
    const maxAge = v === undefined ? 0 : 3153600000
    document.cookie = `${k}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
})

export const Lang = NewState({})

if (Cookie.language === undefined && typeof navigator !== 'undefined') {
    Cookie.language = navigator.languages?.[0] || navigator.language || 'en-US'
}

export const State = NewState({
    exitBlocks: 0
});

// 全局挂载
globalThis.Hash = Hash;
globalThis.LocalStorage = LocalStorage;
globalThis.Cookie = Cookie;
globalThis.Lang = Lang;
globalThis.State = State;

let _disableRunCodeError = false;
export const setDisableRunCodeError = (value) => { _disableRunCodeError = value; };

const _fnCache = new Map();

export function _runCode(code, vars, thisObj, extendVars) {
    const allVars = { ...(extendVars || {}), ...(vars || {}) };
    const argKeys = Object.keys(allVars);
    const argValues = Object.values(allVars);
    const cacheKey = code + argKeys.join(',');
    try {
        let fn = _fnCache.get(cacheKey);
        if (!fn) {
            fn = new Function('Hash', 'LocalStorage', 'State', ...argKeys, code);
            _fnCache.set(cacheKey, fn);
        }
        return fn.apply(thisObj, [globalThis.Hash, globalThis.LocalStorage, globalThis.State, ...argValues]);
    } catch (e) {
        if (!_disableRunCodeError) console.error(e, extendVars, [code, extendVars, vars, thisObj]);
        return null;
    }
}

export function _returnCode(code, vars, thisObj, extendVars) {
    if (code.includes('${')) return _runCode('return `' + code + '`', vars, thisObj, extendVars);
    else return _runCode('return ' + code, vars, thisObj, extendVars);
}
