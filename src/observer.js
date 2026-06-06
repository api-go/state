// src/observer.js
let __activeBinding = null;
let __noWriteBack = null;

export const _getActiveBinding = () => __activeBinding;
export const _setActiveBinding = (val) => __activeBinding = val;
export const _getNoWriteBack = () => __noWriteBack;
export const _setNoWriteBack = (val) => __noWriteBack = val;

const _notifiers = new Set();
export const _onNotifyUpdate = (fn) => _notifiers.add(fn);

export function NewState(defaults = {}, getter = null, setter = null) {
    const _defaults = {};
    const _stateMappings = new Map();
    const _watchers = new Map();

    const _watchFunc = (k, cb) => {
        if (!_watchers.has(k)) _watchers.set(k, new Set());
        !cb ? _watchers.get(k).clear() : _watchers.get(k).add(cb);
        return () => _watchers.get(k).delete(cb);
    };

    const _unwatchFunc = (k, cb) => {
        if (_watchers.has(k)) _watchers.set(k, new Set());
        _watchers.get(k).delete(cb);
    };

    const __getter = getter || (k => _defaults[k]);
    const __setter = setter || ((k, v) => _defaults[k] = v);
    Object.assign(_defaults, defaults);

    return new Proxy(_defaults, {
        get(target, key) {
            if (key === '__watch') return _watchFunc;
            if (key === '__unwatch') return _unwatchFunc;
            if (key === '__isProxy') return true;

            if (__activeBinding) {
                if (!_stateMappings.has(key)) _stateMappings.set(key, new Set());
                _stateMappings.get(key).add(__activeBinding);
                if (!__activeBinding.node._states) __activeBinding.node._states = new Set();
                __activeBinding.node._states.add(_stateMappings);
            }
            return __getter(key);
        },
        set(target, key, value) {
            if (__getter(key) !== value) {
                __setter(key, value);
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
                const bindings = _stateMappings.get(key);
                for (const binding of bindings) {
                    if (!binding.node.isConnected) {
                        bindings.delete(binding);
                        continue;
                    }
                    if (__noWriteBack !== binding.node) {
                        _notifiers.forEach(fn => fn(binding));
                    }
                }
            }
            return true;
        }
    });
}
