# @apigo.cc/state - AI 逻辑操作说明书

本框架基于原生 `Proxy` 和 `MutationObserver` 实现数据与 DOM 的原子级同步。本手册仅供 AI 构建、维护及驱动基于此引擎的应用。

---

## 1. 核心状态逻辑映射

### `NewState(defaults, getter, setter)`
*   **功能**：创建响应式代理。
*   **内部机制**：拦截所有属性读写。若属性值变更，触发所有引用该属性的 DOM 节点的更新任务（异步微任务）。
*   **扩展逻辑**：通过 `getter/setter` 拦截器可实现数据持久化（如同步至 URL Hash 或 LocalStorage）。
*   **原子操作**：
    *   `obj.__watch(key, cb)`: 建立 key -> callback 的直接依赖。
    *   `obj.__unwatch(key, cb)`: 解除依赖。

### 内置状态

- `Hash`: 与 URL Hash 同步的响应式状态。
- `LocalStorage`: 与 `localStorage` 同步的响应式状态。
- `Cookie`: 与同路径 Cookie 同步的响应式状态，默认写入 `Path=/` 并保留 100 年。`Cookie.language` 默认使用浏览器首选语言。
- `Lang`: 翻译结果的响应式缓存，以原文为键。修改 `Lang[text]` 会自动更新依赖该翻译的 binding。

---

## 2. 指令映射全集 (AI-Ready)

指令语法：`$attribute="code"`。作用域默认为全局，组件内优先访问 `node.state`。

### 结构化映射
| 指令 | 触发逻辑 | DOM 行为 |
| :--- | :--- | :--- |
| **`$if`** | `Boolean(result)` | `true`: 挂载节点; `false`: 移除节点。建议配合 `<template>`。 |
| **`$each`** | `Iterable` | 基于 `key` 属性执行节点复用。无 `key` 时按索引重建。支持 `as`, `index` 定义局部变量。 |

### 数据双向绑定 (`$bind`)
AI 必须根据不同的元素类型执行以下逻辑：
- **`input[type=text/password]`, `textarea`**: 监听 `input` 事件，同步字符串。
- **`input[type=checkbox]`**:
    - 绑定值为 `Array`: 若选中，`push(value)`（去重）；若取消，`splice(index, 1)`。
    - 绑定值为非 `Array`: 同步 `checked` 为 `true/false`。
- **`input[type=radio]`**: 选中项 `value === 绑定值` 时设置 `checked` 为 `true`。
- **`select`**: 同步选中项的 `value`。
- **`[contenteditable]`**: 监听 `input`，同步 `innerHTML`。
- **`input[type=file]`**: 同步 `files` 对象。

### 属性操作映射
- **`$text`**: 映射至 `textContent`。
- **`$html`**: 映射至 `innerHTML`。
- **`$class`**: **严格要求使用模板字符串**。范式：`class="static-name ${condition ? 'dynamic-name' : ''}"`。严禁覆盖原有类名。
- **`.path.to.prop`**: 直接映射至 DOM 对象原生属性。例如：`.style.color="'red'"` 映射为 `el.style.color = 'red'`。
- **`$src`**: 增强逻辑。若值以 `.svg` 结尾，异步 Fetch 并替换为内联 `<svg>` 节点。
- **`$$attr`**: 二级求值。`eval(eval(expr))` 逻辑，用于动态生成指令代码。

---

## 3. 生命周期与事件逻辑

- **`$on[event]`**: 映射为 `addEventListener`。注入 `event`, `thisNode`, `this`。
- **生命周期**：
    - **`$onload`**: `DOMNodeInserted` 且指令解析完成后触发。
    - **`$onunload`**: `DOMNodeRemoved` 前触发，必须用于清理定时器或外部监听。
    - **`$onupdate`**: 属性 setter 触发且渲染微任务完成后执行。

---

## 4. 组件上下文逻辑

- **初始化**：`Component.register(tagName, setupFn)`。
- **作用域隔离**：每个组件持有独立 `state`。
- **穿透访问**：通过 `this.parent` 访问父级作用域链。
- **插槽映射**：`slot="name"` (声明) -> `slot-id="name"` (宿主)。

---

## 5. 国际化 (I18n) 逻辑

- **语法结构**：`{# Key{param} || paramValue #}`。
- **处理链路**：正则匹配 `{# ... #}` -> 提取 Key -> 注入 `||` 后的参数值 -> 读取 `Lang[Key]` -> 缓存缺失时调用 translator。
- **注册翻译器**：`SetTranslator((text, args) => string | Promise<string>)`。
- **同步结果**：立即显示 translator 返回的字符串。
- **异步结果**：Promise 完成前显示原文；完成后写入 `Lang[text]`，由现有 State 依赖机制自动重新执行 binding。
- **请求去重**：异步翻译按 `Cookie.language + 原文` 去重；语言切换后，旧语言请求不会写入当前 `Lang`。
- **表达式结果**：`$text` 等指令先按原有规则求值，最终结果为包含 `{#` 的字符串时才翻译。

---

## 6. 运行约束 (Constraints)

1.  **禁止滥用同步刷新**：**严禁** 在常规开发中调用 `_unsafeRefreshState()`。该函数仅为极高性能干预（如万级数据表格）预留。
2.  **数据流向**：所有状态变更必须通过对 `NewState` 代理对象的赋值完成。
3.  **Key 的必要性**：在大规模数据（>100条）或复杂交互列表中，必须提供唯一 `key` 以激活节点复用逻辑。
