// src/index.js
export { NewState } from './observer.js';
export { Component } from './component.js';
export { $, $$, RefreshState, SetTranslator, _scanTree, _unbindTree } from './dom.js';
export { Util } from './utils.js';
export { Hash, LocalStorage } from './globals.js';

import { Component } from './component.js';
import { _scanTree, _unbindTree } from './dom.js';
import { LocalStorage } from './globals.js';

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
