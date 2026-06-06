// test/foundation.test.js
window.testFoundation = async function() {
    const { RefreshState, Component, NewState, $, Util } = ApigoState;
    console.log('Testing framework foundation...');

    Component.register('NavTest', container => {
        container.state = NewState({ list: [], title: 'Initial' });
    }, Util.makeDom(`
        <div class="nav-root">
            <template $if="this.state.list.length >= 0">
                <div class="has-list-marker"></div>
            </template>
            <template $each="this.state.list" as="item">
                <div class="nav-item">
                    <template $if="item.show">
                        <div class="item-inner">
                            <span $text="item.text" class="item-text"></span>
                            <span $text="this.state.title" class="inherited-title"></span>
                        </div>
                    </template>
                </div>
            </template>
        </div>
    `));

    const inst = document.createElement('NAVTEST');
    inst.id = 'nav-inst';
    document.body.appendChild(inst);
    RefreshState(document.documentElement);
    await new Promise(r => setTimeout(r, 100));

    const nav = $('#nav-inst');
    if (!nav) throw new Error('NavTest not rendered');
    
    console.log('Updating NavTest state...');
    nav.state.title = 'UpdatedTitle';
    nav.state.list = [
        { text: 'Item 1', show: true },
        { text: 'Item 2', show: false }
    ];
    
    await new Promise(r => setTimeout(r, 100));

    const items = nav.querySelectorAll('.nav-item');
    if (items.length !== 2) throw new Error('Nested $each failed to render items');

    const item1Text = items[0].querySelector('.item-text');
    if (!item1Text || item1Text.textContent !== 'Item 1') throw new Error('Nested $if/text failed for Item 1');

    const inheritedTitle = items[0].querySelector('.inherited-title');
    if (!inheritedTitle || inheritedTitle.textContent !== 'UpdatedTitle') throw new Error('Nested $if failed to inherit this.state.title');

    console.log('Framework foundation tests passed');
    return true;
}
