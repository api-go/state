// src/core.js
let _disableRunCodeError = false;

export function setDisableRunCodeError(value) {
    _disableRunCodeError = value;
}

export function _runCode(code, vars, thisObj, extendVars) {
    const argKeys = [...Object.keys(extendVars || {}), ...Object.keys(vars || {})];
    const argValues = [...Object.values(extendVars || {}), ...Object.values(vars || {})];
    argKeys.push(code);
    try {
        const r = new Function(...argKeys).apply(thisObj, argValues);
        return r;
    } catch (e) {
        if (!_disableRunCodeError) console.error(e, extendVars, [code, extendVars, vars, thisObj]);
        return null;
    }
}

export function _returnCode(code, vars, thisObj, extendVars) {
    if (code.includes('${')) return _runCode('return `' + code + '`', vars, thisObj, extendVars);
    else return _runCode('return ' + code, vars, thisObj, extendVars);
}
