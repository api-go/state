import { Component } from '../src/component.js';
import { RefreshState, $ } from '../src/dom.js';

export async function testPriority() {
    console.log('Testing $.target priority...');
    
    let capturedTarget = null;
    Component.register('RESIZER', (container) => {
        capturedTarget = container.target;
        console.log('Component setup, target:', capturedTarget);
    });

    document.body.innerHTML = `
        <div id="parent">
            <resizer id="resizer-node" $.target="thisNode.parentNode"></resizer>
        </div>
    `;
    
    RefreshState(document.documentElement);
    
    const parent = $('#parent');

    if (capturedTarget !== parent) {
        throw new Error(`Priority issue: container.target was ${capturedTarget}, expected parent node`);
    }

    // 2. Test this. replacement
    let capturedVal = null;
    Component.register('VAL-COMP', (container) => {
        capturedVal = container.val;
        console.log('Val component setup, val:', capturedVal);
    });

    const state = { outerVal: 'hello' };
    const outer = document.createElement('div');
    outer.id = 'outer';
    outer._thisObj = state; // Rule: Set _thisObj on root before scanning if not in document
    outer.innerHTML = `<val-comp id="val-node" $.val="this.outerVal"></val-comp>`;
    
    RefreshState(outer, { thisObj: state });
    document.body.appendChild(outer);

    if (capturedVal !== 'hello') {
        throw new Error(`this. replacement failed: capturedVal was ${capturedVal}, expected 'hello'`);
    }

    console.log('Priority tests passed');
    return true;
}
