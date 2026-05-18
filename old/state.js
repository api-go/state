// state.js v2.3
(() => {
	(() => {
		try { return document.createElement('div').setAttribute('$t', '1') } catch (e) { }
		const originalSetAttribute = Element.prototype.setAttribute
		Element.prototype.setAttribute = function (name, value) {
			if (!name.startsWith('$')) return originalSetAttribute.call(this, name, value)
			return originalSetAttribute.call(this, 'st-' + name.substring(1), value)
		}
	})()

	globalThis.$ = (a, b) => b ? a.querySelector(b) : document.querySelector(a)
	globalThis.$$ = (a, b) => b ? a.querySelectorAll(b) : document.querySelectorAll(a)
	let _activeBinding = null
	let _noWriteBack = null
	globalThis.NewState = function (defaults = {}, getter = null, setter = null) {
		const _defaults = {}//, _localStorageBinds = {}, _hashBinds = {}
		const _stateMappings = new Map()
		const _watchers = new Map()
		const _watchFunc = (k, cb) => {
			if (!_watchers.has(k)) _watchers.set(k, new Set())
			!cb ? _watchers.get(k).clear() : _watchers.get(k).add(cb)
		}
		const _unwatchFunc = (k, cb) => {
			if (!_watchers.has(k)) _watchers.set(k, new Set())
			_watchers.get(k).delete(cb)
		}
		const _getter = getter || (k => _defaults[k])
		const _setter = setter || ((k, v) => _defaults[k] = v)
		Object.assign(_defaults, defaults)
		// 创建代理对象，实现数据绑定
		return new Proxy(_defaults, {
			get(target, key) {
				if (key === '__watch') return _watchFunc
				if (key === '__unwatch') return _unwatchFunc
				if (_activeBinding) {
					if (!_stateMappings.has(key)) _stateMappings.set(key, new Set())
					_stateMappings.get(key).add(_activeBinding)
					_activeBinding.node._states.add(_stateMappings) // 存储状态机到节点，方便删除节点时清除绑定
				}
				return _getter(key)
			},
			set(target, key, value) {
				if (_getter(key) !== value) { // 允许自赋值，用来触发更新
					_setter(key, value)
				}
				if (_watchers.has(key)) {
					_watchers.get(key).forEach(cb => {
						const r = cb(value)
						if (r !== undefined) {
							value = r
							target[key] = value
						}
					})
				}
				if (_watchers.has(null)) {
					_watchers.get(null).forEach(cb => cb(value))
				}
				if (_stateMappings.has(key)) {
					const bindings = _stateMappings.get(key)
					for (const binding of bindings) {
						if (!binding.node.isConnected) {
							bindings.delete(binding)
							continue
						}
						if (_noWriteBack !== binding.node) _updateBinding(binding)
					}
				}
				return true
			}
		})
	}

	function _returnCode(code, vars, thisObj, extendVars) {
		if (code.includes('${')) return _runCode('return `' + code + '`', vars, thisObj, extendVars)
		else return _runCode('return ' + code, vars, thisObj, extendVars)
	}
	let _disableRunCodeError = false
	function _runCode(code, vars, thisObj, extendVars) {
		const argKeys = [...Object.keys(extendVars), ...Object.keys(vars)]
		const argValues = [...Object.values(extendVars), ...Object.values(vars)]
		argKeys.push(code)
		try {
			const r = new Function(...argKeys).apply(thisObj, argValues)
			return r
		} catch (e) {
			if (!_disableRunCodeError) console.error(e, extendVars, [code, extendVars, vars, thisObj])
			return null
		}
	}
	function _clearRenderedNodes(node) {
		if (node._renderedNodes) node._renderedNodes.forEach(nodes => {
			nodes.forEach(child => {
				child.remove()
				if (child._renderedNodes) _clearRenderedNodes(child)
			})
		})
	}
	// 更新绑定值
	function _updateBinding(binding) {
		const node = binding.node
		const tpl = binding.tpl
		const exp = binding.exp
		// 每次都动态重建绑定，确保最新状态
		_activeBinding = binding
		let result = exp ? (tpl ? _returnCode(tpl, { thisNode: node }, node._thisObj || node, node._ref || null) : null) : tpl
		_activeBinding = null

		if (binding.prop) {
			// 处理对象绑定
			const prop = binding.prop
			let o = node
			for (let i = 0; i < prop.length - 1; i++) {
				if (!prop[i]) continue
				if (o[prop[i]] == null) o[prop[i]] = {}
				o = o[prop[i]]
				if (typeof o !== 'object') break
			}
			if (typeof o === 'object' && o !== null) {
				const resultIsObject = typeof result === 'object' && result != null && !Array.isArray(result)
				const lk = prop[prop.length - 1]
				if (lk) {
					if (resultIsObject && o[lk] == null) o[lk] = {}
					const lo = o[lk]
					if (typeof lo === 'object' && lo != null && lo.__watch) Object.assign(lo, result)
					else o[lk] = result
				} else if (resultIsObject && typeof o === 'object') {
					Object.assign(o, result)
				}
			}
		} else if (binding.attr) {
			// 处理attr绑定
			const attr = binding.attr
			if (attr === 'if') {
				if (result) {
					node._children.forEach(child => {
						node.parentNode.insertBefore(child, node)
						child._ref = { ...node._ref }
					})
					node._renderedNodes = [node._children]
				} else {
					_clearRenderedNodes(node)
					node._renderedNodes = []
				}
			} else if (attr === 'each') {
				if (result && typeof result === 'object') {
					const asName = node.getAttribute('as') || 'item'
					const indexName = node.getAttribute('index') || 'index'
					let keys, getVal;
					if (result instanceof Map) {
						keys = Array.from(result.keys())
						getVal = k => result.get(k)
					} else if (typeof result[Symbol.iterator] === 'function') {
						const arr = Array.isArray(result) ? result : Array.from(result)
						keys = new Array(arr.length)
						for (let i = 0; i < arr.length; i++) keys[i] = i
						getVal = k => arr[k]
					} else {
						keys = Object.keys(result)
						getVal = k => result[k]
					}
					keys.forEach((k, i) => {
						const item = getVal(k)
						if (i < node._renderedNodes.length) {
							node._renderedNodes[i].forEach(child => {
								child._ref[indexName] = k
								child._ref[asName] = item
								_scanTree(child)
							})
						} else {
							const newNodes = []
							node._children.forEach(child => {
								const cloned = child.cloneNode(true)
								cloned._ref = { ...node._ref }
								cloned._ref[indexName] = k
								cloned._ref[asName] = item
								cloned._thisObj = node._thisObj
								node.parentNode.insertBefore(cloned, node)
								newNodes.push(cloned)
							})
							node._renderedNodes.push(newNodes)
						}
					})
					while (node._renderedNodes.length > keys.length) {
						node._renderedNodes[node._renderedNodes.length - 1].forEach(child => {
							_clearRenderedNodes(child)
							child.remove()
						})
						node._renderedNodes.pop()
					}
				} else {
					_clearRenderedNodes(node)
					node._renderedNodes = []
				}
			} else if (attr === 'bind') {
				if (['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName)) {
					// 防止浏览器后退前进后擅自恢复表单值
					if (!node.hasAttribute('autocomplete')) node.setAttribute('autocomplete', 'off')
				}
				if (node.type === 'checkbox') {
					if (node.value !== 'on' && !result) {
						// 复选框有指定名字且未绑定值时，使用多选模式
						_runCode(`${tpl} = []`, { thisNode: node }, node._thisObj || node, node._ref || {})
						result = []
					}
					node._checkboxMultiMode = result instanceof Array
					const isChecked = result instanceof Array ? result.includes(node.value) : !!result
					if (node.checked !== isChecked) node.checked = isChecked
				} else if (node.type === 'radio') {
					if (node.checked !== (node.value === String(result ?? ''))) node.checked = (node.value === String(result ?? ''))
				} else if ('value' in node && node.type !== 'file') {
					Promise.resolve().then(() => { // 确保 select 元素值处理好再设置
						if (node.value !== String(result ?? '')) node.value = result
					})
				} else if (node.isContentEditable) {
					if (node.innerHTML !== String(result ?? '')) node.innerHTML = result
				}
				node.dispatchEvent(new CustomEvent('bind', { bubbles: false, detail: result }))
			} else {
				if (['checked', 'disabled', 'readonly'].includes(attr)) result = !!result
				if (typeof result === 'boolean') {
					result ? node.setAttribute(attr, '') : node.removeAttribute(attr)
				} else if (result !== undefined) {
					if (typeof result !== 'string') result = JSON.stringify(result)
					if (attr === 'text') {
						node.textContent = result ?? ''
					} else if (attr === 'html') {
						node.innerHTML = result ?? ''
					} else if (node.tagName === 'IMG' && attr === 'src' && result.includes('.svg')) {
						node.setAttribute('_src', result ?? '')
					} else {
						node.setAttribute(attr, result ?? '')
					}
				}
			}
		}
	}
	const _initBinding = (binding) => {
		if (!binding.node._bindings) binding.node._bindings = []
		binding.node._bindings.push({ attr: binding.attr, prop: binding.prop, tpl: binding.tpl, exp: binding.exp }) // 存储绑定信息，方便恢复
		_updateBinding(binding)
	}
	// 旧逻辑，存在合并优先级问题
	// const _mergeNode = (from, to, scanObj, exists = {}) => {
	// 	Array.from(from.attributes).forEach(attr => attr.name !== 'class' && to.setAttribute(attr.name, attr.value))
	// 	to.classList.add(...from.classList)
	// 	Array.from(from.childNodes).forEach(child => to.appendChild(child))
	// 	// 实现组件继承
	// 	if (Component.exists(from.tagName)) _makeComponent(from.tagName, to, scanObj, exists)
	// }
	// 新逻辑，智能合并 style，外部样式放在后面以获得更高 CSS 优先级
	const _mergeNode = (from, to, scanObj, exists = {}) => {
		Array.from(from.attributes).forEach(attr => {
			if (attr.name === 'class') return
			if (attr.name === 'style') {
				// 智能合并 style，外部样式放在后面以获得更高 CSS 优先级
				if (to.hasAttribute('style')) to.setAttribute('style', `${attr.value}; ${to.getAttribute('style')}`)
				else to.setAttribute('style', attr.value)
			} else if (!to.hasAttribute(attr.name)) {
				to.setAttribute(attr.name, attr.value)
			}
		})
		to.classList.add(...from.classList)
		Array.from(from.childNodes).forEach(child => to.appendChild(child))
		if (Component.exists(from.tagName)) _makeComponent(from.tagName, to, scanObj, exists)
	}
	const _makeComponent = (name, node, scanObj, exists = {}) => {
		if (exists[name]) return
		exists[name] = true
		if (scanObj.thisObj) Array.from(node.attributes).forEach(attr => { if ((attr.name.startsWith('$') || attr.name.startsWith('st-')) && attr.value.includes('this.')) attr.value = attr.value.replace(/\bthis\./g, 'this.parent.') }) // 在父组件中的子组件属性里的this.需要转换为this.parent.，因为实际运行会在子组件上下文执行
		const componentFunc = Component.getSetupFunction(name)
		const slots = {}
		Array.from(node.childNodes).forEach(child => {
			if (child.nodeType === Node.ELEMENT_NODE && child.hasAttribute('slot')) {
				slots[child.getAttribute('slot')] = child
				child.removeAttribute('slot')
			}
		})
		node.innerHTML = ''
		node.state = NewState(node.state || {})
		const template = Component.getTemplate(name)
		if (template) {
			const tplnode = template.content.cloneNode(true)
			if (tplnode.childNodes.length) {
				const rootNode = tplnode.children[0]
				_mergeNode(rootNode, node, scanObj, exists)
				$$(node, '[slot-id]').forEach(placeholder => {
					const slotName = placeholder.getAttribute('slot-id')
					if (slots[slotName]) {
						placeholder.removeAttribute('slot-id')
						placeholder.innerHTML = ''
						_mergeNode(slots[slotName], placeholder, scanObj, exists)
					}
				})
			}
		}
		if (componentFunc) componentFunc(node)
	}
	const _parseNode = (node, scanObj) => {
		if (node._bindings) {
			// 恢复绑定信息
			node._states = new Set()
			node._bindings.forEach(bindingData => {
				const binding = { node: node, ...bindingData }
				_updateBinding(binding)
			})
			if (node._hasOnUpdate) node.dispatchEvent(new Event('update', { bubbles: false }))
			return
		}

		// 处理组件
		if (Component.exists(node.tagName) && !node._componentInitialized) {
			_makeComponent(node.tagName, node, scanObj)
			$$(node, '[slot-id]').forEach(placeholder => placeholder.removeAttribute('slot-id'))
			node._componentInitialized = true
			if (!node._thisObj) node._thisObj = node
		}

		let attrs = []
		if (node.tagName === 'TEMPLATE') {
			node._children = [...node.content.childNodes]
			node._renderedNodes = []
			if (node.hasAttribute('$if')) attrs.push(node.getAttributeNode('$if'))
			else if (node.hasAttribute('$each')) attrs.push(node.getAttributeNode('$each'))
			else if (node.hasAttribute('st-if')) attrs.push(node.getAttributeNode('st-if'))
			else if (node.hasAttribute('st-each')) attrs.push(node.getAttributeNode('st-each'))
		} else {
			attrs = Array.from(node.attributes).filter(attr => (attr.name.startsWith('$') || attr.name.startsWith('st-')) && !['$if', '$each', 'st-if', 'st-each'].includes(attr.name) || attr.name.includes('.'))
		}

		if (node._thisObj && scanObj.thisObj) node._thisObj.parent = scanObj.thisObj
		if (!node._thisObj) node._thisObj = scanObj.thisObj || null
		if (!node._ref) node._ref = scanObj.extendVars || {}
		node._states = new Set()
		// node._handleEvents = []
		attrs.forEach(attr => {
			const exp = attr.name.startsWith('$') || attr.name.startsWith('st-')
			const realAttrName = exp ? attr.name.slice(attr.name.startsWith('$') ? 1 : 3) : attr.name
			let tpl = attr.value
			node.removeAttribute(attr.name)
			if (realAttrName.startsWith('.')) {
				// 处理属性绑定
				_initBinding({ node: node, prop: realAttrName.split('.'), tpl, exp })
			} else {
				if (realAttrName.startsWith('on')) {
					if (realAttrName === 'onupdate') node._hasOnUpdate = true
					if (realAttrName === 'onload' && !['BODY', 'IMG', 'IFRAME'].includes(node.tagName)) node._hasOnLoad = true
					if (realAttrName === 'onunload' && !['BODY', 'IMG', 'IFRAME'].includes(node.tagName)) node._hasOnUnload = true;
					// node._handleEvents.push(realAttrName.slice(2));
					((node, thisObj) => {
						node.addEventListener(realAttrName.slice(2), (e) => {
							_runCode(tpl, { event: e, thisNode: node, ...(e.detail || {}) }, thisObj || node, node._ref || {})
						})
					})(node, scanObj.thisObj)
				} else {
					if (realAttrName === 'bind') {
						// 处理 bind 指令（双向数据绑定）
						node.addEventListener(node.tagName === 'TEXTAREA' || node.isContentEditable || node.type === 'text' || node.type === 'password' ? 'input' : 'change', (e) => {
							let newVal = node.isContentEditable ? e.target.innerHTML : (node.type === 'checkbox' ? e.target.checked : e.target.files || e.target.value || e.detail)
							_noWriteBack = node
							_disableRunCodeError = true // 忽略赋值错误，支持非对象类型的 $bind
							if (node.type === 'checkbox' && node._checkboxMultiMode) {
								_runCode(`!!checked ? (!${tpl}.includes(val) && ${tpl}.push(val)) : (index = ${tpl}.indexOf(val), index > -1 && ${tpl}.splice(index, 1))`, { val: node.value, checked: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {})
							} else {
								_runCode(`${tpl} = val`, { val: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {})
							}
							_disableRunCodeError = false
							_noWriteBack = null
						})
					} else if (realAttrName === 'text' && !tpl) {
						tpl = node.textContent
						node.textContent = ''
					}
					if (tpl) _initBinding({ node: node, attr: realAttrName, tpl, exp })
				}
			}
		})
		if (node._hasOnLoad || node._componentInitialized) {
			(node => {
				Promise.resolve().then(() => node.dispatchEvent(new Event('load', { bubbles: false })))
			})(node)
		}
		if (node._hasOnUpdate) node.dispatchEvent(new Event('update', { bubbles: false }))
		if (node._thisObj) scanObj.thisObj = node._thisObj
	}

	const _scanTree = (node, scanObj = {}) => {
		if (node.nodeType !== 1) return

		// 自动为非模板节点的$if和$each指令创建模版节点
		if (node.tagName !== 'TEMPLATE' && (node.hasAttribute('$if') || node.hasAttribute('$each') || node.hasAttribute('st-if') || node.hasAttribute('st-each'))) {
			const template = document.createElement('TEMPLATE')
			const attrs = Array.from(node.attributes).filter(attr => ['$if', '$each', 'st-if', 'st-each'].includes(attr.name) || ((node.hasAttribute('$each') || node.hasAttribute('st-each')) && ['as', 'index'].includes(attr.name)))
			attrs.forEach(attr => {
				template.setAttribute(attr.name, attr.value)
				node.removeAttribute(attr.name)
			})
			node.parentNode.insertBefore(template, node)
			template.content.appendChild(node)
			template._ref = node._ref
			node = template
			return // 异步交给MutationObserver处理
		}
		// 处理模板节点同时存在$if和$each指令的情况， 自动为第二个指令创建模版节点
		if (node.tagName === 'TEMPLATE' && (node.hasAttribute('$if') || node.hasAttribute('st-if')) && (node.hasAttribute('$each') || node.hasAttribute('st-each'))) {
			const template = document.createElement('TEMPLATE')
			const attrs = Array.from(node.attributes).filter(attr => ['$if', '$each', 'st-if', 'st-each'].includes(attr.name))
			const attr = attrs[attrs.length - 1]
			template.setAttribute(attr.name, attr.value)
			node.removeAttribute(attr.name)
			if (attr.name === '$each' || attr.name === 'st-each') {
				Array.from(node.attributes).filter(attr => ['as', 'index'].includes(attr.name)).forEach(attr => {
					template.setAttribute(attr.name, attr.value)
					node.removeAttribute(attr.name)
				})
			}
			Array.from(node.content.childNodes).forEach(child => {
				template.content.appendChild(child)
			})
			node.content.appendChild(template)
			template._ref = node._ref
		}

		// 处理 SVG
		if (node.tagName === 'IMG' && (node.hasAttribute('src') || node.hasAttribute('_src') || node.hasAttribute('$src'))) {
			const imgNode = node
			Promise.resolve().then(() => {
				const url = imgNode.getAttribute('_src') || imgNode.getAttribute('src')
				if (url) fetch(url, { cache1: 'force-cache' }).then(r => {
					return r.text()
				}).then(svgText => {
					const realSvg = new DOMParser().parseFromString(svgText, "image/svg+xml").querySelector('svg')
					if (realSvg) {
						Array.from(imgNode.attributes).forEach(attr => realSvg.setAttribute(attr.name, attr.value))
						imgNode.replaceWith(realSvg)
					}
				})
			})
		}

		if (node._thisObj !== undefined) scanObj.thisObj = node._thisObj || null
		if (scanObj.thisObj === undefined) {
			// 向上查找_thisObj，如果没有就用null，null 代表就是没有，undefined 表示需要向上查找
			let curr = node
			while (curr && curr._thisObj === undefined) curr = curr.parentNode
			scanObj.thisObj = curr ? curr._thisObj : null
		}
		if (node._ref === undefined) {
			let curr = node
			while (curr && curr._ref === undefined) curr = curr.parentNode
			node._ref = curr ? { ...curr._ref } : {}
		}
		if (scanObj.extendVars === undefined) scanObj.extendVars = {}
		if (node._ref !== undefined) {
			Object.assign(node._ref, scanObj.extendVars)
			scanObj.extendVars = { ...node._ref }
		}
		_parseNode(node, scanObj)
		const nodes = [...(node.childNodes || [])]
		scanObj.extendVars = node._ref || scanObj.extendVars
		nodes.forEach(child => _scanTree(child, { thisObj: scanObj.thisObj, extendVars: { ...node._ref } }))
	}

	const _unbindTree = (node) => {
		if (node.nodeType !== 1) return
		if (node._hasOnUnload) node.dispatchEvent(new Event('unload', { bubbles: false }))
		if (node._states) {
			node._states.forEach(stateMappings => {
				for (const [key, bindingSet] of stateMappings) {
					for (const binding of bindingSet) {
						if (binding.node === node) bindingSet.delete(binding)
					}
				}
			})
		}
		node.childNodes && node.childNodes.forEach(child => _unbindTree(child))
	}
	globalThis.RefreshState = _scanTree

	const _components = new Map()
	const _pendingTemplates = []
	globalThis.Component = {
		getTemplate: name => $(`template[component="${name.toUpperCase()}"]`),
		register: (name, setupFunc, templateNode = null, ...globalNodes) => {
			_components.set(name.toUpperCase(), setupFunc)
			if (document.readyState !== 'loading') Component._addTemplate(name, templateNode, globalNodes)
			else _pendingTemplates.push([name, templateNode, globalNodes])
		},
		exists: (name) => _components.has(name.toUpperCase()),
		getSetupFunction: (name) => _components.get(name.toUpperCase()),
		_addTemplate: (name, templateNode, globalNodes) => {
			if (templateNode) {
				const template = document.createElement('TEMPLATE')
				template.setAttribute('component', name.toUpperCase())
				template.content.appendChild(templateNode)
				document.body.appendChild(template)
			}
			if (globalNodes) globalNodes.forEach(node => document.body.appendChild(node))
		}
	}

	document.addEventListener('DOMContentLoaded', () => {
		_pendingTemplates.forEach(([name, templateNode, globalNodes]) => Component._addTemplate(name, templateNode, globalNodes))
		_pendingTemplates.length = 0
	}, true)

	document.addEventListener('DOMContentLoaded', () => {
		new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.addedNodes.forEach(newNode => {
					if (newNode.isConnected) _scanTree(newNode)
				})
				mutation.removedNodes.forEach(oldNode => _unbindTree(oldNode))
			})
		}).observe(document.documentElement, { childList: true, subtree: true })
		_scanTree(document.documentElement)
	})

})()
