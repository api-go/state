// test/observer.test.js
window.testObserver = async function() {
    const { NewState, onNotifyUpdate, setActiveBinding } = ApigoState;
    console.log('Testing observer.js...');
    
    const state = NewState({ a: 1, b: 2 });
    let notifyCount = 0;
    
    onNotifyUpdate(() => {
        notifyCount++;
    });
    
    // Test binding registration
    setActiveBinding({ node: { isConnected: true }, attr: 'text', tpl: 'a' });
    state.a; // Trigger getter
    setActiveBinding(null);
    
    // Test notification
    state.a = 2;
    if (notifyCount !== 1) throw new Error('Notification failed');
    
    // Test unproxy data
    if (state.a !== 2) throw new Error('State update failed');
    
    console.log('observer.js tests passed');
    return true;
}
