// test/merging.test.js
window.testMerging = async function() {
    const { Component, __unsafeRefreshState, $ } = ApigoState;
    console.log('Testing complex class/style merging (DataTable Resizer scenario)...');

    Component.register('Resizer-Real', container => {
        container.isVertical = true;
    }, document.createRange().createContextualFragment('<div $class="tpl-static ${this.isVertical?\'tpl-v\':\'tpl-h\'}" $style="\'color:blue\'"></div>').firstChild);

    const res = document.createElement('Resizer-Real');
    res.id = 'res-inst';
    res.className = 'ins-static';
    res.setAttribute('style', 'opacity:0.5');
    res.setAttribute('$class', "'ins-dynamic'");
    document.body.appendChild(res);
    __unsafeRefreshState(document.documentElement);
    await new Promise(r => setTimeout(r, 50));

    const inst = $('#res-inst');
    // Note: in current implementation, component root replaces the custom tag or merges?
    // Based on base project usage, it merges into the tag.
    
    const classList = Array.from(inst.classList);
    console.log('Final ClassList:', classList);
    if (!classList.includes('ins-static') || !classList.includes('tpl-static') || !classList.includes('ins-dynamic')) {
        throw new Error('Class merging failed');
    }
    const tplIndex = classList.indexOf('tpl-static');
    const insIndex = classList.indexOf('ins-static');
    if (tplIndex > insIndex) {
        throw new Error('Class merging order incorrect: tpl-static should be before ins-static');
    }

    const style = inst.getAttribute('style');
    console.log('Final Style:', style);
    if (!style.includes('color: blue') && !style.includes('color:blue')) throw new Error('Style merging failed');

    console.log('Merging test passed');
    return true;
}
