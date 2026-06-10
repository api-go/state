// test/priority.test.js
window.testPriority = async function() {
    console.log('Testing directive priorities...');
    
    // Test $if vs $text (if should hide text)
    document.body.innerHTML = '<template id="prio-tpl" $if="prioState.show"><div id="prio-test" $text="prioState.msg"></div></template>';
    const state = NewState({ show: true, msg: 'visible' });
    window.prioState = state; // Global for testing
    document.documentElement._thisObj = { state };
    globalThis._unsafeRefreshState(document.documentElement);
    
    await new Promise(r => setTimeout(r, 50)); 
    
    const node = $('#prio-test');
    if (!node) throw new Error('Priority visibility failed: node not found');
    if (node.textContent !== 'visible') throw new Error('Priority content failed: ' + node.textContent);
    
    state.show = false;
    await new Promise(r => setTimeout(r, 50));
    if ($('#prio-test')) throw new Error('Priority $if failed: node should be removed');
    
    console.log('priority.js tests passed');
    delete window.prioState;
    return true;
}
