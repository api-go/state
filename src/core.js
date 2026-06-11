// src/core.js
let _disableRunCodeError = false;

export function setDisableRunCodeError(value) {
	_disableRunCodeError = value;
}

const _fnCache = new Map();

export function _runCode(code, vars, thisObj, extendVars) {
	const allVars = { ...(extendVars || {}), ... (vars || {}) };
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
