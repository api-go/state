// test/component.test.js
window.testComponent = async function() {
    console.log('Testing component.js...');
    
    // 1. Register component
    Component.register('TestComp', container => {
        container.state.msg = 'Component Content';
    }, Util.makeDom('<div><div id="comp-inner" $text="this.state.msg"></div></div>'));
    
    // 2. Render component
    const comp = document.createElement('TestComp');
    comp.id = 'comp-inst';
    document.body.appendChild(comp);
    
    const instance = $('#comp-inst');
    if (!instance) throw new Error('Component instance not found');
    
    // Wait for async rendering via MutationObserver
    await new Promise(r => setTimeout(r, 100));
    
    const inner = $('#comp-inner');
    if (!inner || inner.textContent !== 'Component Content') {
        console.log('Current instance innerHTML:', instance.innerHTML);
        throw new Error('Component rendering failed. Inner content: ' + (inner ? inner.textContent : 'NOT FOUND'));
    }
    
    console.log('component.js tests passed');
    return true;
}
