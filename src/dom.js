// src/dom.js
import { _runCode, _returnCode, setDisableRunCodeError } from './core.js';
import { getActiveBinding, setActiveBinding, getNoWriteBack, setNoWriteBack, NewState, onNotifyUpdate } from './observer.js';
import { Component, _makeComponent, _mergeNode } from './component.js';
import { $, $$ } from './dom-utils.js';

let _translator = (text, args) => {
	if (!text || typeof text !== 'string') return text;
	return text.replace(/\{(.+?)\}/g, (match, key) => {
		return args.hasOwnProperty(key) ? args[key] : match;
	})
};
export const SetTranslator = (fn) => _translator = fn;

const _translate = (text) => {
	if (!text || typeof text !== 'string' || !text.includes('{#')) return text;
	return text.replace(/\{#(.+?)#\}/g, (m, content) => {
		const parts = content.split('||').map(s => s.trim());
		const rawText = parts[0];
		const args = {};
		if (parts.length > 1) {
			const matches = rawText.match(/\{(.+?)\}/g);
			if (matches) matches.forEach((match, i) => {
				const key = match.substring(1, match.length - 1);
				args[key] = parts[i + 1] || '';
			});
		}
		return _translator(rawText, args);
	});
};

if (typeof document !== 'undefined') {
	try {
		document.createElement('div').setAttribute('$t', '1');
	} catch (e) {
		const originalSetAttribute = Element.prototype.setAttribute;
		Element.prototype.setAttribute = function (name, value) {
			if (!name.startsWith('$')) return originalSetAttribute.call(this, name, value);
			return originalSetAttribute.call(this, 'st-' + name.substring(1), value);
		};
	}
}

export { $, $$ };

onNotifyUpdate((binding) => _updateBinding(binding));

export function _clearRenderedNodes(node) {
	if (node._renderedNodes) node._renderedNodes.forEach(nodes => {
		nodes.forEach(child => {
			child.remove();
			if (child._renderedNodes) _clearRenderedNodes(child);
		});
	});
}

export function _updateBinding(binding) {
	const node = binding.node;
	const tpl = binding.tpl;
	const exp = binding.exp;

	setActiveBinding(binding);
	let result = exp ? (tpl ? _returnCode(tpl, { thisNode: node }, node._thisObj || node, node._ref || null) : null) : tpl;
	setActiveBinding(null);

	if (binding.prop) {
		const prop = binding.prop;
		let o = node;
		for (let i = 0; i < prop.length - 1; i++) {
			if (!prop[i]) continue;
			if (o[prop[i]] == null) o[prop[i]] = {};
			o = o[prop[i]];
			if (typeof o !== 'object') break;
		}
		if (typeof o === 'object' && o !== null) {
			const resultIsObject = typeof result === 'object' && result != null && !Array.isArray(result);
			const lk = prop[prop.length - 1];
			if (lk) {
				if (resultIsObject && o[lk] == null) o[lk] = {};
				const lo = o[lk];
				if (typeof lo === 'object' && lo != null && lo.__watch) Object.assign(lo, result);
				else o[lk] = result;
			} else if (resultIsObject && typeof o === 'object') {
				Object.assign(o, result);
			}
		}
	} else if (binding.attr) {
		const attr = binding.attr;
		if (attr === 'if') {
			if (result) {
				if (!node._renderedNodes || node._renderedNodes.length === 0) {
					node._children.forEach(child => {
						node.parentNode.insertBefore(child, node);
						child._ref = { ...node._ref };
					});
					node._renderedNodes = [node._children];
				}
			} else {
				_clearRenderedNodes(node);
				node._renderedNodes = [];
			}
		} else if (attr === 'each') {
			if (result && typeof result === 'object') {
				const asName = node.getAttribute('as') || 'item';
				const indexName = node.getAttribute('index') || 'index';
				let keys, getVal;
				if (result instanceof Map) {
					keys = Array.from(result.keys());
					getVal = k => result.get(k);
				} else if (typeof result[Symbol.iterator] === 'function') {
					const arr = Array.isArray(result) ? result : Array.from(result);
					keys = new Array(arr.length);
					for (let i = 0; i < arr.length; i++) keys[i] = i;
					getVal = k => arr[k];
				} else {
					keys = Object.keys(result);
					getVal = k => result[k];
				}
				keys.forEach((k, i) => {
					const item = getVal(k);
					if (node._renderedNodes && i < node._renderedNodes.length) {
						node._renderedNodes[i].forEach(child => {
							child._ref[indexName] = k;
							child._ref[asName] = item;
							_scanTree(child);
						});
					} else {
						const newNodes = [];
						if (!node._renderedNodes) node._renderedNodes = [];
						node._children.forEach(child => {
							const cloned = child.cloneNode(true);
							cloned._ref = { ...node._ref };
							cloned._ref[indexName] = k;
							cloned._ref[asName] = item;
							cloned._thisObj = node._thisObj;
							node.parentNode.insertBefore(cloned, node);
							newNodes.push(cloned);
						});
						node._renderedNodes.push(newNodes);
					}
				});
				while (node._renderedNodes && node._renderedNodes.length > keys.length) {
					node._renderedNodes[node._renderedNodes.length - 1].forEach(child => {
						_clearRenderedNodes(child);
						child.remove();
					});
					node._renderedNodes.pop();
				}
			} else {
				_clearRenderedNodes(node);
				node._renderedNodes = [];
			}
		} else if (attr === 'bind') {
			if (['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName)) {
				if (!node.hasAttribute('autocomplete')) node.setAttribute('autocomplete', 'off');
			}
			if (node.type === 'checkbox') {
				if (node.value !== 'on' && !result) {
					_runCode(`${tpl} = []`, { thisNode: node }, node._thisObj || node, node._ref || {});
					result = [];
				}
				node._checkboxMultiMode = result instanceof Array;
				const isChecked = result instanceof Array ? result.includes(node.value) : !!result;
				if (node.checked !== isChecked) node.checked = isChecked;
			} else if (node.type === 'radio') {
				if (node.checked !== (node.value === String(result ?? ''))) node.checked = (node.value === String(result ?? ''));
			} else if ('value' in node && node.type !== 'file') {
				setTimeout(() => {
					if (node.value !== String(result ?? '')) node.value = result;
				});
			} else if (node.isContentEditable) {
				if (node.innerHTML !== String(result ?? '')) node.innerHTML = result;
			}
			node.dispatchEvent(new CustomEvent('bind', { bubbles: false, detail: result }));
		} else {
			if (['checked', 'disabled', 'readonly'].includes(attr)) result = !!result;
			if (typeof result === 'boolean') {
				result ? node.setAttribute(attr, '') : node.removeAttribute(attr);
			} else if (result !== undefined) {
				if (typeof result !== 'string') result = JSON.stringify(result);
				if (attr === 'text') {
					node.textContent = result ?? '';
				} else if (attr === 'html') {
					node.innerHTML = result ?? '';
				} else if (node.tagName === 'IMG' && attr === 'src' && result.includes('.svg')) {
					node.setAttribute('_src', result ?? '');
				} else {
					node.setAttribute(attr, result ?? '');
				}
			}
		}
	}
}

export const _initBinding = (binding) => {
	if (!binding.node._bindings) binding.node._bindings = [];
	binding.node._bindings.push({ attr: binding.attr, prop: binding.prop, tpl: binding.tpl, exp: binding.exp });
	_updateBinding(binding);
};

export const _parseNode = (node, scanObj) => {
	if (node._bindings) {
		node._states = new Set();
		node._bindings.forEach(bindingData => {
			const binding = { node: node, ...bindingData };
			_updateBinding(binding);
		});
		if (node._hasOnUpdate) node.dispatchEvent(new Event('update', { bubbles: false }));
		if (node.hasAttribute('onupdate')) {
			_runCode(node.getAttribute('onupdate'), { thisNode: node }, node._thisObj || node, node._ref || {});
		}
		return;
	}

	if (Component.exists(node.tagName) && !node._componentInitialized) {
		Array.from(node.attributes).forEach(attr => {
			if (attr.name.startsWith('$.')) {
				const realAttrName = attr.name.slice(2);
				let tpl = attr.value;
				if (tpl.includes('this.')) tpl = tpl.replace(/\bthis\./g, 'this.parent.');
				tpl = _translate(tpl);
				const result = _returnCode(tpl, { thisNode: node }, { parent: scanObj.thisObj || node }, node._ref || {});
				let o = node;
				const prop = realAttrName.split('.');
				for (let i = 0; i < prop.length - 1; i++) {
					if (!prop[i]) continue;
					if (o[prop[i]] == null) o[prop[i]] = {};
					o = o[prop[i]];
				}
				o[prop[prop.length - 1]] = result;
				node.removeAttribute(attr.name);
			}
		});

		_makeComponent(node.tagName, node, scanObj);
		$$(node, '[slot-id]').forEach(placeholder => placeholder.removeAttribute('slot-id'));
		node._componentInitialized = true;
		if (!node._thisObj) node._thisObj = node;
	}

	let attrs = [];
	if (node.tagName === 'TEMPLATE') {
		node._children = [...node.content.childNodes];
		node._renderedNodes = [];
		if (node.hasAttribute('$if')) attrs.push(node.getAttributeNode('$if'));
		else if (node.hasAttribute('$each')) attrs.push(node.getAttributeNode('$each'));
		else if (node.hasAttribute('st-if')) attrs.push(node.getAttributeNode('st-if'));
		else if (node.hasAttribute('st-each')) attrs.push(node.getAttributeNode('st-each'));
	} else {
		attrs = Array.from(node.attributes).filter(attr => (attr.name.startsWith('$') || attr.name.startsWith('st-')) && !['$if', '$each', 'st-if', 'st-each'].includes(attr.name) || attr.name.includes('.'));
	}

	if (node._thisObj && scanObj.thisObj) node._thisObj.parent = scanObj.thisObj;
	if (!node._thisObj) node._thisObj = scanObj.thisObj || null;
	if (!node._ref) node._ref = scanObj.extendVars || {};
	node._states = new Set();

	attrs.forEach(attr => {
		const exp = attr.name.startsWith('$') || attr.name.startsWith('st-');
		const realAttrName = exp ? attr.name.slice(attr.name.startsWith('$') ? 1 : 3) : attr.name;
		let tpl = attr.value;
		node.removeAttribute(attr.name);
		if (realAttrName.startsWith('.')) {
			_initBinding({ node: node, prop: realAttrName.split('.'), tpl, exp });
		} else {
			if (realAttrName.startsWith('on')) {
				const eventName = realAttrName.slice(2);
				if (eventName === 'update') node._hasOnUpdate = true;
				if (eventName === 'load' && !['BODY', 'IMG', 'IFRAME'].includes(node.tagName)) node._hasOnLoad = true;
				if (eventName === 'onunload' && !['BODY', 'IMG', 'IFRAME'].includes(node.tagName)) node._hasOnUnload = true;
				((node, thisObj) => {
					node.addEventListener(eventName, (e) => {
						_runCode(tpl, { event: e, thisNode: node, ...(e.detail || {}) }, thisObj || node, node._ref || {});
					});
				})(node, scanObj.thisObj);
			} else {
				if (realAttrName === 'bind') {
					node.addEventListener(node.tagName === 'TEXTAREA' || node.isContentEditable || node.type === 'text' || node.type === 'password' ? 'input' : 'change', (e) => {
						let newVal = node.isContentEditable ? e.target.innerHTML : (node.type === 'checkbox' ? e.target.checked : e.target.files || e.target.value || e.detail);
						setNoWriteBack(node);
						setDisableRunCodeError(true);
						if (node.type === 'checkbox' && node._checkboxMultiMode) {
							_runCode(`!!checked ? (!${tpl}.includes(val) && ${tpl}.push(val)) : (index = ${tpl}.indexOf(val), index > -1 && ${tpl}.splice(index, 1))`, { val: node.value, checked: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {});
						} else {
							_runCode(`${tpl} = val`, { val: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {});
						}
						setDisableRunCodeError(false);
						setNoWriteBack(null);
					});
				} else if (realAttrName === 'text' && !tpl) {
					tpl = node.textContent;
					node.textContent = '';
				}
				if (tpl) {
					tpl = _translate(tpl);
					_initBinding({ node: node, attr: realAttrName, tpl, exp });
				}
			}
		}
	});

	if (node._hasOnLoad || node._componentInitialized) {
		(node => {
			Promise.resolve().then(() => node.dispatchEvent(new Event('load', { bubbles: false })));
		})(node);
	}
	if (node._hasOnUpdate) node.dispatchEvent(new Event('update', { bubbles: false }));
	if (node._thisObj) scanObj.thisObj = node._thisObj;
};

export const _scanTree = (node, scanObj = {}) => {
	if (node.nodeType === 3) {
		if (node._stTranslated) return;
		const translated = _translate(node.textContent);
		if (translated !== node.textContent) node.textContent = translated;
		node._stTranslated = true;
		return;
	}
	if (node.nodeType !== 1) return;

	if (!node._stTranslated) {
		Array.from(node.attributes).forEach(attr => {
			if (!attr.name.startsWith('$') && !attr.name.startsWith('st-') && !attr.name.startsWith('.')) {
				const translated = _translate(attr.value);
				if (translated !== attr.value) attr.value = translated;
			}
		});
		node._stTranslated = true;
	}

	if (node.tagName !== 'TEMPLATE' && (node.hasAttribute('$if') || node.hasAttribute('$each') || node.hasAttribute('st-if') || node.hasAttribute('st-each'))) {
		const template = document.createElement('TEMPLATE');
		const attrs = Array.from(node.attributes).filter(attr => ['$if', '$each', 'st-if', 'st-each'].includes(attr.name) || ((node.hasAttribute('$each') || node.hasAttribute('st-each')) && ['as', 'index'].includes(attr.name)));
		attrs.forEach(attr => {
			template.setAttribute(attr.name, attr.value);
			node.removeAttribute(attr.name);
		});
		node.parentNode.insertBefore(template, node);
		template.content.appendChild(node);
		template._ref = node._ref;
		node = template;
		return;
	}
	if (node.tagName === 'TEMPLATE' && (node.hasAttribute('$if') || node.hasAttribute('st-if')) && (node.hasAttribute('$each') || node.hasAttribute('st-each'))) {
		const template = document.createElement('TEMPLATE');
		const attrs = Array.from(node.attributes).filter(attr => ['$if', '$each', 'st-if', 'st-each'].includes(attr.name));
		const attr = attrs[attrs.length - 1];
		template.setAttribute(attr.name, attr.value);
		node.removeAttribute(attr.name);
		if (attr.name === '$each' || attr.name === 'st-each') {
			Array.from(node.attributes).filter(attr => ['as', 'index'].includes(attr.name)).forEach(attr => {
				template.setAttribute(attr.name, attr.value);
				node.removeAttribute(attr.name);
			});
		}
		Array.from(node.content.childNodes).forEach(child => {
			template.content.appendChild(child);
		});
		node.content.appendChild(template);
		template._ref = node._ref;
	}

	if (node.tagName === 'IMG' && (node.hasAttribute('src') || node.hasAttribute('_src') || node.hasAttribute('$src'))) {
		const imgNode = node;
		Promise.resolve().then(() => {
			const url = imgNode.getAttribute('_src') || imgNode.getAttribute('src');
			if (url) fetch(url, { cache: 'force-cache' }).then(r => r.text()).then(svgText => {
				const realSvg = new DOMParser().parseFromString(svgText, "image/svg+xml").querySelector('svg');
				if (realSvg) {
					Array.from(imgNode.attributes).forEach(attr => realSvg.setAttribute(attr.name, attr.value));
					imgNode.replaceWith(realSvg);
				}
			});
		});
	}

	if (node._thisObj !== undefined) scanObj.thisObj = node._thisObj || null;
	if (scanObj.thisObj === undefined) {
		let curr = node;
		while (curr && curr._thisObj === undefined) curr = curr.parentNode;
		scanObj.thisObj = curr ? curr._thisObj : null;
	}
	if (node._ref === undefined) {
		let curr = node;
		while (curr && curr._ref === undefined) curr = curr.parentNode;
		node._ref = curr ? { ...curr._ref } : {};
	}
	if (scanObj.extendVars === undefined) scanObj.extendVars = {};
	if (node._ref !== undefined) {
		Object.assign(node._ref, scanObj.extendVars);
		scanObj.extendVars = { ...node._ref };
	}
	_parseNode(node, scanObj);
	const nodes = [...(node.childNodes || [])];
	scanObj.extendVars = node._ref || scanObj.extendVars;
	nodes.forEach(child => _scanTree(child, { thisObj: scanObj.thisObj, extendVars: { ...node._ref } }));
};

export const _unbindTree = (node) => {
	if (node.nodeType !== 1) return;
	if (node._hasOnUnload) node.dispatchEvent(new Event('unload', { bubbles: false }));
	if (node._states) {
		node._states.forEach(stateMappings => {
			for (const [key, bindingSet] of stateMappings) {
				for (const binding of bindingSet) {
					if (binding.node === node) bindingSet.delete(binding);
				}
			}
		});
	}
	node.childNodes && node.childNodes.forEach(child => _unbindTree(child));
};

export const RefreshState = _scanTree;
