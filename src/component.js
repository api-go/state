// src/component.js
import { NewState } from './observer.js';
import { $, $$ } from './dom-utils.js';

const _components = new Map();
const _pendingTemplates = [];

export const Component = {
    getTemplate: name => document.querySelector(`template[component="${name.toUpperCase()}"]`),
    register: (name, setupFunc, templateNode = null, ...globalNodes) => {
        _components.set(name.toUpperCase(), setupFunc);
        if (document.readyState !== 'loading') Component._addTemplate(name, templateNode, globalNodes);
        else _pendingTemplates.push([name, templateNode, globalNodes]);
    },
    exists: (name) => _components.has(name.toUpperCase()),
    getSetupFunction: (name) => _components.get(name.toUpperCase()),
    _addTemplate: (name, templateNode, globalNodes) => {
        if (templateNode) {
            const template = document.createElement('TEMPLATE');
            template.setAttribute('component', name.toUpperCase());
            template.content.appendChild(templateNode);
            document.body.appendChild(template);
        }
        if (globalNodes) globalNodes.forEach(node => document.body.appendChild(node));
    },
    _initPending: () => {
        _pendingTemplates.forEach(([name, templateNode, globalNodes]) => Component._addTemplate(name, templateNode, globalNodes));
        _pendingTemplates.length = 0;
    }
};

export function _mergeNode(from, to, scanObj, exists = {}) {
    if (from.attributes) {
        Array.from(from.attributes).forEach(attr => {
            if (attr.name === 'class') return;
            if (attr.name === 'style') {
                if (to.hasAttribute('style')) to.setAttribute('style', `${attr.value}; ${to.getAttribute('style')}`);
                else to.setAttribute('style', attr.value);
            } else if (!to.hasAttribute(attr.name)) {
                to.setAttribute(attr.name, attr.value);
            }
        });
    }
    to.classList.add(...from.classList);
    Array.from(from.childNodes).forEach(child => to.appendChild(child));
    if (from.tagName && Component.exists(from.tagName)) _makeComponent(from.tagName, to, scanObj, exists);
}

export function _makeComponent(name, node, scanObj, exists = {}) {
    if (exists[name]) return;
    exists[name] = true;
    if (scanObj.thisObj) {
        Array.from(node.attributes).forEach(attr => {
            if ((attr.name.startsWith('$') || attr.name.startsWith('st-')) && attr.value.includes('this.')) {
                attr.value = attr.value.replace(/\bthis\./g, 'this.parent.');
            }
        });
    }
    const componentFunc = Component.getSetupFunction(name);
    const slots = {};
    Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && child.hasAttribute('slot')) {
            slots[child.getAttribute('slot')] = child;
            child.removeAttribute('slot');
        }
    });
    node.innerHTML = '';
    node.state = NewState(node.state || {});
    const template = Component.getTemplate(name);
    if (template) {
        const tplnode = template.content.cloneNode(true);
        if (tplnode.childNodes.length) {
            const rootNode = Array.from(tplnode.childNodes).find(n => n.nodeType === Node.ELEMENT_NODE);
            if (rootNode) _mergeNode(rootNode, node, scanObj, exists);
            $$(node, '[slot-id]').forEach(placeholder => {
                const slotName = placeholder.getAttribute('slot-id');
                if (slots[slotName]) {
                    placeholder.removeAttribute('slot-id');
                    placeholder.innerHTML = '';
                    _mergeNode(slots[slotName], placeholder, scanObj, exists);
                }
            });
        }
    }
    if (componentFunc) componentFunc(node);
}
