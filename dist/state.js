var _a;
let _activeBinding = null;
let _noWriteBack = null;
let _updateBindingFn = null;
let _updateDepth = 0;
const MAX_UPDATE_DEPTH = 100;
function setActiveBinding(val) {
  _activeBinding = val;
}
function setNoWriteBack(val) {
  _noWriteBack = val;
}
function onNotifyUpdate(fn) {
  _updateBindingFn = fn;
}
function NewState(defaults = {}, getter = null, setter = null) {
  if (defaults && defaults.__watch) return defaults;
  const _defaults = {};
  const _stateMappings = /* @__PURE__ */ new Map();
  const _watchers = /* @__PURE__ */ new Map();
  const _watchFunc = (k, cb) => {
    if (!_watchers.has(k)) _watchers.set(k, /* @__PURE__ */ new Set());
    !cb ? _watchers.get(k).clear() : _watchers.get(k).add(cb);
  };
  const _unwatchFunc = (k, cb) => {
    if (!_watchers.has(k)) _watchers.set(k, /* @__PURE__ */ new Set());
    _watchers.get(k).delete(cb);
  };
  const _getter = getter || ((k) => _defaults[k]);
  const _setter = setter || ((k, v) => _defaults[k] = v);
  Object.assign(_defaults, defaults);
  return new Proxy(_defaults, {
    get(target, key) {
      if (key === "__watch") return _watchFunc;
      if (key === "__unwatch") return _unwatchFunc;
      if (_activeBinding) {
        if (!_stateMappings.has(key)) _stateMappings.set(key, /* @__PURE__ */ new Set());
        const bindingSet = _stateMappings.get(key);
        bindingSet.add(_activeBinding);
        if (!_activeBinding._sets) _activeBinding._sets = /* @__PURE__ */ new Set();
        _activeBinding._sets.add(bindingSet);
      }
      return _getter(key);
    },
    set(target, key, value) {
      if (_getter(key) !== value) {
        _setter(key, value);
      }
      if (_watchers.has(key)) {
        _watchers.get(key).forEach((cb) => {
          const r = cb(value);
          if (r !== void 0) {
            value = r;
            target[key] = value;
          }
        });
      }
      if (_watchers.has(null)) {
        _watchers.get(null).forEach((cb) => cb(value));
      }
      if (_stateMappings.has(key)) {
        if (_updateDepth > MAX_UPDATE_DEPTH) return console.error("Recursive update detected at key:", key), true;
        _updateDepth++;
        try {
          const bindings = _stateMappings.get(key);
          for (const binding of bindings) {
            if (!binding.node.isConnected) {
              bindings.delete(binding);
              continue;
            }
            if (_noWriteBack !== binding.node && _updateBindingFn) {
              _updateBindingFn(binding);
            }
          }
        } finally {
          _updateDepth--;
        }
      }
      return true;
    }
  });
}
const $ = (a, b) => b ? a.querySelector(b) : document.querySelector(a);
const $$ = (a, b) => b ? a.querySelectorAll(b) : document.querySelectorAll(a);
let _disableRunCodeError = false;
function setDisableRunCodeError(value) {
  _disableRunCodeError = value;
}
const _fnCache = /* @__PURE__ */ new Map();
function _runCode(code, vars, thisObj, extendVars) {
  const argKeys = [...Object.keys(extendVars || {}), ...Object.keys(vars || {})];
  const argValues = [...Object.values(extendVars || {}), ...Object.values(vars || {})];
  const cacheKey = code + argKeys.join(",");
  try {
    let fn = _fnCache.get(cacheKey);
    if (!fn) {
      fn = new Function(...argKeys, code);
      _fnCache.set(cacheKey, fn);
    }
    return fn.apply(thisObj, argValues);
  } catch (e) {
    if (!_disableRunCodeError) console.error(e, extendVars, [code, extendVars, vars, thisObj]);
    return null;
  }
}
function _returnCode(code, vars, thisObj, extendVars) {
  if (code.includes("${")) return _runCode("return `" + code + "`", vars, thisObj, extendVars);
  else return _runCode("return " + code, vars, thisObj, extendVars);
}
let _translator = (text, args) => {
  if (!text || typeof text !== "string") return text;
  return text.replace(/\{(.+?)\}/g, (match, key) => {
    return args.hasOwnProperty(key) ? args[key] : match;
  });
};
const SetTranslator = (fn) => _translator = fn;
const _translate = (text) => {
  if (!text || typeof text !== "string" || !text.includes("{#")) return text;
  return text.replace(/\{#(.+?)#\}/g, (m, content) => {
    const parts = content.split("||").map((s) => s.trim());
    const rawText = parts[0];
    const args = {};
    if (parts.length > 1) {
      const matches = rawText.match(/\{(.+?)\}/g);
      if (matches) matches.forEach((match, i) => {
        const key = match.substring(1, match.length - 1);
        args[key] = parts[i + 1] || "";
      });
    }
    return _translator(rawText, args);
  });
};
if (typeof document !== "undefined") {
  try {
    document.createElement("div").setAttribute("$t", "1");
  } catch (e) {
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if (!name.startsWith("$")) return originalSetAttribute.call(this, name, value);
      return originalSetAttribute.call(this, "st-" + name.substring(1), value);
    };
  }
}
onNotifyUpdate((binding) => _updateBinding(binding));
function _clearRenderedNodes(node) {
  if (node._renderedNodes) node._renderedNodes.forEach((nodes) => {
    nodes.forEach((child) => {
      child.remove();
      if (child._renderedNodes) _clearRenderedNodes(child);
    });
  });
}
function _updateBinding(binding) {
  const node = binding.node;
  const tpl = binding.tpl;
  const exp = binding.exp;
  setActiveBinding(binding);
  let result = exp ? tpl ? _returnCode(tpl, { thisNode: node }, node._thisObj || node, node._ref || null) : null : tpl;
  setActiveBinding(null);
  if (binding.prop) {
    const prop = binding.prop;
    let o = node;
    for (let i = 0; i < prop.length - 1; i++) {
      if (!prop[i]) continue;
      if (o[prop[i]] == null) o[prop[i]] = {};
      o = o[prop[i]];
      if (typeof o !== "object") break;
    }
    if (typeof o === "object" && o !== null) {
      const resultIsObject = typeof result === "object" && result != null && !Array.isArray(result);
      const lk = prop[prop.length - 1];
      if (lk) {
        if (resultIsObject && o[lk] == null) o[lk] = {};
        const lo = o[lk];
        if (typeof lo === "object" && lo != null && lo.__watch) Object.assign(lo, result);
        else o[lk] = result;
      } else if (resultIsObject && typeof o === "object") {
        Object.assign(o, result);
      }
    }
  } else if (binding.attr) {
    const attr = binding.attr;
    if (attr === "if") {
      if (result) {
        if (!node._renderedNodes || node._renderedNodes.length === 0) {
          node._children.forEach((child) => {
            node.parentNode.insertBefore(child, node);
            child._ref = { ...node._ref };
          });
          node._renderedNodes = [node._children];
        }
      } else {
        _clearRenderedNodes(node);
        node._renderedNodes = [];
      }
    } else if (attr === "each") {
      if (result && typeof result === "object") {
        const asName = node.getAttribute("as") || "item";
        const indexName = node.getAttribute("index") || "index";
        let keys, getVal;
        if (result instanceof Map) {
          keys = Array.from(result.keys());
          getVal = (k) => result.get(k);
        } else if (typeof result[Symbol.iterator] === "function") {
          const arr = Array.isArray(result) ? result : Array.from(result);
          keys = new Array(arr.length);
          for (let i = 0; i < arr.length; i++) keys[i] = i;
          getVal = (k) => arr[k];
        } else {
          keys = Object.keys(result);
          getVal = (k) => result[k];
        }
        keys.forEach((k, i) => {
          const item = getVal(k);
          if (node._renderedNodes && i < node._renderedNodes.length) {
            node._renderedNodes[i].forEach((child) => {
              child._ref[indexName] = k;
              child._ref[asName] = item;
              _scanTree(child);
            });
          } else {
            const newNodes = [];
            if (!node._renderedNodes) node._renderedNodes = [];
            node._children.forEach((child) => {
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
          node._renderedNodes[node._renderedNodes.length - 1].forEach((child) => {
            _clearRenderedNodes(child);
            child.remove();
          });
          node._renderedNodes.pop();
        }
      } else {
        _clearRenderedNodes(node);
        node._renderedNodes = [];
      }
    } else if (attr === "bind") {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(node.tagName)) {
        if (!node.hasAttribute("autocomplete")) node.setAttribute("autocomplete", "off");
      }
      if (node.type === "checkbox") {
        if (node.value !== "on" && !result) {
          _runCode(`${tpl} = []`, { thisNode: node }, node._thisObj || node, node._ref || {});
          result = [];
        }
        node._checkboxMultiMode = result instanceof Array;
        const isChecked = result instanceof Array ? result.includes(node.value) : !!result;
        if (node.checked !== isChecked) node.checked = isChecked;
      } else if (node.type === "radio") {
        if (node.checked !== (node.value === String(result ?? ""))) node.checked = node.value === String(result ?? "");
      } else if ("value" in node && node.type !== "file") {
        setTimeout(() => {
          if (node.value !== String(result ?? "")) node.value = result;
        });
      } else if (node.isContentEditable) {
        if (node.innerHTML !== String(result ?? "")) node.innerHTML = result;
      }
      node.dispatchEvent(new CustomEvent("bind", { bubbles: false, detail: result }));
    } else {
      if (["checked", "disabled", "readonly"].includes(attr)) result = !!result;
      if (typeof result === "boolean") {
        result ? node.setAttribute(attr, "") : node.removeAttribute(attr);
      } else if (result !== void 0) {
        if (typeof result !== "string") result = JSON.stringify(result);
        if (attr === "text") {
          node.textContent = result ?? "";
        } else if (attr === "html") {
          node.innerHTML = result ?? "";
        } else if (node.tagName === "IMG" && attr === "src" && result.includes(".svg")) {
          node.setAttribute("_src", result ?? "");
        } else {
          node.setAttribute(attr, result ?? "");
        }
      }
    }
  }
}
const _initBinding = (binding) => {
  if (!binding.node._bindings) binding.node._bindings = [];
  binding.node._bindings.push(binding);
  _updateBinding(binding);
};
const _parseNode = (node, scanObj) => {
  if (Component.exists(node.tagName) && !node._componentInitialized) {
    node._componentInitialized = true;
    _makeComponent(node.tagName, node, scanObj);
    $$(node, "[slot-id]").forEach((placeholder) => placeholder.removeAttribute("slot-id"));
    if (!node._thisObj) node._thisObj = node;
  }
  if (node._bindings) {
    node._bindings.forEach((binding) => _updateBinding(binding));
    if (node._hasOnUpdate) node.dispatchEvent(new Event("update", { bubbles: false }));
    return;
  }
  let attrs = [];
  if (node.tagName === "TEMPLATE") {
    node._children = [...node.content.childNodes];
    node._renderedNodes = [];
    if (node.hasAttribute("$if")) attrs.push(node.getAttributeNode("$if"));
    else if (node.hasAttribute("$each")) attrs.push(node.getAttributeNode("$each"));
    else if (node.hasAttribute("st-if")) attrs.push(node.getAttributeNode("st-if"));
    else if (node.hasAttribute("st-each")) attrs.push(node.getAttributeNode("st-each"));
  } else {
    attrs = Array.from(node.attributes).filter((attr) => (attr.name.startsWith("$") || attr.name.startsWith("st-")) && !["$if", "$each", "st-if", "st-each"].includes(attr.name) || attr.name.includes("."));
  }
  if (node._thisObj && scanObj.thisObj) node._thisObj.parent = scanObj.thisObj;
  if (!node._thisObj) node._thisObj = scanObj.thisObj || null;
  if (!node._ref) node._ref = scanObj.extendVars || {};
  attrs.forEach((attr) => {
    const exp = attr.name.startsWith("$") || attr.name.startsWith("st-");
    const realAttrName = exp ? attr.name.slice(attr.name.startsWith("$") ? 1 : 3) : attr.name;
    let tpl = attr.value;
    node.removeAttribute(attr.name);
    if (realAttrName.startsWith(".")) {
      _initBinding({ node, prop: realAttrName.split("."), tpl, exp });
    } else {
      if (realAttrName.startsWith("on")) {
        if (realAttrName === "onupdate") node._hasOnUpdate = true;
        if (realAttrName === "onload" && !["BODY", "IMG", "IFRAME"].includes(node.tagName)) node._hasOnLoad = true;
        if (realAttrName === "onunload" && !["BODY", "IMG", "IFRAME"].includes(node.tagName)) node._hasOnUnload = true;
        ((node2, thisObj) => {
          node2.addEventListener(realAttrName.slice(2), (e) => {
            _runCode(tpl, { event: e, thisNode: node2, ...e.detail || {} }, thisObj || node2, node2._ref || {});
          });
        })(node, scanObj.thisObj);
      } else {
        if (realAttrName === "bind") {
          node.addEventListener(node.tagName === "TEXTAREA" || node.isContentEditable || node.type === "text" || node.type === "password" ? "input" : "change", (e) => {
            let newVal = node.isContentEditable ? e.target.innerHTML : node.type === "checkbox" ? e.target.checked : e.target.files || e.target.value || e.detail;
            setNoWriteBack(node);
            setDisableRunCodeError(true);
            if (node.type === "checkbox" && node._checkboxMultiMode) {
              _runCode(`!!checked ? (!${tpl}.includes(val) && ${tpl}.push(val)) : (index = ${tpl}.indexOf(val), index > -1 && ${tpl}.splice(index, 1))`, { val: node.value, checked: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {});
            } else {
              _runCode(`${tpl} = val`, { val: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {});
            }
            setDisableRunCodeError(false);
            setNoWriteBack(null);
          });
        } else if (realAttrName === "text" && !tpl) {
          tpl = node.textContent;
          node.textContent = "";
        }
        if (tpl) {
          tpl = _translate(tpl);
          _initBinding({ node, attr: realAttrName, tpl, exp });
        }
      }
    }
  });
  if (node._hasOnLoad || node._componentInitialized) {
    ((node2) => {
      Promise.resolve().then(() => node2.dispatchEvent(new Event("load", { bubbles: false })));
    })(node);
  }
  if (node._hasOnUpdate) node.dispatchEvent(new Event("update", { bubbles: false }));
  if (node._thisObj) scanObj.thisObj = node._thisObj;
};
const _scanTree = (node, scanObj = {}) => {
  if (node.nodeType === 3) {
    const translated = _translate(node.textContent);
    if (translated !== node.textContent) node.textContent = translated;
    return;
  }
  if (node.nodeType !== 1) return;
  Array.from(node.attributes).forEach((attr) => {
    if (!attr.name.startsWith("$") && !attr.name.startsWith("st-") && !attr.name.startsWith(".")) {
      const translated = _translate(attr.value);
      if (translated !== attr.value) attr.value = translated;
    }
  });
  if (node.tagName !== "TEMPLATE" && (node.hasAttribute("$if") || node.hasAttribute("$each") || node.hasAttribute("st-if") || node.hasAttribute("st-each"))) {
    const template = document.createElement("TEMPLATE");
    const attrs = Array.from(node.attributes).filter((attr) => ["$if", "$each", "st-if", "st-each"].includes(attr.name) || (node.hasAttribute("$each") || node.hasAttribute("st-each")) && ["as", "index"].includes(attr.name));
    attrs.forEach((attr) => {
      template.setAttribute(attr.name, attr.value);
      node.removeAttribute(attr.name);
    });
    node.parentNode.insertBefore(template, node);
    template.content.appendChild(node);
    template._ref = node._ref;
    node = template;
    return;
  }
  if (node.tagName === "TEMPLATE" && (node.hasAttribute("$if") || node.hasAttribute("st-if")) && (node.hasAttribute("$each") || node.hasAttribute("st-each"))) {
    const template = document.createElement("TEMPLATE");
    const attrs = Array.from(node.attributes).filter((attr2) => ["$if", "$each", "st-if", "st-each"].includes(attr2.name));
    const attr = attrs[attrs.length - 1];
    template.setAttribute(attr.name, attr.value);
    node.removeAttribute(attr.name);
    if (attr.name === "$each" || attr.name === "st-each") {
      Array.from(node.attributes).filter((attr2) => ["as", "index"].includes(attr2.name)).forEach((attr2) => {
        template.setAttribute(attr2.name, attr2.value);
        node.removeAttribute(attr2.name);
      });
    }
    Array.from(node.content.childNodes).forEach((child) => {
      template.content.appendChild(child);
    });
    node.content.appendChild(template);
    template._ref = node._ref;
  }
  if (node.tagName === "IMG" && (node.hasAttribute("src") || node.hasAttribute("_src") || node.hasAttribute("$src"))) {
    const imgNode = node;
    Promise.resolve().then(() => {
      const url = imgNode.getAttribute("_src") || imgNode.getAttribute("src");
      if (url) fetch(url, { cache: "force-cache" }).then((r) => r.text()).then((svgText) => {
        const realSvg = new DOMParser().parseFromString(svgText, "image/svg+xml").querySelector("svg");
        if (realSvg) {
          Array.from(imgNode.attributes).forEach((attr) => realSvg.setAttribute(attr.name, attr.value));
          imgNode.replaceWith(realSvg);
        }
      });
    });
  }
  if (node._thisObj !== void 0) scanObj.thisObj = node._thisObj || null;
  if (scanObj.thisObj === void 0) {
    let curr = node;
    while (curr && curr._thisObj === void 0) curr = curr.parentNode;
    scanObj.thisObj = curr ? curr._thisObj : null;
  }
  if (node._ref === void 0) {
    let curr = node;
    while (curr && curr._ref === void 0) curr = curr.parentNode;
    node._ref = curr ? { ...curr._ref } : {};
  }
  if (scanObj.extendVars === void 0) scanObj.extendVars = {};
  if (node._ref !== void 0) {
    Object.assign(node._ref, scanObj.extendVars);
    scanObj.extendVars = { ...node._ref };
  }
  _parseNode(node, scanObj);
  const nodes = [...node.childNodes || []];
  scanObj.extendVars = node._ref || scanObj.extendVars;
  nodes.forEach((child) => _scanTree(child, { thisObj: scanObj.thisObj, extendVars: { ...node._ref } }));
};
const _unbindTree = (node) => {
  if (node.nodeType !== 1) return;
  if (node._hasOnUnload) node.dispatchEvent(new Event("unload", { bubbles: false }));
  if (node._bindings) {
    node._bindings.forEach((binding) => {
      if (binding._sets) {
        binding._sets.forEach((set) => set.delete(binding));
        binding._sets.clear();
      }
    });
  }
  node.childNodes && node.childNodes.forEach((child) => _unbindTree(child));
};
const RefreshState = _scanTree;
const _components = /* @__PURE__ */ new Map();
const _pendingTemplates = [];
const Component = {
  getTemplate: (name) => document.querySelector(`template[component="${name.toUpperCase()}"]`),
  register: (name, setupFunc, templateNode = null, ...globalNodes) => {
    _components.set(name.toUpperCase(), setupFunc);
    if (document.readyState !== "loading") Component._addTemplate(name, templateNode, globalNodes);
    else _pendingTemplates.push([name, templateNode, globalNodes]);
  },
  exists: (name) => _components.has(name.toUpperCase()),
  getSetupFunction: (name) => _components.get(name.toUpperCase()),
  _addTemplate: (name, templateNode, globalNodes) => {
    if (templateNode) {
      const template = document.createElement("TEMPLATE");
      template.setAttribute("component", name.toUpperCase());
      template.content.appendChild(templateNode);
      document.body.appendChild(template);
    }
    if (globalNodes) globalNodes.forEach((node) => document.body.appendChild(node));
  },
  _initPending: () => {
    _pendingTemplates.forEach(([name, templateNode, globalNodes]) => Component._addTemplate(name, templateNode, globalNodes));
    _pendingTemplates.length = 0;
  }
};
function _mergeNode(from, to, scanObj, exists = {}) {
  if (from.attributes) {
    Array.from(from.attributes).forEach((attr) => attr.name !== "class" && to.setAttribute(attr.name, attr.value));
  }
  if (from.classList) {
    to.classList.add(...from.classList);
  }
  Array.from(from.childNodes).forEach((child) => to.appendChild(child));
  if (from.tagName && Component.exists(from.tagName)) _makeComponent(from.tagName, to, scanObj, exists);
}
function _makeComponent(name, node, scanObj, exists = {}) {
  if (exists[name]) return;
  exists[name] = true;
  if (scanObj.thisObj) Array.from(node.attributes).forEach((attr) => {
    if ((attr.name.startsWith("$") || attr.name.startsWith("st-")) && attr.value.includes("this.")) attr.value = attr.value.replace(/\bthis\./g, "this.parent.");
  });
  const componentFunc = Component.getSetupFunction(name);
  const slots = {};
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE && child.hasAttribute("slot")) {
      slots[child.getAttribute("slot")] = child;
      child.removeAttribute("slot");
    }
  });
  node.innerHTML = "";
  node.state = NewState(node.state || {});
  const template = Component.getTemplate(name);
  if (template) {
    const tplnode = template.content.cloneNode(true);
    if (tplnode.childNodes.length) {
      const rootNode = tplnode.children[0];
      _mergeNode(rootNode, node, scanObj, exists);
      $$(node, "[slot-id]").forEach((placeholder) => {
        const slotName = placeholder.getAttribute("slot-id");
        const slotSource = slots[slotName];
        if (slotSource) {
          placeholder.removeAttribute("slot-id");
          placeholder.innerHTML = "";
          if (slotSource.tagName === "TEMPLATE") {
            Array.from(slotSource.content.childNodes).forEach((child) => placeholder.appendChild(child.cloneNode(true)));
          } else {
            _mergeNode(slotSource, placeholder, scanObj, exists);
          }
        }
      });
    }
  }
  if (componentFunc) {
    try {
      componentFunc(node);
    } catch (e) {
      console.error("Error in component setupFunc for", name, e);
    }
  }
}
const Util = {
  clone: window.structuredClone || ((obj) => JSON.parse(JSON.stringify(obj))),
  base64: (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str))),
  unbase64: (str) => new TextDecoder().decode(Uint8Array.from(atob(str), (c) => c.charCodeAt(0))),
  urlbase64: (str) => Util.base64(str).replace(/[+/=]/g, (m) => ({ "+": "-", "/": "", "=": "" })[m]),
  unurlbase64: (str) => Util.unbase64(str.replace(/[-_.]/g, (m) => ({ "-": "+", "_": "/", ".": "=" })[m]).padEnd(Math.ceil(str.length / 4) * 4, "=")),
  safeJson: (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  },
  updateDefaults: (obj, defaults) => {
    for (const k in defaults) if (obj[k] === void 0) obj[k] = defaults[k];
  },
  copyFunction: (toObj, fromObj, ...funcNames) => {
    funcNames.forEach((name) => toObj[name] = fromObj[name].bind(fromObj));
  },
  getFunctionBody: (fn) => {
    const code = fn.toString();
    return code.slice(code.indexOf("{") + 1, code.lastIndexOf("}")).trim();
  },
  makeDom: (html) => {
    if (html.includes(">\n")) html = html.replace(/>\s+</g, "><").trim();
    const node = document.createElement("div");
    node.innerHTML = html;
    return node.children[0];
  },
  newAvg: () => {
    let total = 0, count = 0, avg = 0;
    return {
      add: (v) => {
        total += v;
        count++;
        return avg = total / count;
      },
      get: () => avg,
      clear: () => {
        total = 0, count = 0, avg = 0;
      }
    };
  },
  newTimeCount: () => {
    let startTime = 0, total = 0, count = 0;
    return {
      start: () => startTime = (/* @__PURE__ */ new Date()).getTime(),
      end: () => {
        const endTime = (/* @__PURE__ */ new Date()).getTime();
        const left = endTime - startTime;
        startTime = endTime;
        total += left;
        count++;
        return left;
      },
      avg: () => total / count
    };
  }
};
globalThis.Util = Util;
let _hashParams = new URLSearchParams(((_a = window.location.hash) == null ? void 0 : _a.substring(1)) || "");
const Hash = NewState({}, (k) => Util.safeJson(_hashParams.get(k)), (k, v) => {
  const oldStr = _hashParams.get(k);
  const newStr = v === void 0 ? void 0 : JSON.stringify(v);
  if (oldStr === newStr || oldStr === null && newStr === void 0) return;
  v === void 0 ? _hashParams.delete(k) : _hashParams.set(k, newStr);
  window.location.hash = "#" + _hashParams.toString();
});
if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    var _a2;
    const oldHashParams = _hashParams;
    _hashParams = new URLSearchParams(((_a2 = window.location.hash) == null ? void 0 : _a2.substring(1)) || "");
    _hashParams.forEach((v, k) => {
      if (oldHashParams.get(k) !== v) Hash[k] = Util.safeJson(v);
    });
    oldHashParams.forEach((v, k) => {
      if (_hashParams.get(k) === void 0) Hash[k] = void 0;
    });
  });
}
const LocalStorage = NewState({}, (k) => Util.safeJson(localStorage.getItem(k)), (k, v) => {
  const oldStr = localStorage.getItem(k);
  const newStr = v === void 0 ? void 0 : JSON.stringify(v);
  if (oldStr === newStr || oldStr === null && newStr === void 0) return;
  v === void 0 ? localStorage.removeItem(k) : localStorage.setItem(k, newStr);
});
globalThis.Hash = Hash;
globalThis.LocalStorage = LocalStorage;
if (typeof document !== "undefined") {
  const init = () => {
    Component._initPending();
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((newNode) => {
          if (newNode.isConnected) _scanTree(newNode);
        });
        mutation.removedNodes.forEach((oldNode) => _unbindTree(oldNode));
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
    const htmlNode = document.documentElement;
    if (!htmlNode.hasAttribute("$data-bs-theme") && !htmlNode.hasAttribute("data-bs-theme")) {
      htmlNode.setAttribute("$data-bs-theme", "LocalStorage.darkMode?'dark':'light'");
    }
    _scanTree(document.documentElement);
  };
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init, true);
}
export {
  $,
  $$,
  Component,
  Hash,
  LocalStorage,
  NewState,
  RefreshState,
  SetTranslator,
  Util,
  _scanTree,
  _unbindTree
};
