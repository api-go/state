// src/index.js
export { NewState } from './observer.js';
export { Component } from './component.js';
export { $, $$, _unsafeRefreshState as RefreshState, SetTranslator, _scanTree, _unbindTree } from './dom.js';
export { Util } from './utils.js';
export { Hash, LocalStorage, State } from './globals.js';

import { Component } from './component.js';
import { _scanTree, _unbindTree, $, $$, _unsafeRefreshState, SetTranslator } from './dom.js';
import { LocalStorage, Hash, State } from './globals.js';
import { NewState, _onNotifyUpdate, _setActiveBinding } from './observer.js';
import { Util } from './utils.js';
import { _runCode, _returnCode } from './core.js';

const ApigoState = {
    NewState, Component, $, $$, RefreshState: _unsafeRefreshState, SetTranslator, _scanTree, _unbindTree, Util, Hash, LocalStorage, State
};

globalThis.$ = $;
globalThis.$$ = $$;

if (typeof window !== 'undefined') {
    window.ApigoState = ApigoState;
}

if (typeof document !== 'undefined') {
    const init = () => {
        Component._initPending();
        const htmlNode = document.documentElement;
        if (!htmlNode.hasAttribute('$data-bs-theme') && !htmlNode.hasAttribute('data-bs-theme')) {
            htmlNode.setAttribute('$data-bs-theme', "LocalStorage.darkMode?'dark':'light'");
        }

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
