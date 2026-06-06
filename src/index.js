// src/index.js
export { NewState } from './observer.js';
export { Component } from './component.js';
export { $, $$, ____RefreshState_Internal_Force_Full_Scan_Only_In_Extreme_Performance_Scenarios, SetTranslator, _scanTree, _unbindTree } from './dom.js';
export { Util } from './utils.js';
export { Hash, LocalStorage, State } from './globals.js';

import { Component } from './component.js';
import { _scanTree, _unbindTree, $, $$, ____RefreshState_Internal_Force_Full_Scan_Only_In_Extreme_Performance_Scenarios, SetTranslator } from './dom.js';
import { LocalStorage, Hash, State } from './globals.js';
import { NewState, onNotifyUpdate, setActiveBinding } from './observer.js';
import { Util } from './utils.js';
import { _runCode, _returnCode } from './core.js';

const ApigoState = {
    NewState, Component, $, $$, ____RefreshState_Internal_Force_Full_Scan_Only_In_Extreme_Performance_Scenarios, SetTranslator, _scanTree, _unbindTree, Util, Hash, LocalStorage, State,
    _runCode, _returnCode, onNotifyUpdate, setActiveBinding
};

if (typeof window !== 'undefined') {
    window.ApigoState = ApigoState;
}

if (typeof document !== 'undefined') {
    const init = () => {
        // 关键修复：在启动观察器和首次扫描前，务必将所有等待中的组件模板注入 DOM！
        Component._initPending();

        const htmlNode = document.documentElement;
        if (!htmlNode.hasAttribute('$data-bs-theme') && !htmlNode.hasAttribute('data-bs-theme')) {
            htmlNode.setAttribute('$data-bs-theme', "LocalStorage.darkMode?'dark':'light'");
        }

        // 灵魂逻辑：MutationObserver 捕获所有异步 DOM 变化
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
