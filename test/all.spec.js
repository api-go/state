import { test, expect } from '@playwright/test';

test('modular unit tests and benchmark', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    await page.goto('http://localhost:8081/test/index.html');
    
    // Wait for testStatus to be set
    await page.waitForFunction(() => window.testStatus !== undefined, { timeout: 10000 });
    
    const status = await page.evaluate(() => window.testStatus);
    expect(status).toBe('passed');

    // Benchmark: Large list rendering
    const renderTime = await page.evaluate(async () => {
        const start = performance.now();
        document.body.innerHTML = `
            <ul id="bench-list">
                <template $each="state.benchItems" as="item">
                    <li $text="item.val"></li>
                </template>
            </ul>
        `;
        const items = [];
        for(let i=0; i<1000; i++) items.push({val: 'item ' + i});
        window.state.benchItems = items;
        const { RefreshState } = await import('@web/state');
        RefreshState(document.documentElement);
        return performance.now() - start;
    });
    console.log(`BENCHMARK: 1000 items initial render: ${renderTime.toFixed(2)}ms`);

    // Benchmark: Large list update
    const updateTime = await page.evaluate(async () => {
        const start = performance.now();
        window.state.benchItems[0].val = 'updated';
        // Note: Shallow proxy requires reassignment or internal trigger if we modified a deep property.
        // But here we modify benchItems[0], which is an object inside the array.
        // Our current observer.js might not catch this if it's benchItems[0] = ...
        window.state.benchItems = [...window.state.benchItems]; 
        return performance.now() - start;
    });
    console.log(`BENCHMARK: 1000 items update (shallow): ${updateTime.toFixed(2)}ms`);
});
