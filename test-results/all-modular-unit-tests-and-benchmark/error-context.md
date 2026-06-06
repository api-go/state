# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all.spec.js >> modular unit tests and benchmark
- Location: test/all.spec.js:5:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "passed"
Received: "failed"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import fs from 'fs';
  3  | import path from 'path';
  4  | 
  5  | test('modular unit tests and benchmark', async ({ page }) => {
  6  |     page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  7  |     await page.goto('http://localhost:8081/test/index.html');
  8  |     
  9  |     await page.waitForFunction(() => window.testStatus !== undefined, { timeout: 10000 });
  10 |     const status = await page.evaluate(() => window.testStatus);
> 11 |     expect(status).toBe('passed');
     |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  12 | 
  13 |     // Read benchmarks from TEST.md
  14 |     const testMd = fs.readFileSync(path.join(process.cwd(), 'TEST.md'), 'utf-8');
  15 |     const getBench = (name) => {
  16 |         const match = testMd.match(new RegExp(`\\*\\*${name}\\*\\*\\s*\\|\\s*([\\d.]+)`));
  17 |         return match ? parseFloat(match[1]) : null;
  18 |     };
  19 |     const baseInitial = getBench('首次渲染 \\(1000 items\\)');
  20 |     const baseUpdate = getBench('浅更新 \\(Shallow Update\\)');
  21 | 
  22 |     // Benchmark: Large list rendering
  23 |     const renderTime = await page.evaluate(async () => {
  24 |         const start = performance.now();
  25 |         document.body.innerHTML = `
  26 |             <ul id="bench-list">
  27 |                 <template $each="state.benchItems" as="item">
  28 |                     <li $text="item.val"></li>
  29 |                 </template>
  30 |             </ul>
  31 |         `;
  32 |         const items = [];
  33 |         for(let i=0; i<1000; i++) items.push({val: 'item ' + i});
  34 |         window.state.benchItems = items;
  35 |         const { _unsafeRefreshState } = await import('@apigo.cc/state');
  36 |         _unsafeRefreshState(document.documentElement);
  37 |         return performance.now() - start;
  38 |     });
  39 |     console.log(`BENCHMARK: 1000 items initial render: ${renderTime.toFixed(2)}ms`);
  40 |     if (baseInitial) expect(renderTime).toBeLessThan(baseInitial * 1.2);
  41 | 
  42 |     // Benchmark: Large list update
  43 |     const updateTime = await page.evaluate(async () => {
  44 |         const start = performance.now();
  45 |         window.state.benchItems[0].val = 'updated';
  46 |         window.state.benchItems = [...window.state.benchItems]; 
  47 |         return performance.now() - start;
  48 |     });
  49 |     console.log(`BENCHMARK: 1000 items update (shallow): ${updateTime.toFixed(2)}ms`);
  50 |     if (baseUpdate) expect(updateTime).toBeLessThan(baseUpdate * 1.2);
  51 | 
  52 |     // Extreme Data Test
  53 |     await page.evaluate(async () => {
  54 |         const { _unsafeRefreshState } = await import('@apigo.cc/state');
  55 |         document.body.innerHTML = '<div id="extreme" $each="state.extreme"></div>';
  56 |         window.state.extreme = null;
  57 |         _unsafeRefreshState(document.getElementById('extreme'));
  58 |         window.state.extreme = undefined;
  59 |         window.state.extreme = { a: 1 };
  60 |         window.state.extreme = [1, 2];
  61 |         window.state.extreme = "not iterable";
  62 |     });
  63 | });
  64 | 
```