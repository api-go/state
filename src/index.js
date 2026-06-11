import './utils.js';
import './observer.js';
import { _unbindTree, _scanTree } from './engine.js';
import './core.js';

/**
 * Entry Point
 * Orchestrates initialization and MutationObserver.
 */

if (typeof document !== 'undefined') {
    const init = () => {
        if (globalThis.Component && globalThis.Component._initPending) {
            globalThis.Component._initPending();
        }
        
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

export { NewState } from './observer.js';
export { Component, SetTranslator } from './engine.js';
export { $, $$, Util } from './utils.js';
export { Hash, LocalStorage, State } from './core.js';
export const __unsafeRefreshState = _scanTree;
