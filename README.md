# @apigo.cc/state - AI 逻辑操作说明书

本框架基于原生 `Proxy` 和 `MutationObserver` 实现数据与 DOM 的原子级同步。采用纯原生、零 ESM、全同步加载架构。

---

## 0. 快速开始 (Quick Start)
直接在 HTML 中引入（无需打包，完全非 ESM 注入）：
```html
<script src="https://cdn.jsdelivr.net/npm/@apigo.cc/state@1.0.19/dist/state.min.js"></script>
```

---

## 1. 核心全局 API

引入后，以下接口直接挂载至 `globalThis`：

| API | 功能说明 |
| :--- | :--- |
| **`NewState(defaults, getter, setter)`** | 创建响应式状态代理对象。 |
| **`Component.register(name, setup, tpl)`** | 注册自定义组件。支持自动模板合并。 |
| **`RefreshState(node)`** | (别名 `_unsafeRefreshState`) 手动触发特定树的扫描。仅限极致性能调优。 |
| **`SetTranslator(fn)`** | 设置国际化翻译函数。 |
| **`$` / `$$`** | 增强型原生选择器（支持限定作用域）。 |
| **`Util`** | 常用工具集（`clone`, `makeDom`, `getFunctionBody` 等）。 |
| **`Hash` / `LocalStorage`** | 自动同步至 URL 或本地存储的响应式单例。 |
| **`State`** | 框架内置的全局持久化状态单例（含 `exitBlocks` 等控制位）。 |

---

## 2. 指令映射全集 (AI-Ready)

指令语法：`$attribute="code"`。作用域默认为全局，组件内优先访问 `node.state`。

### 结构化映射 (AI 强制规范)
| 指令 | 触发逻辑 | DOM 行为 | 运行约束 |
| :--- | :--- | :--- | :--- |
| **`$if`** | `Boolean(result)` | `true`: 挂载节点; `false`: 移除节点。 | **必须** 作用于 `<template>`。 |
| **`$each`** | `Iterable` | 基于 `key` 属性执行节点复用。支持 `as`, `index` 定义局部变量。 | **必须** 作用于 `<template>`。 |

**结构化指令铁律**：
1.  **标签约束**：严禁在非 `<template>` 标签上使用 `$if` 或 `$each`。
2.  **互斥约束**：严禁在同一个 `<template>` 上同时使用 `$if` 和 `$each`。若需组合，必须嵌套。

### 数据双向绑定 (`$bind`)
- **`input`, `textarea`, `select`**: 自动监听 `input/change` 事件。
- **`checkbox`**: 支持数组模式（多选）和布尔模式。
- **`[contenteditable]`**: 支持。

### 属性与 Property 绑定
- **`$text`** / **`$html`**: 映射内容。
- **`$class`**: **严格要求使用模板字符串**。范式：`class="static ${expr}"`。
- **`$.path.to.prop`**: 映射 DOM 对象或组件的 Property。
- **`$src`**: 增强 SVG 内联逻辑。
- **`$$attr`**: 二级求值（Dynamic Directives）。

---

## 3. 生命周期与事件

- **`$on[event]`**: 注入 `event`, `thisNode`, `State`, `LocalStorage`, `Hash`。
- **`$onload`** / **`$onunload`** / **`$onupdate`**: 标准生命周期钩子。

---

## 4. 运行约束 (Constraints)

1.  **零 ESM 依赖**：源码与分发包均不依赖 ESM，确保在 `<head>` 中同步加载。
2.  **数据流驱动**：严禁直接操作指令生成的 DOM，必须通过 `State` 变更驱动。
3.  **内敛化设计**：所有以下划线 `_` 开头的 API 均为内部逻辑，业务侧严禁直接调用。
