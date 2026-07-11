// test/component.test.js
window.testComponent = async function() {
    const { Component, __unsafeRefreshState, $ } = ApigoState;
    console.log('Testing component.js...');
    
    // 1. Register component
    Component.register('TestComp', container => {
        container.state.msg = 'Component Content';
    }, document.createRange().createContextualFragment('<div><div id="comp-inner" $text="this.state.msg"></div></div>').firstChild);
    
    // 2. Render component
    const comp = document.createElement('TestComp');
    comp.id = 'comp-inst';
    document.body.appendChild(comp);
    __unsafeRefreshState(document.documentElement);
    
    const instance = $('#comp-inst');
    if (!instance) throw new Error('Component instance not found');
    
    // Wait for internal scan
    await new Promise(r => setTimeout(r, 50));
    
    const inner = $('#comp-inner');
    if (!inner || inner.textContent !== 'Component Content') {
        console.log('Current instance innerHTML:', instance.innerHTML);
        throw new Error('Component rendering failed');
    }

    // Slots inside a rendering template must be projected before that template
    // is instantiated, so every rendered item receives its own slot content.
    Component.register('SlotTemplateTest', container => {
        container.state.items = ['first', 'second'];
    }, document.createRange().createContextualFragment(`
        <div>
            <template $each="this.state.items" as="item">
                <div class="row"><div slot-id="item-actions"></div></div>
            </template>
        </div>
    `).firstElementChild);

    const slotComp = document.createElement('SlotTemplateTest');
    slotComp.innerHTML = '<div slot="item-actions" class="slot-action" $text="item"></div>';
    document.body.appendChild(slotComp);
    __unsafeRefreshState(document.documentElement);
    await new Promise(r => setTimeout(r, 50));

    const slotActions = slotComp.querySelectorAll('.slot-action');
    if (slotActions.length !== 2 || [...slotActions].map(node => node.textContent).join(',') !== 'first,second') {
        throw new Error('Slots inside rendering templates failed');
    }

    // A component created from a parent $each must own `this`; its creator is
    // available through this.parent. This is the context used by AutoForm
    // field components such as TagsInput and IconPicker.
    Component.register('NestedContextChild', container => {
        container.state.label = 'child';
    }, document.createRange().createContextualFragment('<div class="nested-context" $text="this.state.label + \'-\' + this.parent.state.label"></div>').firstChild);

    Component.register('NestedContextParent', container => {
        container.state.label = 'parent';
        container.state.items = [1, 2];
    }, document.createRange().createContextualFragment('<div><template $each="this.state.items"><NestedContextChild></NestedContextChild></template></div>').firstChild);

    const contextParent = document.createElement('NestedContextParent');
    document.body.appendChild(contextParent);
    __unsafeRefreshState(document.documentElement);
    await new Promise(r => setTimeout(r, 50));

    const nestedContexts = contextParent.querySelectorAll('.nested-context');
    if (nestedContexts.length !== 2 || [...nestedContexts].some(node => node.textContent !== 'child-parent')) {
        throw new Error('Nested component this/parent context failed');
    }
    
    console.log('component.js tests passed');
    return true;
}
