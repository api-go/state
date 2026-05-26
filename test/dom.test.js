// test/dom.test.js
import { RefreshState, $, $$ } from '../src/index.js';
import { NewState } from '../src/index.js';

export async function testDom() {
    console.log('Testing dom.js...');
    
    // 1. Basic $text binding
    document.body.innerHTML = `<div id="test-node" $text="state.msg"></div>`;
    window.state = NewState({ msg: 'hello' });
    RefreshState(document.documentElement);
    const node = $('#test-node');
    if (node.textContent !== 'hello') throw new Error('$text binding failed');
    state.msg = 'world';
    if (node.textContent !== 'world') throw new Error('$text update failed');

    // 2. $if directive
    document.body.innerHTML = `
        <div id="if-test">
            <template $if="state.show">
                <span id="if-content">Visible</span>
            </template>
        </div>
    `;
    state.show = false;
    RefreshState(document.documentElement);
    if ($('#if-content')) throw new Error('$if failed: should be hidden');
    
    const wait = () => new Promise(r => setTimeout(r, 10));
    
    state.show = true;
    await wait();
    if (!$('#if-content') || $('#if-content').textContent !== 'Visible') throw new Error('$if failed: should be visible');
    
    state.show = false;
    await wait();
    if ($('#if-content')) throw new Error('$if failed: should be hidden again');

    // 3. $each directive (Index-based reuse)
    document.body.innerHTML = `
        <ul id="list-test">
            <template $each="state.items" as="item" index="i">
                <li $text="item.name"></li>
            </template>
        </ul>
    `;
    state.items = [{ name: 'A' }, { name: 'B' }];
    RefreshState(document.documentElement);
    await wait(); // Wait for MutationObserver
    let items = $$('#list-test li');
    console.log('$each items length:', items.length);
    if (items.length > 0) console.log('$each first item text:', items[0].textContent);
    if (items.length !== 2 || items[0].textContent !== 'A' || items[1].textContent !== 'B') throw new Error('$each initialization failed');
    
    const firstNode = items[0];
    state.items = [{ name: 'A-mod' }, { name: 'B' }, { name: 'C' }];
    await wait();
    items = $$('#list-test li');
    if (items.length !== 3 || items[0].textContent !== 'A-mod') throw new Error('$each update failed');
    if (items[0] !== firstNode) throw new Error('$each reuse failed: should reuse existing DOM nodes');

    state.items = [{ name: 'C' }];
    await wait();
    items = $$('#list-test li');
    if (items.length !== 1 || items[0].textContent !== 'C') throw new Error('$each removal failed');

    // 4. Two-way binding (bind)
    console.log('Testing $bind...');
    document.body.innerHTML = `<input id="input-test" $bind="state.val">`;
    window.state = NewState({ val: 'initial' });
    RefreshState(document.documentElement);
    await wait();
    const input = $('#input-test');
    if (input.value !== 'initial') throw new Error('$bind initial value failed');
    
    input.value = 'changed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (state.val !== 'changed') throw new Error('$bind write-back failed');

    // 5. Unbinding cleanup (mock check)
    // _unbindTree is called when nodes are removed via $if or $each.
    // We verify that after $if=false, the state mappings for that node are cleared.
    // This is hard to test directly without exposing internal Map, but we can check if it crashes.
    state.show = true;
    const ifNode = $('#if-content');
    state.show = false; // Trigger _unbindTree via _clearRenderedNodes -> remove() -> MutationObserver (or manual in some cases)
    
    // 6. Double evaluation ($$ prefix)
    console.log('Testing double evaluation ($$)...');
    document.body.innerHTML = `
        <div id="double-eval-root">
            <div id="inner-node" $$if="state.innerExp">Dynamic Visible</div>
        </div>
    `;
    const doubleState = NewState({ 
        innerExp: 'state.innerShow',
        innerShow: false 
    });
    window.state = doubleState;
    document.documentElement._thisObj = doubleState;
    
    RefreshState(document.documentElement);
    await wait();
    if ($('#inner-node')) throw new Error('$$if failed: should be hidden initially');
    
    console.log('Enabling inner node...');
    doubleState.innerShow = true;
    RefreshState(document.documentElement);
    await wait();
    const inner = $('#inner-node');
    if (!inner) throw new Error('$$if failed: should be visible after innerShow=true');
    console.log('Inner node visible:', inner.textContent);

    // 7. Nested $$if
    console.log('Testing nested $$if...');
    document.body.innerHTML = `
        <div id="nested-double-test">
            <template $if="state.outer">
                <div id="nested-inner" $$if="state.innerExp">Nested Visible</div>
            </template>
        </div>
    `;
    doubleState.outer = true;
    doubleState.innerShow = false;
    RefreshState(document.documentElement);
    await wait();
    if ($('#nested-inner')) throw new Error('nested $$if failed: should be hidden initially');

    doubleState.innerShow = true;
    RefreshState(document.documentElement);
    await wait();
    if (!$('#nested-inner')) throw new Error('nested $$if failed: should be visible after update');

    console.log('dom.js tests passed');
    return true;
}
