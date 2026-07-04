// test/dom.test.js
window.testDom = async function() {
    const { __unsafeRefreshState, $, $$, NewState } = ApigoState;
    console.log('Testing dom.js...');
    
    const wait = () => new Promise(r => setTimeout(r, 10));

    // 1. Basic $text binding
    document.body.innerHTML = '<div id="test-text" $text="state.msg"></div>';
    const state = NewState({ msg: 'hello' });
    window.state = state; // TRY: 确保在非 ESM 环境下 state 全局可见
    document.documentElement._thisObj = { state };
    __unsafeRefreshState(document.documentElement);
    if ($('#test-text').textContent !== 'hello') throw new Error('$text binding failed');
    
    state.msg = 'world';
    await wait();
    if ($('#test-text').textContent !== 'world') throw new Error('$text update failed');

    // 2. $if directive
    document.body.innerHTML = '<template $if="state.show"><div id="test-if">visible</div></template>';
    state.show = false;
    __unsafeRefreshState(document.documentElement);
    if ($('#test-if')) throw new Error('$if fail: should be hidden');
    
    state.show = true;
    await wait();
    if (!$('#test-if')) throw new Error('$if fail: should be visible');

    // 3. $each directive
    document.body.innerHTML = '<template $each="state.items"><div class="test-item" $text="item"></div></template>';
    state.items = ['A', 'B'];
    __unsafeRefreshState(document.documentElement);
    await wait();
    if ($$('.test-item').length !== 2) throw new Error('$each fail: count mismatch');
    if ($$('.test-item')[0].textContent !== 'A') throw new Error('$each fail: content mismatch');

    state.items = ['A', 'B', 'C'];
    await wait();
    if ($$('.test-item').length !== 3) throw new Error('$each update fail');

    // 4. Event binding $onclick
    document.body.innerHTML = '<button id="test-click" $onclick="state.count++"></button>';
    state.count = 0;
    __unsafeRefreshState(document.documentElement);
    $('#test-click').click();
    if (state.count !== 1) throw new Error('$onclick failed');

    // 5. $bind (input)
    document.body.innerHTML = '<input id="test-bind" $bind="state.val">';
    state.val = 'init';
    __unsafeRefreshState(document.documentElement);
    await wait(); // TRY: 等待 $bind 的 setTimeout 完成
    const input = $('#test-bind');
    if (input.value !== 'init') throw new Error('$bind initial failed');
    
    input.value = 'changed';
    input.dispatchEvent(new Event('input'));
    if (state.val !== 'changed') throw new Error('$bind writeback failed');

    // 6. Double evaluation ($$ prefix)
    console.log('Testing double evaluation ($$)...');
    document.body.innerHTML = `
        <div id="double-eval-root">
            <template $$if="state.innerExp">
                <div id="inner-node">Dynamic Visible</div>
            </template>
        </div>
    `;
    const doubleState = NewState({ 
        innerExp: 'state.innerShow',
        innerShow: false 
    });
    window.state = doubleState;
    const root = $('#double-eval-root');
    root._thisObj = { state: doubleState };
    
    __unsafeRefreshState(root);
    await wait();
    if ($('#inner-node')) throw new Error('$$if failed: should be hidden initially');
    
    console.log('Enabling inner node...');
    doubleState.innerShow = true;
    __unsafeRefreshState(root);
    await wait();
    const inner = $('#inner-node');
    if (!inner) throw new Error('$$if failed: should be visible after innerShow=true');

    // 7. Nested $$if
    console.log('Testing nested $$if...');
    document.body.innerHTML = `
        <div id="nested-double-test">
            <template $if="state.outer">
                <template $$if="state.innerExp">
                    <div id="nested-inner">Nested Visible</div>
                </template>
            </template>
        </div>
    `;
    const nestedRoot = $('#nested-double-test');
    nestedRoot._thisObj = { state: doubleState };
    doubleState.outer = true;
    doubleState.innerShow = false;
    __unsafeRefreshState(nestedRoot);
    await wait();
    if ($('#nested-inner')) throw new Error('nested $$if failed: should be hidden initially');

    doubleState.innerShow = true;
    __unsafeRefreshState(nestedRoot);
    await wait();
    if (!$('#nested-inner')) throw new Error('nested $$if failed: should be visible after update');

    console.log('dom.js tests passed');
    return true;
}
