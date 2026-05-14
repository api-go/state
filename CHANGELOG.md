# CHANGELOG

## v1.0.0 (2026-05-14)

### 修复
- 修正 `src/dom.js` 中 SVG 加载的 `fetch` 缓存参数名错误 (`cache1` -> `cache`)。
- 优化 `src/index.js` 入口逻辑，支持在 `DOMContentLoaded` 之后加载时自动初始化。

### 优化
- 完善 `playwright.config.js` 自动化测试配置，支持 `webServer`。
- `test/index.html` 引入 `importmap` 映射，实现真正的“零构建”开发体验。

### 测试
- 大幅提升 `test/dom.test.js` 测试覆盖率，涵盖 `$if`, `$each`, `$bind` 等核心指令。
- 引入性能基准测试（Benchmark），监控大规模 DOM 渲染性能。

### 文档
- 新增 `README.md` 与 `TEST.md`。
- 明确记录架构设计决策：维持“单层响应式”与“基于索引复用”列表机制，以确保极致轻量。
