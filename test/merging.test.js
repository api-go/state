import { Component } from '../src/component.js';
import { RefreshState, $ } from '../src/dom.js';

export async function testMerging() {
    console.log('Testing complex class/style merging (DataTable Resizer scenario)...');
    
    // 1. Resizer definition from @base
    Component.register('RESIZER-REAL', container => {
        container.isVertical = true;
    }, document.createRange().createContextualFragment(`
        <div class="tpl-static" $style="'height:10px'"></div>
    `).firstElementChild);

    // 2. Resizer usage from @dataTable
    const testContainer = document.createElement('div');
    testContainer.id = 'merging-test-root';
    testContainer.innerHTML = `
        <div id="parent">
            <resizer-real id="resizer-instance" 
                class="ins-static"
                $style="'color:blue'">
            </resizer-real>
        </div>
    `;
    document.body.appendChild(testContainer);
    
    RefreshState(testContainer);
    
    // Wait for bindings
    await new Promise(r => setTimeout(r, 50));

    const instance = $('#resizer-instance');
    const classes = Array.from(instance.classList);
    console.log('Final ClassList:', classes);
    console.log('Final Style:', instance.getAttribute('style'));

    // Verify static class merging
    if (!classes.includes('ins-static')) throw new Error('Missing ins-static');
    if (!classes.includes('tpl-static')) throw new Error('Missing tpl-static');

    // Verify style merging (Instance wins on dynamic $style, but both are preserved in logic)
    const style = instance.getAttribute('style');
    if (!style.includes('color:blue')) throw new Error('Missing instance dynamic style');

    console.log('Merging test passed');
    return true;
}
