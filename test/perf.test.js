import { NewState } from '../src/observer.js'

export async function profilePerformance() {
    console.log('--- Performance Profiling ---');
    
    const count = 1000;
    const data = Array.from({ length: count }, (_, i) => ({
        id: i,
        name: 'User ' + i,
        active: i % 2 === 0,
        tags: ['a', 'b', 'c']
    }));

    // 1. Measure NewState wrapping
    const t1 = performance.now();
    const wrapped = data.map(item => NewState(item));
    const t2 = performance.now();
    console.log(`Wrapping ${count} items in NewState: ${(t2 - t1).toFixed(2)}ms`);

    // 2. Measure property access
    const t3 = performance.now();
    let sum = 0;
    for (let i = 0; i < count; i++) {
        if (wrapped[i].active) sum++;
    }
    const t4 = performance.now();
    console.log(`Accessing 'active' property on ${count} proxies: ${(t4 - t3).toFixed(2)}ms`);

    // 3. Measure update notification
    const t5 = performance.now();
    for (let i = 0; i < count; i++) {
        wrapped[i].name = 'New Name ' + i;
    }
    const t6 = performance.now();
    console.log(`Updating 'name' property on ${count} proxies: ${(t6 - t5).toFixed(2)}ms`);
}
