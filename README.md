# State.js AI 开发指南

> ⚠️ **AI 强制指令 (AI Mandate):**
> 1. **尊重原创逻辑**：本项目（State.js）核心架构极其精炼且经过精雕细琢。**严禁擅自修改原有逻辑**（如 `_returnCode`, `_runCode`, `NewState` 等底层函数），除非你能证明修改后的质量、性能与简洁度均显著优于原版。
> 2. **禁止过度设计**：不要尝试引入复杂的编译器、多语句解析器或防御性代码。任何试图将“简单问题复杂化”的重构大概率会破坏现有结构。
> 3. **汇报与许可**：若你认为有必要修改库的核心逻辑，**必须首先向人类开发者汇报修改的必要性与潜在影响**，只有在得到明确允许后方可进行。
> 4. **回归测试**：任何改动必须通过现有 Playwright 自动化测试，确保 `DataTable` 等复杂组件场景的渲染与合并逻辑完全正常。

State.js 是基于 Vanilla JS 的无编译数据驱动 UI 框架。依赖原生 DOM 与 Proxy，通过解析 HTML `$指令` 属性映射状态。

> **核心设定：** 你是一个追求极致代码压缩和执行效率的资深极客。
> **编码原则：**
> 1. **拒绝废话变量：** 除非一个变量会被复用两次以上，否则**绝对禁止**声明临时变量。
> 2. **极致精简：** 极度偏爱链式调用（Chaining）、短路求值、三元运算符和 One-liner。能一行写完的逻辑，绝不拆成三行。
> 3. **无解释模式：** 假设你的对话者是顶尖黑客，不需要解释基础 API，不需要防御性废话，直接给出最硬核的最终代码即可。

## 一、 核心语法与指令字典

### 1\. 属性与数据绑定矩阵

| 语法 | 类型 | 解析与执行规则 |
| :--- | :--- | :--- |
| `$attr="exp"` | 动态 JS 表达式 | 映射为 HTML 属性。若包含 `\${}`，作为模板字符串计算；若不包含，作为纯 JS 表达式执行并保留返回值类型。 |
| `$$attr="exp"` | 双重计算表达式 | **二次评估机制**：首先评估 `exp` 获取字符串结果，若结果为字符串，则将其作为代码再次执行。适用于动态指令场景（如后端下发指令）。 |
| `.prop="val"` | 静态 DOM 属性 | 将字符串字面量赋值给底层 DOM 节点的 JS 属性。 |
| `$.prop="exp"` | 动态 DOM 属性 | 将 JS 执行结果赋值给底层 DOM 节点的 JS 属性。<br>**对象自动初始化**：对深层路径（如 `$.state.schema`）赋值时，若路径上的中间节点不存在，框架会自动生成空对象（`{}`）以防止报错。 |
| `$bind="exp"` | 双向数据绑定 | 适用于原生表单元素及遵循 `$bind` 契约的组件（如 `<Modal>` 的显示状态绑定、`<AutoForm>` 的数据绑定）。 |

### 2. attr绑定规范 (例如 `$style` vs `style`)
* **唯一正确写法**：动态样式强制使用 `$style` 指令，并利用模板字符串 `${}` 进行变量插值，而不是字符串拼接。
    * ❌ 不推荐：`$style="'transform:translateY(' + this.state.offsetY + 'px)'"`
    * ❌ 不推荐：`$.style.transform="'transform:translateY(' + this.state.offsetY + 'px)'"`
    * ✅ 正确：`$style="transform: translateY(\${this.state.offsetY}px);"`
* **覆盖原则**：`$style` 的优先级高于原生 `style` 属性。如果同一个节点同时存在 `$style` 和 `style`，`$style` 会**完全覆盖** `style` 的内容。因此，最佳实践是将该节点的所有静态和动态样式全部合并写在 `$style` 中。

### 3\. 控制流指令

  * **`$if="exp"`**: 动态挂载/卸载 DOM 节点（布尔值映射）。
  * **`$each="exp"`**: 遍历 Iterable 对象（Array, Object, Map, Set）。
      * **默认变量**：单层循环时，默认可直接使用隐式变量 `item`（当前项）和 `index`（索引）。
      * **嵌套约束**：当 `$each`存在嵌套时，**必须**使用 `as` 和 `index` 属性显式重命名迭代变量以防止遮蔽（Shadowing）。例：`<div $each="list" as="row" index="rowIdx">`。
      * **作用域继承**：内层循环可直接访问外层作用域的变量及组件实例上下文。

### 4\. 文本、属性与 i18n 多语言

  * **`$text="exp"`**: 将 JS 表达式结果渲染为 `textContent`。
  * **原地解析 (`$text`)**: 仅声明属性不赋值，框架会提取节点原有文本，将其中的 `\${}` 表达式进行响应式计算。
  * **i18n 多语言 (`{#...#}`)**: 
    * **自动解析**：框架在扫描 DOM 树时，会自动解析文本节点（TextNode）及静态属性（如 `placeholder`, `title`）中的 `{#...#}` 标签。
    * **SetTranslator(fn)**: 导出一个全局 API，用于设置前端翻译逻辑。若不设置，框架会自动剥离 `{# #}` 符号并保留原文。
    * **基础格式**：`{#文本#}`
    * **带参格式**：`{#模板文本{变量名1}{变量名2} || 参数1 || 参数2#}`
    * **示例**：`{#欢迎 {name} 来到 {place} || 怼怼 || 地球#}`。翻译器将接收到 `rawText="欢迎 {name} 来到 {place}"` 和 `args={name: "怼怼", place: "地球"}`。

## 二、 核心 API 导出清单

### 1. 状态管理 (Observer)
*   **`NewState(defaults: Object, getter?: Function, setter?: Function): Proxy`**
    *   创建单层响应式 Proxy。
    *   `getter(key)`: 自定义读取逻辑。
    *   `setter(key, value)`: 自定义写入逻辑。
*   **`Hash: Proxy`**
    *   映射 URL Hash 的响应式状态，修改属性将同步至 URL。
*   **`LocalStorage: Proxy`**
    *   映射 LocalStorage 的响应式状态，修改属性将持久化存储。
*   **`<State>.__watch(key: string|null, callback: Function)`**
    *   监听指定属性变化。若 `key` 为 `null`，则监听所有属性变化。
*   **`<State>.__unwatch(key: string, callback: Function)`**
    *   取消监听。

### 2. 系统 API (Global)
*   **`RefreshState(node: HTMLElement)`**
    *   手动触发指定节点及其子树的指令扫描与绑定。
*   **`SetTranslator(fn: (rawText: string, args: Object) => string)`**
    *   设置全局 i18n 翻译器。

### 3. 组件系统 (Component)
*   **`Component.register(name: string, setupFunc: Function, template?: HTMLElement)`**
    *   注册自定义组件。
    *   `setupFunc(container)`: 组件逻辑初始化入口。
    *   `template`: 组件的 DOM 模板。

### 4. 工具类 (Util)
*   **`Util.makeDom(html: string): HTMLElement`**: HTML 字符串转 DOM。
*   **`Util.copyFunction(to: Object, from: Object, ...names: string[])`**: 批量绑定方法。
*   **`Util.safeJson(str: string): any`**: 安全解析 JSON。

### 5. DOM 查询
*   **`$(selector: string, context?: HTMLElement): HTMLElement`**: querySelector 封装。
*   **`$$(selector: string, context?: HTMLElement): NodeList`**: querySelectorAll 封装。


## 三、 自定义组件开发约束 (SOP)

### 1\. 组件模板转义规则 (Template Literal Escaping)

由于模板使用 JS 字符串声明，若模板内部需使用框架的 `\${}` 语法绑定动态属性，**必须进行反斜杠转义 (`\${...}`)**，防止被原生 JS 提前求值。

  * **正确**：`<div $class="\${this.state.type}">`

### 2\. `$bind` 接口契约

若自定义组件需支持 `$bind` 双向绑定，需在 `setupFunc` 中实现：

  * **数据输入 (响应更新)**：`container.addEventListener('bind', (e) => { const val = e.detail; ... })`
  * **数据输出 (触发更新)**：`container.dispatchEvent(new CustomEvent('change', { bubbles: false, detail: newValue }))`
  * **插槽注入规则**：消费者调用组件时，**必须**使用 `<div slot-id="插槽名">` 的形式显式向组件内注入对应节点。如果组件只有一个插槽位时调用代码可以直接写内容不需要使用模版来定义插槽。

### 3. 容器与 DOM 就绪机制 (DOM Readiness)
* **`container` 的本质**：在 `setupFunc` 中，传入的 `container` 参数**即为调用组件的 DOM 节点**。组件模板的根节点会合并到该节点变成同一个节点，但是调用组件时属性中的this指向上层组件，而组件内的this指向组件实例。
* **同步就绪**：当进入 `setupFunc` 时，组件的 DOM 树（包括插槽内容）已经**完全初始化并挂载就绪**，可以在 `setupFunc` 中直接使用。

### 4. 插槽 (Slot) 的渲染时序
* 组件框架在进入 setupFunc 之前就已经完成了插槽内容（`<div slot-id="...">`）的初始化注入。因此，在 setupFunc 中直接使用插槽内容是完全安全且符合预期的。

### 5. 高级状态管理与生命周期能力
* **隐式节点变量 (`thisNode`)**:
    在 `$each` 循环或属性指令中，可以直接使用隐式变量 `thisNode` 获取当前执行上下文绑定的 DOM 节点对象自身。

## 四、 极简主义与高性能开发哲学

1. **拒绝过度工程 (No Over-engineering)**：严禁使用复杂的树结构或大段防御性代码。
2. **DOM 访问极小化**：优先通过 `this.state` 驱动 UI，避免在 JS 中手动调用 `element.style.xxx`。
3. **闭包与内存的权衡**：优先将逻辑挂载到 `container` 或 `container.state` 上。
4. **组件内聚**：能用指令解决的 UI 逻辑绝不写在 JS 里。
5. **思维重塑**：彻底抛弃 Vue/React 的生命周期崇拜，回归 DOM 本质。
6. **无分号运动**：除了必须的情况，代码结尾禁止使用分号 `;`。

## 五、 开发范例

### 范例 1：带插槽与 UI 的组件 (以 Modal 为例)

```javascript
Component.register('Modal', container => {
    container.modal = new bootstrap.Modal(container)
    container.addEventListener('bind', e => e.detail ? container.modal.show() : container.modal.hide())
    container.addEventListener('hide.bs.modal', () => {
        document.activeElement?.blur()
        container.dispatchEvent(new CustomEvent('change', { bubbles: false, detail: false }))
    })
    Util.copyFunction(container, container.modal, 'show', 'hide')
}, Util.makeDom(/*html*/`
<div class="modal fade" data-bs-backdrop="static">
<div class="modal-dialog modal-dialog-centered">
    <div $class="modal-content text-bg-\${this.state?.type || 'body'}">
        <div slot-id="header" class="modal-header">
            <h6 class="modal-title" $text="this.state?.title"></h6>
            <button type="button" class="btn-close btn-sm ms-2" data-bs-dismiss="modal"></button>
        </div>
        <div slot-id="body" class="modal-body"></div>
        <div slot-id="footer" class="modal-footer"></div>
    </div>
</div>
</div>
`))
```

### 范例 2：无模板纯逻辑组件 (以 API 为例)

```javascript
Component.register('API', container => {
    container.request = NewState({ url: '', method: 'GET', headers: {}, data: null, timeout: 10000 })
    container.response = NewState({ loading: false, result: null })
    container.do = async (opt = {}) => {
        const req = { ...container.request, ...opt }
        container.response.loading = true
        const resp = await fetch(req.url, req)
        container.response.result = await resp.json()
        container.response.loading = false
        container.dispatchEvent(new CustomEvent('response', { detail: container.response }))
    }
    container.request.__watch(null, () => container.hasAttribute('auto') && container.request.url && container.do())
})
```
