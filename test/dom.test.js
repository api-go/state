// test/dom.test.js
window.testDom = async function() {
    const { __unsafeRefreshState, $, $$, NewState, Component } = ApigoState;
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

    // A component in a conditional branch must be initialized again after the
    // branch is removed and mounted a second time.
    let conditionalSetupCount = 0;
    Component.register('IfLifecycleProbe', node => { conditionalSetupCount++; node.probeReady = true });
    document.body.innerHTML = '<template $if="state.showComponent"><IfLifecycleProbe id="if-lifecycle-probe"></IfLifecycleProbe></template>';
    state.showComponent = true;
    __unsafeRefreshState(document.documentElement);
    await wait();
    if (!$('#if-lifecycle-probe')?.probeReady || conditionalSetupCount !== 1) throw new Error('$if component initial mount failed');
    state.showComponent = false;
    await wait();
    state.showComponent = true;
    await wait();
    if (!$('#if-lifecycle-probe')?.probeReady || conditionalSetupCount !== 2) throw new Error('$if component remount must reinitialize a fresh node');

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

    // Primitive CustomEvent details remain available through event.detail and
    // must not be expanded into invalid numeric function argument names.
    document.body.innerHTML = '<div id="test-primitive-event" $onchange="state.eventValue=event.detail"></div>';
    __unsafeRefreshState(document.documentElement);
    $('#test-primitive-event').dispatchEvent(new CustomEvent('change', { detail: 'source text' }));
    if (state.eventValue !== 'source text') throw new Error('$on event must accept primitive detail');

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

    input.value = '';
    input.dispatchEvent(new Event('input'));
    if (state.val !== '') throw new Error('$bind must preserve an empty text value');

    // 6. A select bound before its template-rendered options must retain the
    // model value instead of writing the browser-selected default back.
    document.body.innerHTML = '<select id="test-select" $bind="state.selected"><template $each="state.options"><option $text="item" $value="item"></option></template></select>';
    state.selected = 'second';
    state.options = ['first', 'second'];
    __unsafeRefreshState(document.documentElement);
    await wait();
    if ($('#test-select').value !== 'second' || state.selected !== 'second') throw new Error('$bind select must retain its value after rendering options');

    // 7. Double evaluation ($$ prefix)
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
