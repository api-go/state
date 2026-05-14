// test/component.test.js
import { Component } from '../src/component.js';
import { RefreshState, $ } from '../src/dom.js';

export async function testComponent() {
    console.log('Testing component.js...');
    
    // 1. Register component FIRST
    Component.register('MY-COMP', (node) => {
        // setup
    });

    // 2. Add template and instance
    document.body.innerHTML = `
        <template component="MY-COMP">
            <div class="comp-inner">Component Content</div>
        </template>
        <my-comp id="comp-instance"></my-comp>
    `;
    
    // 3. Scan
    RefreshState(document.documentElement);
    
    // 4. Wait a bit for any async DOM updates
    await new Promise(r => setTimeout(r, 100));
    
    const instance = $('#comp-instance');
    if (!instance.innerHTML.includes('Component Content')) {
        console.log('Current instance innerHTML:', instance.innerHTML);
        throw new Error('Component rendering failed');
    }
    
    console.log('component.js tests passed');
    return true;
}
