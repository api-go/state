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

const _isExpression = (name) => name.startsWith('$') || name.startsWith('st-');
const _getExpressionLevel = (name) => {
	if (name.startsWith('$$') || name.startsWith('st-st-')) return 2;
	if (name.startsWith('$') || name.startsWith('st-')) return 1;
	return 0;
};
const _getRealAttrName = (name, level) => {
	if (level === 2) return name.startsWith('$$') ? name.slice(2) : name.slice(6);
	if (level === 1) {
		if (name.startsWith('$')) return name.slice(1);
		if (name.startsWith('st-')) return name.slice(3);
	}
	return name;
};

if (typeof document !== 'undefined') {
	try { document.createElement('div').setAttribute('$t', '1'); } catch (e) {
		const originalSetAttribute = Element.prototype.setAttribute;
		Element.prototype.setAttribute = function (name, value) {
			if (!name.startsWith('$')) return originalSetAttribute.call(this, name, value);
			let prefix = name.startsWith('$$') ? 'st-st-' : 'st-';
			return originalSetAttribute.call(this, prefix + name.slice(name.startsWith('$$') ? 2 : 1), value);
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
	let result = binding.exp ? (binding.tpl ? _returnCode(binding.tpl, { thisNode: node }, node._thisObj || node, node._ref || null) : null) : binding.tpl;

	// Level 2 evaluation: Evaluate the result string as code again
	if (binding.exp === 2 && typeof result === 'string') {
		try {
			result = _returnCode(result, { thisNode: node }, node._thisObj || node, { ...node._ref });
		} catch (e) { }
	}
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
				else o[lk] = result;
			} else if (typeof result === 'object' && result != null && !Array.isArray(result)) {
				Object.assign(o, result);
			}
		}
	} else if (binding.attr) {
		const attr = binding.attr;
		if (attr === 'if') {
			if (!!result === !!node._lastIfResult) return;
			node._lastIfResult = !!result;
			if (result) {
				if (!node._renderedNodes || node._renderedNodes.length === 0) {
					node._children.forEach(child => {
						child._stManaged = true;
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
					keys = Array.from(result.keys()); getVal = k => result.get(k);
				} else if (typeof result[Symbol.iterator] === 'function') {
					const arr = Array.isArray(result) ? result : Array.from(result);
					keys = new Array(arr.length);
					for (let i = 0; i < arr.length; i++) keys[i] = i;
					getVal = k => arr[k];
				} else {
					keys = Object.keys(result); getVal = k => result[k];
				}

				if (!node._renderedNodes) node._renderedNodes = [];
				keys.forEach((k, i) => {
					const item = getVal(k);
					if (i < node._renderedNodes.length) {
						node._renderedNodes[i].forEach(child => {
							child._ref[indexName] = k;
							child._ref[asName] = item;
							_scanTree(child, { thisObj: node._thisObj, extendVars: child._ref });
						});
					} else {
						const newNodes = [];
						node._children.forEach(child => {
							const cloned = child.cloneNode(true);
							cloned._stManaged = true;
							cloned._ref = { ...node._ref, [indexName]: k, [asName]: item };
							cloned._thisObj = node._thisObj;
							node.parentNode.insertBefore(cloned, node);
							newNodes.push(cloned);
						});
						node._renderedNodes.push(newNodes);
					}
				});
				while (node._renderedNodes.length > keys.length) {
					node._renderedNodes.pop().forEach(child => { _clearRenderedNodes(child); child.remove(); });
				}
			} else {
				_clearRenderedNodes(node);
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
				if (node.value !== String(result ?? '')) node.value = result;
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
	if (node._bindings) {
		node._states = new Set();
		node._bindings.forEach(b => _updateBinding({ node, ...b }));
		if (node._hasOnUpdate) node.dispatchEvent(new Event('update', { bubbles: false }));
		if (node.tagName !== 'TEMPLATE') return;
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
		if (!node._children) node._children = [...node.content.childNodes];
		if (!node._renderedNodes) node._renderedNodes = [];
	}

	if (node._bindings && node.tagName !== 'TEMPLATE') return;

	let attrs = Array.from(node.attributes).filter(a => _isExpression(a.name) || a.name.includes('.'));
	if (node._thisObj && scanObj.thisObj) node._thisObj.parent = scanObj.thisObj;
	if (!node._thisObj) node._thisObj = scanObj.thisObj || null;
	if (!node._ref) node._ref = scanObj.extendVars || {};
	node._states = new Set();

	attrs.forEach(attr => {
		const exp = _getExpressionLevel(attr.name);
		const realAttrName = exp ? _getRealAttrName(attr.name, exp) : attr.name;
		if (exp && (node.tagName === 'TEMPLATE' || !['$if', '$each', 'st-if', 'st-each', '$$if', '$$each', 'st-st-if', 'st-st-each'].includes(attr.name))) node.removeAttribute(attr.name);
		if (realAttrName.startsWith('.')) _initBinding({ node, prop: realAttrName.split('.').filter(Boolean), tpl: attr.value, exp: 0 });
		else if (realAttrName.startsWith('on')) {
			const eventName = realAttrName.slice(2);
			if (eventName === 'update') node._hasOnUpdate = true;
			if (eventName === 'load' && !['BODY', 'IMG', 'IFRAME'].includes(node.tagName)) node._hasOnLoad = true;
			if (eventName === 'unload' && !['BODY', 'IMG', 'IFRAME'].includes(node.tagName)) node._hasOnUnload = true;
			node.addEventListener(eventName, (e) => _runCode(attr.value, { event: e, thisNode: node, ...(e.detail || {}) }, scanObj.thisObj || node, node._ref || {}));
		} else {
			if (realAttrName === 'bind') {
				node.addEventListener(node.tagName === 'TEXTAREA' || node.isContentEditable || node.type === 'text' || node.type === 'password' ? 'input' : 'change', (e) => {
					let newVal = node.isContentEditable ? e.target.innerHTML : (node.type === 'checkbox' ? e.target.checked : e.target.files || e.target.value || e.detail);
					setNoWriteBack(node); setDisableRunCodeError(true);
					if (node.type === 'checkbox' && node._checkboxMultiMode) _runCode(`!!checked ? (!${attr.value}.includes(val) && ${attr.value}.push(val)) : (index = ${attr.value}.indexOf(val), index > -1 && ${attr.value}.splice(index, 1))`, { val: node.value, checked: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {});
					else _runCode(attr.value + ' = val', { val: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {});
					setDisableRunCodeError(false); setNoWriteBack(null);
				});
				_initBinding({ node, attr: realAttrName, tpl: attr.value, exp });
			} else if (realAttrName === 'text' && !attr.value) { _initBinding({ node, attr: realAttrName, tpl: node.textContent, exp: 1 }); node.textContent = ''; }
			else if (attr.value) { 
				let tpl = _translate(attr.value); 
				_initBinding({ node, attr: realAttrName, tpl, exp }); 
			}
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
			if (!_isExpression(attr.name) && !attr.name.startsWith('.')) {
				const translated = _translate(attr.value);
				if (translated !== attr.value) attr.value = translated;
			}
		});
		node._stTranslated = true;
	}

	const triggerAttrs = ['$if', '$each', 'st-if', 'st-each', '$$if', '$$each', 'st-st-if', 'st-st-each'];
	if (node.tagName !== 'TEMPLATE' && triggerAttrs.some(t => node.hasAttribute(t))) {
		const template = document.createElement('TEMPLATE');
		const managed = Array.from(node.attributes).filter(attr => triggerAttrs.includes(attr.name) || ['as', 'index'].includes(attr.name));
		managed.forEach(attr => { template.setAttribute(attr.name, attr.value); node.removeAttribute(attr.name); });
		node.parentNode.insertBefore(template, node);
		template.content.appendChild(node);
		template._ref = node._ref;
		return;
	}
	if (node.tagName === 'TEMPLATE' && (node.hasAttribute('$if') || node.hasAttribute('st-if') || node.hasAttribute('$$if') || node.hasAttribute('st-st-if')) && (node.hasAttribute('$each') || node.hasAttribute('st-each') || node.hasAttribute('$$each') || node.hasAttribute('st-st-each'))) {
		const template = document.createElement('TEMPLATE');
		const attrs = Array.from(node.attributes).filter(attr => triggerAttrs.includes(attr.name));
		const attr = attrs[attrs.length - 1];
		template.setAttribute(attr.name, attr.value);
		node.removeAttribute(attr.name);
		if (attr.name.includes('each')) {
			Array.from(node.attributes).filter(a => ['as', 'index'].includes(a.name)).forEach(a => { template.setAttribute(a.name, a.value); node.removeAttribute(a.name); });
		}
		Array.from(node.content.childNodes).forEach(child => template.content.appendChild(child));
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
	if (scanObj.extendVars) Object.assign(node._ref, scanObj.extendVars);

	if (!scanObj.noBind) _parseNode(node, scanObj);

	const nodes = [...(node.childNodes || []), ...(node.tagName === 'TEMPLATE' ? Array.from(node.content.childNodes).map(c => (c._stNoBind = true, c)) : [])];
	const nextScanObj = { thisObj: scanObj.thisObj, extendVars: { ...node._ref }, noBind: scanObj.noBind };
	nodes.forEach(child => {
		if (!child._stManaged) {
			const wasNoBind = nextScanObj.noBind;
			if (child._stNoBind) { nextScanObj.noBind = true; delete child._stNoBind; }
			_scanTree(child, nextScanObj);
			nextScanObj.noBind = wasNoBind;
		}
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

export const ____RefreshState_Internal_Force_Full_Scan_Only_In_Extreme_Performance_Scenarios = _scanTree;
