# CHANGELOG

## v1.0.1 (2026-05-15)

### 优化
- **性能**: 重构 `_unbindTree` 清理逻辑，将时间复杂度从 $O(N \cdot K \cdot B)$ 降至 $O(N \cdot B)$。1000 项更新性能提升约 60%。
- **稳定性**: 引入 `MAX_UPDATE_DEPTH` (100) 递归保护机制，防止双向绑定循环导致爆栈。
- **内存**: 优化绑定追踪机制，通过 `binding._sets` 实现更精确的依赖清理。

### 测试
- 引入 Benchmark 自动化校验，确保后续修改不会引入性能回退（>20% 容差）。
- 增加 `$each` 对极端数据（null/undefined/非 Iterable）的鲁棒性测试。

### 文档
- 完善 `TEST.md` 性能基准数据。
- 校准全案版本号一致性。

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
