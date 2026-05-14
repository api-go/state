# State.js Performance Benchmark

## 测试环境
- Playwright (Headless Chromium)
- CPU: Host machine
- 模拟规模: 1000 个列表项

## 性能基准 (v1.0.0)

| 指标 | 耗时 (ms) | 备注 |
| :--- | :--- | :--- |
| **首次渲染 (1000 items)** | 59.10 | 包含模板克隆、数据绑定及 DOM 插入 |
| **浅更新 (Shallow Update)** | 7.90 | 触发 Array 重新扫描，基于索引复用 DOM 节点 |

## 核心架构设计决策 (Design Decisions)

### 1. 列表复用机制 ($each)
- **机制**: 基于索引（Index-based）的 DOM 节点复用。
- **优劣**: 避免了 Keyed Diff 的复杂度，在常规增量更新下性能极佳。在头部插入时会触发全量属性扫描，但考虑到该场景频次较低且 `_scanTree` 极快，目前不引入 Key 机制以维持极致轻量。

### 2. 响应式系统 (NewState)
- **机制**: 单层 Proxy 响应式。
- **优劣**: 极致的内存开销与初始化速度。不自动支持深层嵌套属性监听，推荐用户使用不可变（Immutable）风格或自赋值（`state.obj = { ...state.obj }`）来触发 UI 更新。

### 3. DOM 绑定与更新
- **机制**: 基于 MutationObserver 的自动生命周期管理。
- **特性**: 节点插入 DOM 后自动扫描指令，移除后自动解绑依赖，无需手动维护生命周期。
