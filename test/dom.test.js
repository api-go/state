// test/dom.test.js
window.testDom = async function() {
    const { __unsafeRefreshState, $, $$, Lang, NewState, SetTranslator, Component } = ApigoState;
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

    // 8. Translation bindings use synchronous source text while loading, then
    // update through the reactive Lang state without a second binding system.
    const translations = { Hello: '你好', Tooltip: '提示', Yes: '是', No: '否', Result: '结果', Shared: '共享' };
    const translationCalls = {};
    SetTranslator(text => {
        translationCalls[text] = (translationCalls[text] || 0) + 1;
        return new Promise(resolve => setTimeout(() => resolve(translations[text] || text), 5));
    });
    state.flag = true;
    state.label = '{#Result#}';
    window.state = state;
    document.documentElement._thisObj = { state };
    document.body.innerHTML = `
        <strong id="translated-text">{#Hello#}</strong>
        <button id="translated-attr" title="{#Tooltip#}"></button>
        <div id="translated-expression" $text="state.flag ? '{#Yes#}' : '{#No#}'"></div>
        <div id="translated-result" $text="state.label"></div>
        <span class="translated-shared">{#Shared#}</span><span class="translated-shared">{#Shared#}</span>
    `;
    __unsafeRefreshState(document.documentElement);
    if ($('#translated-text').textContent !== 'Hello') throw new Error('async static translation must initially use source text');
    if ($('#translated-expression').textContent !== 'Yes') throw new Error('async expression translation must initially use source text');
    await wait();
    if ($('#translated-text').textContent !== '你好') throw new Error('static text translation did not react to Lang');
    if ($('#translated-attr').title !== '提示') throw new Error('static attribute translation did not react to Lang');
    if ($('#translated-expression').textContent !== '是') throw new Error('expression translation did not react to Lang');
    if ($('#translated-result').textContent !== '结果') throw new Error('expression result translation did not react to Lang');
    if (translationCalls.Shared !== 1) throw new Error('concurrent translation requests must be deduplicated');
    Lang.Yes = '对';
    await wait();
    if ($('#translated-expression').textContent !== '对') throw new Error('direct Lang updates must refresh existing bindings');

    // A translated text node must restore its Lang subscription when the same
    // node is removed and inserted again.
    const translatedTextNode = $('#translated-text').firstChild;
    translatedTextNode.remove();
    await wait();
    $('#translated-text').appendChild(translatedTextNode);
    await wait();
    Lang.Hello = '您好';
    await wait();
    if ($('#translated-text').textContent !== '您好') throw new Error('reinserted translation text node did not restore its Lang binding');

    // A synchronous translator failure must fall back to source text and leave
    // dependency tracking usable for subsequent bindings.
    SetTranslator(() => { throw new Error('translator failure'); });
    document.body.innerHTML = '<span id="failed-translation">{#Failure#}</span><span id="tracked-translation">{#Tracked#}</span>';
    __unsafeRefreshState(document.documentElement);
    if ($('#failed-translation').textContent !== 'Failure') throw new Error('synchronous translator failure must use source text');
    Lang.Tracked = '已跟踪';
    await wait();
    if ($('#tracked-translation').textContent !== '已跟踪') throw new Error('translator failure polluted active binding tracking');

    // Native event and plain bind attributes are not translation bindings.
    document.body.innerHTML = '<div id="translation-attr-boundary" oncustom="{#Event#}" bind="{#Bind#}" aria-label="{#Label#}"></div>';
    __unsafeRefreshState(document.documentElement);
    const attrBoundary = $('#translation-attr-boundary');
    if (attrBoundary.getAttribute('oncustom') !== '{#Event#}') throw new Error('plain event attribute was consumed as a translation binding');
    if (attrBoundary.getAttribute('bind') !== '{#Bind#}') throw new Error('plain bind attribute was consumed as a translation binding');
    if (attrBoundary.getAttribute('aria-label') !== 'Label') throw new Error('ordinary static attribute translation failed');

    console.log('dom.js tests passed');
    return true;
}
