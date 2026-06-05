// src/dom.js
import { _runCode, _returnCode, setDisableRunCodeError } from './core.js';
import { getActiveBinding, setActiveBinding, getNoWriteBack, setNoWriteBack, NewState, onNotifyUpdate } from './observer.js';
import { Component, _makeComponent, _mergeNode } from './component.js';
import { $, $$ } from './dom-utils.js';

let _translator = (text, args) => {
	if (!text || typeof text !== 'string') return text;
	return text.replace(/\{(.+?)\}/g, (match, key) => args.hasOwnProperty(key) ? args[key] : match);
};
export const SetTranslator = (fn) => _translator = fn;

const _translate = (text) => {
	if (!text || typeof text !== 'string' || !text.includes('{#')) return text;
	return text.replace(/\{#(.+?)#\}/g, (m, content) => {
		const parts = content.split('||').map(s => s.trim());
		const args = {};
		if (parts.length > 1) {
			const matches = parts[0].match(/\{(.+?)\}/g);
			if (matches) matches.forEach((match, i) => args[match.substring(1, match.length - 1)] = parts[i + 1] || '');
		}
		return _translator(parts[0], args);
	});
};

if (typeof document !== 'undefined') {
	try { document.createElement('div').setAttribute('$t', '1'); } catch (e) {
		const originalSetAttribute = Element.prototype.setAttribute;
		Element.prototype.setAttribute = function (name, value) {
			if (!name.startsWith('$')) return originalSetAttribute.call(this, name, value);
			const prefix = name.startsWith('$$') ? 'st-st-' : 'st-';
			return originalSetAttribute.call(this, prefix + name.substring(name.startsWith('$$') ? 2 : 1), value);
		};
	}
}

export { $, $$ };

onNotifyUpdate((binding) => _updateBinding(binding));

export function _clearRenderedNodes(node) {
	if (node._renderedNodes) node._renderedNodes.forEach(nodes => nodes.forEach(child => {
		child.remove();
		if (child._renderedNodes) _clearRenderedNodes(child);
	}));
}

export function _updateBinding(binding) {
	const node = binding.node;
	if (!node.isConnected && node.tagName !== 'TEMPLATE') return;

	setActiveBinding(binding);
	if (window.__perfTrace) window.__perfTrace.evalCount++;
	const evalStart = window.__perfTrace ? performance.now() : 0;
	let result = binding.exp ? (binding.tpl ? _returnCode(binding.tpl, { thisNode: node }, node._thisObj || node, node._ref || null) : null) : binding.tpl;

	if (binding.exp === 2 && typeof result === 'string') {
		try { result = _returnCode(result, { thisNode: node }, node._thisObj || node, node._ref || null); } catch (e) { }
	}

	if (window.__perfTrace) window.__perfTrace.evalTotal += (performance.now() - evalStart);
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
			const lk = prop[prop.length - 1];
			if (lk) {
				if (typeof result === 'object' && result != null && !Array.isArray(result) && o[lk] == null) o[lk] = {};
				const lo = o[lk];
				if (typeof lo === 'object' && lo != null && lo.__watch) Object.assign(lo, result);
				else { if (o[lk] !== result) o[lk] = result; }
			} else if (typeof result === 'object' && result != null && !Array.isArray(result)) {
				Object.assign(o, result);
			}
		}
	} else if (binding.attr) {
		const attr = binding.attr;
		if (attr === 'if') {
			if (result) {
				if (!node._renderedNodes || node._renderedNodes.length === 0) {
					node._children.forEach(child => {
						child._stManaged = true;
						node.parentNode.insertBefore(child, node);
						child._ref = { ...node._ref };
					});
					node._renderedNodes = [node._children];
				} else {
					node._renderedNodes[0].forEach(child => _scanTree(child, { thisObj: node._thisObj, extendVars: child._ref }));
				}
			} else {
				_clearRenderedNodes(node);
				node._renderedNodes = [];
			}
		} else if (attr === 'each') {
			if (result && typeof result === 'object') {
				const asName = node.getAttribute('as') || 'item';
				const indexName = node.getAttribute('index') || 'index';
				const keyName = node.getAttribute('key');
				let keys, getVal;
				if (result instanceof Map) {
					keys = Array.from(result.keys()); getVal = k => result.get(k);
				} else if (typeof result[Symbol.iterator] === 'function') {
					const arr = Array.isArray(result) ? result : Array.from(result);
					keys = new Array(arr.length);
					for (let i = 0; i < arr.length; i++) keys[i] = i;
					getVal = k => arr[k];
				} else {
					keys = Object.keys(result); getVal = k => result[k];
				}

				if (!node._keyedNodes) node._keyedNodes = new Map();
				const newKeyedNodes = new Map();
				const currentRenderedNodes = [];

				keys.forEach((k, i) => {
					const item = getVal(k);
					const rawKey = keyName ? (item && typeof item === 'object' ? item[keyName] : item) : k;
					// Safety: Handle potential duplicate keys or undefined keys
					const keyVal = (rawKey === undefined || rawKey === null || newKeyedNodes.has(rawKey)) ? `st_key_fallback_${i}_${Math.random()}` : rawKey;

					let existingNodes = node._keyedNodes.get(keyVal);

					if (existingNodes) {
						// Reuse existing nodes
						node._keyedNodes.delete(keyVal);
						existingNodes.forEach(child => {
							if (window.__statePerformanceTelemetry) window.__statePerformanceTelemetry.reuseCount++;
							let scopeChanged = false;
							for (let key in node._ref) {
								if (key === asName || key === indexName) continue;
								if (child._ref[key] !== node._ref[key]) {
									child._ref[key] = node._ref[key];
									scopeChanged = true;
								}
							}
							const indexChanged = child._ref[indexName] !== k;
							if (indexChanged) child._ref[indexName] = k;

							if (child._ref[asName] !== item || scopeChanged) {
								child._ref[asName] = item;
								if (window.__statePerformanceTelemetry) window.__statePerformanceTelemetry.scanCount++;
								_scanTree(child, { thisObj: node._thisObj, extendVars: child._ref });
							} else if (node.parentNode.lastChild !== child) {
								// Just move to the end to maintain order
								if (window.__statePerformanceTelemetry) window.__statePerformanceTelemetry.moveCount++;
								node.parentNode.insertBefore(child, node);
							}
						});
					} else {
						// Create new nodes
						existingNodes = [];
						node._children.forEach(child => {
							const cloned = child.cloneNode(true);
							cloned._stManaged = true;
							cloned._ref = { ...node._ref, [indexName]: k, [asName]: item };
							cloned._thisObj = node._thisObj;
							node.parentNode.insertBefore(cloned, node);
							existingNodes.push(cloned);
						});
					}
					newKeyedNodes.set(keyVal, existingNodes);
					currentRenderedNodes.push(existingNodes);
					// Ensure DOM order
					existingNodes.forEach(child => node.parentNode.insertBefore(child, node));
				});

				// Cleanup old nodes
				node._keyedNodes.forEach(nodes => nodes.forEach(child => { _clearRenderedNodes(child); child.remove(); }));
				node._keyedNodes = newKeyedNodes;
				node._renderedNodes = currentRenderedNodes;
			} else {
				_clearRenderedNodes(node);
				if (node._keyedNodes) node._keyedNodes.forEach(nodes => nodes.forEach(child => child.remove()));
				node._keyedNodes = new Map();
				node._renderedNodes = [];
			}
		} else if (attr === 'bind') {
			if (['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName) && !node.hasAttribute('autocomplete')) node.setAttribute('autocomplete', 'off');
			if (node.type === 'checkbox') {
				if (node.value !== 'on' && !result) { _runCode(`${binding.tpl} = []`, { thisNode: node }, node._thisObj || node, node._ref || {}); result = []; }
				node._checkboxMultiMode = result instanceof Array;
				const isChecked = result instanceof Array ? result.includes(node.value) : !!result;
				if (node.checked !== isChecked) node.checked = isChecked;
			} else if (node.type === 'radio') {
				if (node.checked !== (node.value === String(result ?? ''))) node.checked = (node.value === String(result ?? ''));
			} else if ('value' in node && node.type !== 'file') {
				setTimeout(() => { if (node.value !== String(result ?? '')) node.value = result; });
			} else if (node.isContentEditable) {
				if (node.innerHTML !== String(result ?? '')) node.innerHTML = result;
			}
			node.dispatchEvent(new CustomEvent('bind', { bubbles: false, detail: result }));
		} else {
			if (['checked', 'disabled', 'readonly'].includes(attr)) result = !!result;
			if (typeof result === 'boolean') result ? node.setAttribute(attr, '') : node.removeAttribute(attr);
			else if (result !== undefined) {
				if (typeof result !== 'string') result = JSON.stringify(result);
				if (attr === 'text') node.textContent = result ?? '';
				else if (attr === 'html') node.innerHTML = result ?? '';
				else if (node.tagName === 'IMG' && attr === 'src' && result.includes('.svg')) node.setAttribute('_src', result ?? '');
				else node.setAttribute(attr, result ?? '');
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
	let hasBindings = false;
	if (node._bindings) {
		node._states = new Set();
		node._bindings.forEach(b => _updateBinding({ node, ...b }));
		if (node._hasOnUpdate) node.dispatchEvent(new Event('update', { bubbles: false }));
		hasBindings = true;
	}

	if (Component.exists(node.tagName) && !node._componentInitialized) {
		Array.from(node.attributes).forEach(attr => {
			if (attr.name.startsWith('$.')) {
				const realAttrName = attr.name.slice(2);
				let tpl = _translate(attr.value);
				if (tpl.includes('this.')) tpl = tpl.replace(/\bthis\./g, 'this.parent.');
				const result = _returnCode(tpl, { thisNode: node }, { parent: scanObj.thisObj || node }, node._ref || {});
				let o = node;
				const prop = realAttrName.split('.');
				for (let i = 0; i < prop.length - 1; i++) { if (prop[i]) o = (o[prop[i]] ??= {}); }
				o[prop[prop.length - 1]] = result;
				node.removeAttribute(attr.name);
			}
		});
		_makeComponent(node.tagName, node, scanObj);
		$$(node, '[slot-id]').forEach(p => p.removeAttribute('slot-id'));
		node._componentInitialized = true;
		if (!node._thisObj) node._thisObj = node;
	}

	if (node.tagName === 'TEMPLATE') {
		node._children = [...node.content.childNodes];
		if (!node._renderedNodes) node._renderedNodes = [];
	}

	if (hasBindings) return;

	let attrs = [];
	const triggerAttrs = ['$if', '$each', 'st-if', 'st-each', '$$if', '$$each', 'st-st-if', 'st-st-each'];
	if (node.tagName === 'TEMPLATE') {
		triggerAttrs.forEach(n => node.hasAttribute(n) && attrs.push(node.getAttributeNode(n)));
	} else {
		attrs = Array.from(node.attributes).filter(a => (a.name.startsWith('$') || a.name.startsWith('st-')) && !triggerAttrs.includes(a.name) || a.name.includes('.'));
	}

	if (node._thisObj && scanObj.thisObj) node._thisObj.parent = scanObj.thisObj;
	if (!node._thisObj) node._thisObj = scanObj.thisObj || null;
	if (!node._ref) node._ref = scanObj.extendVars || {};
	node._states = new Set();

	attrs.forEach(attr => {
		let exp = 0;
		if (attr.name.startsWith('$$') || attr.name.startsWith('st-st-')) exp = 2;
		else if (attr.name.startsWith('$') || attr.name.startsWith('st-')) exp = 1;

		const realAttrName = exp === 2 ? (attr.name.startsWith('$$') ? attr.name.slice(2) : attr.name.slice(6)) : (exp === 1 ? (attr.name.startsWith('$') ? attr.name.slice(1) : attr.name.slice(3)) : attr.name);
		let tpl = attr.value;
		node.removeAttribute(attr.name);
		if (realAttrName.startsWith('.')) _initBinding({ node, prop: realAttrName.split('.'), tpl, exp });
		else if (realAttrName.startsWith('on')) {
			const eventName = realAttrName.slice(2);
			if (eventName === 'update') node._hasOnUpdate = true;
			if (eventName === 'load' && !['BODY', 'IMG', 'IFRAME'].includes(node.tagName)) node._hasOnLoad = true;
			if (eventName === 'unload' && !['BODY', 'IMG', 'IFRAME'].includes(node.tagName)) node._hasOnUnload = true;
			node.addEventListener(eventName, (e) => _runCode(tpl, { event: e, thisNode: node, ...(e.detail || {}) }, scanObj.thisObj || node, node._ref || {}));
		} else {
			if (realAttrName === 'bind') {
				node.addEventListener(node.tagName === 'TEXTAREA' || node.isContentEditable || node.type === 'text' || node.type === 'password' ? 'input' : 'change', (e) => {
					let newVal = node.isContentEditable ? e.target.innerHTML : (node.type === 'checkbox' ? e.target.checked : e.target.files || e.target.value || e.detail);
					setNoWriteBack(node); setDisableRunCodeError(true);
					if (node.type === 'checkbox' && node._checkboxMultiMode) _runCode(`!!checked ? (!${tpl}.includes(val) && ${tpl}.push(val)) : (index = ${tpl}.indexOf(val), index > -1 && ${tpl}.splice(index, 1))`, { val: node.value, checked: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {});
					else _runCode(`${tpl} = val`, { val: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {});
					setDisableRunCodeError(false); setNoWriteBack(null);
				});
			} else if (realAttrName === 'text' && !tpl) { tpl = node.textContent; node.textContent = ''; }
			if (tpl) { tpl = _translate(tpl); _initBinding({ node, attr: realAttrName, tpl, exp }); }
		}
	});

	if (node._hasOnLoad || node._componentInitialized) Promise.resolve().then(() => node.dispatchEvent(new Event('load', { bubbles: false })));
	if (node._hasOnUpdate) node.dispatchEvent(new Event('update', { bubbles: false }));
	if (node._thisObj) scanObj.thisObj = node._thisObj;
};

export const _scanTree = (node, scanObj = {}) => {
	if (node.nodeType === 3) {
		if (node._stTranslated) return;
		const translated = _translate(node.textContent);
		if (translated !== node.textContent) node.textContent = translated;
		node._stTranslated = true; return;
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

	let resolvedThisObj = node._thisObj;
	let resolvedRef = node._ref;

	if (resolvedThisObj === undefined || resolvedRef === undefined) {
		let curr = node;
		while (curr && (resolvedThisObj === undefined || resolvedRef === undefined)) {
			if (resolvedThisObj === undefined && curr._thisObj !== undefined) resolvedThisObj = curr._thisObj;
			if (resolvedRef === undefined && curr._ref !== undefined) resolvedRef = { ...curr._ref };
			curr = curr.parentNode;
		}
	}

	if (resolvedThisObj === undefined) resolvedThisObj = scanObj.thisObj;
	if (resolvedRef === undefined) resolvedRef = scanObj.extendVars;

	const triggerAttrs = ['$if', '$each', 'st-if', 'st-each', '$$if', '$$each', 'st-st-if', 'st-st-each'];
	const eachAttrs = ['$each', 'st-each', '$$each', 'st-st-each'];
	if (node.tagName !== 'TEMPLATE' && triggerAttrs.some(t => node.hasAttribute(t))) {
		const template = document.createElement('TEMPLATE');
		const attrs = Array.from(node.attributes).filter(attr => triggerAttrs.includes(attr.name) || (eachAttrs.some(t => node.hasAttribute(t)) && ['as', 'index'].includes(attr.name)));
		attrs.forEach(attr => { template.setAttribute(attr.name, attr.value); node.removeAttribute(attr.name); });
		node.parentNode.insertBefore(template, node);
		template.content.appendChild(node);
		template._ref = resolvedRef;
		template._thisObj = resolvedThisObj; // Crucial fix: Propagate context
		delete node._stScanned;
		_scanTree(template, scanObj);
		return;
	}
	if (node.isConnected) node._stScanned = true;

	if (node.tagName === 'TEMPLATE' && (node.hasAttribute('$if') || node.hasAttribute('st-if') || node.hasAttribute('$$if') || node.hasAttribute('st-st-if')) && (node.hasAttribute('$each') || node.hasAttribute('st-each') || node.hasAttribute('$$each') || node.hasAttribute('st-st-each'))) {
		const template = document.createElement('TEMPLATE');
		const attrs = Array.from(node.attributes).filter(attr => triggerAttrs.includes(attr.name));
		const attr = attrs[attrs.length - 1];
		template.setAttribute(attr.name, attr.value);
		node.removeAttribute(attr.name);
		if (eachAttrs.includes(attr.name)) {
			Array.from(node.attributes).filter(attr => ['as', 'index'].includes(attr.name)).forEach(attr => { template.setAttribute(attr.name, attr.value); node.removeAttribute(attr.name); });
		}
		Array.from(node.content.childNodes).forEach(child => template.content.appendChild(child));
		node.content.appendChild(template);
		template._ref = resolvedRef;
		template._thisObj = resolvedThisObj; // Crucial fix: Propagate context
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
	else {
		let curr = node;
		while (curr && curr._thisObj === undefined) curr = curr.parentNode;
		scanObj.thisObj = curr ? curr._thisObj : null;
	}
	if (node._ref === undefined) {
		let curr = node;
		while (curr && curr._ref === undefined) curr = curr.parentNode;
		node._ref = curr ? { ...curr._ref } : {};
	}
	if (node._refExt !== undefined) {
		Object.assign(node._ref, node._refExt);
	}
	if (scanObj.extendVars) Object.assign(node._ref, scanObj.extendVars);

	_parseNode(node, { ...scanObj });

	const nodes = [...(node.childNodes || [])];
	const nextScanObj = { thisObj: scanObj.thisObj, extendVars: { ...node._ref } };
	nodes.forEach(child => {
		if (!child._stManaged) _scanTree(child, nextScanObj);
	});
};

export const _unbindTree = (node) => {
	if (node.nodeType !== 1) return;
	if (node._hasOnUnload) node.dispatchEvent(new Event('unload', { bubbles: false }));
	if (node._states) node._states.forEach(mappings => {
		for (const [key, bindingSet] of mappings) {
			for (const binding of bindingSet) { if (binding.node === node) bindingSet.delete(binding); }
		}
	});
	node.childNodes && node.childNodes.forEach(child => _unbindTree(child));
};

export const RefreshState = _scanTree;
