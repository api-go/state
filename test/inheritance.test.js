// test/inheritance.test.js
window.testInheritance = async function() {
    console.log('Testing inheritance...');

    Component.register('MyComp', container => {
        container.state = NewState({ items: [{ name: 'A' }], title: 'CompTitle' });
    });

    const template = document.createElement('TEMPLATE');
    template.setAttribute('component', 'MYCOMP');
    template.innerHTML = `
        <div>
            <h1 $text="this.state.title" id="comp-title"></h1>
            <template $each="this.state.items" as="item">
                <div class="item-node">
                    <span $text="this.state.title" class="parent-title"></span>
                    <span $text="item.name" class="item-name"></span>
                </div>
            </template>
        </div>
    `;
    document.body.appendChild(template);

    const inst = document.createElement('MYCOMP');
    inst.id = 'comp-inst';
    document.body.appendChild(inst);
    
    globalThis._unsafeRefreshState(document.documentElement);
    await new Promise(r => setTimeout(r, 100));

    const comp = $('#comp-inst');
    if (!comp) throw new Error('Component not rendered');
    
    const h1 = $('#comp-title');
    if (h1.textContent !== 'CompTitle') throw new Error('Root level thisObj inheritance failed');

    const itemNode = document.querySelector('.item-node');
    if (!itemNode) throw new Error('Item node not rendered');

    const parentTitle = itemNode.querySelector('.parent-title');
    if (parentTitle.textContent !== 'CompTitle') throw new Error('Nested thisObj inheritance failed');

    const itemName = itemNode.querySelector('.item-name');
    if (itemName.textContent !== 'A') throw new Error('Item scope check failed');

    console.log('Inheritance tests passed');
    return true;
}
