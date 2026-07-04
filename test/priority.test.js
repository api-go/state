// test/priority.test.js
window.testPriority = async function() {
    const { __unsafeRefreshState, $, NewState } = ApigoState;
    console.log('Testing directive priorities...');
    
    // Test $if vs $text (if should hide text)
    document.body.innerHTML = '<div id="prio-test" $if="!state.hide" $text="state.msg"></div>';
    const state = NewState({ hide: false, msg: 'visible' });
    window.state = state;
    document.documentElement._thisObj = { state };
    __unsafeRefreshState(document.documentElement);
    
    await new Promise(r => setTimeout(r, 20));
    if ($('#prio-test').textContent !== 'visible') throw new Error('Basic visibility failed');
    
    state.hide = true;
    await new Promise(r => setTimeout(r, 10));
    if ($('#prio-test')) throw new Error('Priority $if failed: node should be removed');
    
    console.log('priority.js tests passed');
    return true;
}
