// src/reactive.js
(function(global) {
    let __activeBinding = null;
    let __noWriteBack = null;
    const _notifiers = new Set();

    function NewState(defaults = {}, getter = null, setter = null) {
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

    // Hash state
    let _hashParams = new URLSearchParams(window.location.hash?.substring(1) || '');
    const Hash = NewState({}, k => global.Util.safeJson(_hashParams.get(k)), (k, v) => {
        const oldStr = _hashParams.get(k);
        const newStr = v === undefined ? undefined : JSON.stringify(v);
        if (oldStr === newStr || (oldStr === null && newStr === undefined)) return;
        v === undefined ? _hashParams.delete(k) : _hashParams.set(k, newStr);
        window.location.hash = '#' + _hashParams.toString();
    });

    if (typeof window !== 'undefined') {
        window.addEventListener('hashchange', () => {
            const newParams = new URLSearchParams(window.location.hash?.substring(1) || '');
            const keys = new Set([..._hashParams.keys(), ...newParams.keys()]);
            _hashParams = newParams;
            keys.forEach(k => Hash[k] = Hash[k]);
        });
    }

    // LocalStorage state
    const LocalStorage = NewState({}, k => global.Util.safeJson(localStorage.getItem(k)), (k, v) => {
        const oldStr = localStorage.getItem(k);
        const newStr = v === undefined ? undefined : JSON.stringify(v);
        if (oldStr === newStr || (oldStr === null && newStr === undefined)) return;
        v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, newStr);
    });

    // Global State instance
    const State = NewState({ exitBlocks: 0 });

    global.NewState = NewState;
    global.Hash = Hash;
    global.LocalStorage = LocalStorage;
    global.State = State;
    global._onNotifyUpdate = (fn) => _notifiers.add(fn);
    global._setActiveBinding = (val) => __activeBinding = val;
    global._getActiveBinding = () => __activeBinding;
    global._setNoWriteBack = (val) => __noWriteBack = val;
    global._getNoWriteBack = () => __noWriteBack;

    // Internal bridge (used by engine.js)
    global._reactiveBridge = {
        get activeBinding() { return __activeBinding; },
        set activeBinding(v) { __activeBinding = v; },
        get noWriteBack() { return __noWriteBack; },
        set noWriteBack(v) { __noWriteBack = v; },
        onNotifyUpdate: global._onNotifyUpdate
    };

})(globalThis);
