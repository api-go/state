/**
 * Utils Module
 * Provides Util, $, and $$ helpers.
 */

export const Util = {
    clone: globalThis.structuredClone || (obj => JSON.parse(JSON.stringify(obj))),
    base64: str => btoa(String.fromCharCode(...new TextEncoder().encode(str))),
    unbase64: str => new TextDecoder().decode(Uint8Array.from(atob(str), c => c.charCodeAt(0))),
    urlbase64: str => Util.base64(str).replace(/[+/=]/g, m => ({ '+': '-', '/': '', '=': '' }[m])),
    unurlbase64: str => Util.unbase64(str.replace(/[-_.]/g, m => ({ '-': '+', '_': '/', '.': '=' }[m])).padEnd(Math.ceil(str.length / 4) * 4, '=')),
    safeJson: str => { try { return JSON.parse(str) } catch { return null } },
    updateDefaults: (obj, defaults) => { for (const k in defaults) if (obj[k] === undefined) obj[k] = defaults[k] },
    copyFunction: (toObj, fromObj, ...funcNames) => { funcNames.forEach(name => toObj[name] = fromObj[name].bind(fromObj)) },
    getFunctionBody: fn => { const code = fn.toString(); return code.slice(code.indexOf('{') + 1, code.lastIndexOf('}')).trim() },
    makeDom: html => {
        if (html.includes('>\n')) html = html.replace(/>\s+</g, "><").trim()
        const node = document.createElement('div')
        node.innerHTML = html
        return node.children[0]
    },
    newAvg: () => {
        let total = 0, count = 0, avg = 0
        return {
            add: (v) => {
                total += v
                count++
                return avg = total / count
            },
            get: () => avg,
            clear: () => { total = 0, count = 0, avg = 0 }
        }
    },
    newTimeCount: () => {
        let startTime = 0, total = 0, count = 0
        return {
            start: () => startTime = new Date().getTime(),
            end: () => {
                const endTime = new Date().getTime()
                const left = endTime - startTime
                startTime = endTime
                total += left
                count++
                return left
            },
            avg: () => total / count
        }
    },
};

export const $ = (a, b) => b ? a.querySelector(b) : document.querySelector(a);
export const $$ = (a, b) => b ? a.querySelectorAll(b) : document.querySelectorAll(a);

// 全局挂载
globalThis.Util = Util;
globalThis.$ = $;
globalThis.$$ = $$;
