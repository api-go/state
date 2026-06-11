// test/component.test.js
window.testComponent = async function() {
    const { Component, ___unsafeRefreshState, $ } = ApigoState;
    console.log('Testing component.js...');
    
    // 1. Register component
    Component.register('TestComp', container => {
        container.state.msg = 'Component Content';
    }, document.createRange().createContextualFragment('<div id="comp-inner" $text="this.state.msg"></div>').firstChild);
    
    // 2. Render component
    document.body.innerHTML = '<TestComp id="comp-inst"></TestComp>';
    ___unsafeRefreshState(document.documentElement);
    
    const instance = $('#comp-inst');
    if (!instance) throw new Error('Component instance not found');
    
    // Wait for internal scan
    await new Promise(r => setTimeout(r, 50));
    
    const inner = $('#comp-inner');
    if (!inner || inner.textContent !== 'Component Content') {
        console.log('Current instance innerHTML:', instance.innerHTML);
        throw new Error('Component rendering failed');
    }
    
    console.log('component.js tests passed');
    return true;
}
