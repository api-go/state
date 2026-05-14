// test/observer.test.js
import { NewState } from '../src/observer.js';

export async function testObserver() {
    console.log('Testing observer.js...');
    
    let watchTriggered = 0;
    const state = NewState({ count: 0 });
    
    state.__watch('count', (val) => {
        watchTriggered = val;
    });
    
    state.count = 10;
    if (watchTriggered !== 10) throw new Error('Watcher not triggered or value incorrect');
    if (state.count !== 10) throw new Error('State value not updated');

    // General watcher
    let generalTriggered = false;
    state.__watch(null, () => {
        generalTriggered = true;
    });
    state.count = 20;
    if (!generalTriggered) throw new Error('General watcher not triggered');

    console.log('observer.js tests passed');
    return true;
}
