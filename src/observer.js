// src/observer.js
let _activeBinding = null;
let _noWriteBack = null;
let _updateBindingFn = null;
let _updateDepth = 0;
const MAX_UPDATE_DEPTH = 100;

export function getActiveBinding() { return _activeBinding; }
export function setActiveBinding(val) { _activeBinding = val; }
export function getNoWriteBack() { return _noWriteBack; }
export function setNoWriteBack(val) { _noWriteBack = val; }

export function onNotifyUpdate(fn) {
    _updateBindingFn = fn;
}

export function NewState(defaults = {}, getter = null, setter = null) {
    if (defaults && defaults.__watch) return defaults
    const _defaults = {};
    const _stateMappings = new Map();
    const _watchers = new Map();
    const _watchFunc = (k, cb) => {
        if (!_watchers.has(k)) _watchers.set(k, new Set());
        !cb ? _watchers.get(k).clear() : _watchers.get(k).add(cb);
    };
    const _unwatchFunc = (k, cb) => {
        if (!_watchers.has(k)) _watchers.set(k, new Set());
        _watchers.get(k).delete(cb);
    };
    const _getter = getter || (k => _defaults[k]);
    const _setter = setter || ((k, v) => _defaults[k] = v);
    Object.assign(_defaults, defaults);
    
    return new Proxy(_defaults, {
        get(target, key) {
            if (key === '__watch') return _watchFunc;
            if (key === '__unwatch') return _unwatchFunc;
            if (_activeBinding) {
                if (!_stateMappings.has(key)) _stateMappings.set(key, new Set());
                const bindingSet = _stateMappings.get(key);
                bindingSet.add(_activeBinding);
                if (!_activeBinding._sets) _activeBinding._sets = new Set();
                _activeBinding._sets.add(bindingSet);
            }
            return _getter(key);
        },
        set(target, key, value) {
            if (_getter(key) !== value) {
                _setter(key, value);
            }
            if (_watchers.has(key)) {
                _watchers.get(key).forEach(cb => {
                    const r = cb(value);
                    if (r !== undefined) {
                        value = r;
                        target[key] = value;
                    }
                });
            }
            if (_watchers.has(null)) {
                _watchers.get(null).forEach(cb => cb(value));
            }
            if (_stateMappings.has(key)) {
                if (_updateDepth > MAX_UPDATE_DEPTH) return console.error('Recursive update detected at key:', key), true;
                _updateDepth++;
                try {
                    const bindings = _stateMappings.get(key);
                    for (const binding of bindings) {
                        if (!binding.node.isConnected) {
                            bindings.delete(binding);
                            continue;
                        }
                        if (_noWriteBack !== binding.node && _updateBindingFn) {
                            _updateBindingFn(binding);
                        }
                    }
                } finally {
                    _updateDepth--;
                }
            }
            return true;
        }
    });
}
