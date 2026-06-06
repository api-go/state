import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('modular unit tests and benchmark', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    await page.goto('http://localhost:8081/test/index.html');
    
    await page.waitForFunction(() => window.testStatus !== undefined, { timeout: 10000 });
    const status = await page.evaluate(() => window.testStatus);
    expect(status).toBe('passed');

    // Read benchmarks from TEST.md
    const testMd = fs.readFileSync(path.join(process.cwd(), 'TEST.md'), 'utf-8');
    const getBench = (name) => {
        const match = testMd.match(new RegExp(`\\*\\*${name}\\*\\*\\s*\\|\\s*([\\d.]+)`));
        return match ? parseFloat(match[1]) : null;
    };
    const baseInitial = getBench('首次渲染 \\(1000 items\\)');
    const baseUpdate = getBench('浅更新 \\(Shallow Update\\)');

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
        const { ____RefreshState_Internal_Force_Full_Scan_Only_In_Extreme_Performance_Scenarios } = await import('@apigo.cc/state');
        ____RefreshState_Internal_Force_Full_Scan_Only_In_Extreme_Performance_Scenarios(document.documentElement);
        return performance.now() - start;
    });
    console.log(`BENCHMARK: 1000 items initial render: ${renderTime.toFixed(2)}ms`);
    if (baseInitial) expect(renderTime).toBeLessThan(baseInitial * 1.2);

    // Benchmark: Large list update
    const updateTime = await page.evaluate(async () => {
        const start = performance.now();
        window.state.benchItems[0].val = 'updated';
        window.state.benchItems = [...window.state.benchItems]; 
        return performance.now() - start;
    });
    console.log(`BENCHMARK: 1000 items update (shallow): ${updateTime.toFixed(2)}ms`);
    if (baseUpdate) expect(updateTime).toBeLessThan(baseUpdate * 1.2);

    // Extreme Data Test
    await page.evaluate(async () => {
        const { ____RefreshState_Internal_Force_Full_Scan_Only_In_Extreme_Performance_Scenarios } = await import('@apigo.cc/state');
        document.body.innerHTML = '<div id="extreme" $each="state.extreme"></div>';
        window.state.extreme = null;
        ____RefreshState_Internal_Force_Full_Scan_Only_In_Extreme_Performance_Scenarios(document.getElementById('extreme'));
        window.state.extreme = undefined;
        window.state.extreme = { a: 1 };
        window.state.extreme = [1, 2];
        window.state.extreme = "not iterable";
    });
});
