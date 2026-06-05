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
- **处理链路**：正则匹配 `{# ... #}` -> 提取 Key -> 注入 `||` 后的参数值 -> 调用全局 `_translator` 函数。

---

## 6. 运行约束 (Constraints)

1.  **禁止滥用同步刷新**：`RefreshState()` 仅用于要求“同步等待 DOM 更新”的场景。知晓其会导致一次额外的渲染任务。
2.  **数据流向**：所有状态变更必须通过对 `NewState` 代理对象的赋值完成。
3.  **Key 的必要性**：在大规模数据（>100条）或复杂交互列表中，必须提供唯一 `key` 以激活节点复用逻辑。
