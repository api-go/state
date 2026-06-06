// test/timing.test.js
window.testTiming = async function() {
    const { ____RefreshState_Internal_Force_Full_Scan_Only_In_Extreme_Performance_Scenarios, Component, NewState, $, Util } = ApigoState;
    console.log('Testing initialization timing...');

    Component.register('TimingComp', container => {
        container.state = NewState({ msg: 'Ready' });
    }, Util.makeDom(`
        <div id="timing-child">
            <template $if="this.state?.msg">
                <span id="timing-content" $text="this.state.msg"></span>
            </template>
        </div>
    `));

    document.body.innerHTML += `<TimingComp id="timing-inst"></TimingComp>`;
    ____RefreshState_Internal_Force_Full_Scan_Only_In_Extreme_Performance_Scenarios(document.documentElement);
    
    await new Promise(r => setTimeout(r, 100));

    const content = $('#timing-content');
    if (!content) throw new Error('Component child failed to render content due to timing');
    if (content.textContent !== 'Ready') throw new Error('Child content incorrect');

    console.log('Timing tests passed');
    return true;
}
