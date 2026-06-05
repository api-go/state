// src/index.js
export { NewState } from './observer.js';
export { Component } from './component.js';
export { $, $$, RefreshState, SetTranslator, _scanTree, _unbindTree } from './dom.js';
export { Util } from './utils.js';
export { Hash, LocalStorage, State } from './globals.js';

import { NewState } from './observer.js';
import { Component } from './component.js';
import { $, $$, RefreshState, SetTranslator } from './dom.js';
import { Util } from './utils.js';
import { Hash, LocalStorage, State } from './globals.js';
import { _scanTree, _unbindTree } from './dom.js';

const ApigoState = {
    NewState, Component, $, $$, RefreshState, SetTranslator, Util, Hash, LocalStorage, State
};

// 挂载到全局，支持 UMD 直接访问
if (typeof globalThis !== 'undefined') {
    Object.assign(globalThis, ApigoState);
    globalThis.ApigoState = ApigoState;
}

if (typeof document !== 'undefined') {
    const init = () => {
        Component._initPending();
        new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(newNode => {
                    if (newNode.isConnected) _scanTree(newNode);
                });
                mutation.removedNodes.forEach(oldNode => _unbindTree(oldNode));
            });
        }).observe(document.documentElement, { childList: true, subtree: true });

        _scanTree(document.documentElement);
    };

    if (document.readyState !== 'loading') init();
    else document.addEventListener('DOMContentLoaded', init, true);
}
