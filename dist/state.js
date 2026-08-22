(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.ApigoState = global.ApigoState || {}));
})(this, function(exports2) {
  "use strict";
  var _a, _b, _c;
  const Util = {
    clone: (obj) => JSON.parse(JSON.stringify(obj)),
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
  const $ = (a, b) => b ? a.querySelector(b) : document.querySelector(a);
  const $$ = (a, b) => b ? a.querySelectorAll(b) : document.querySelectorAll(a);
  globalThis.Util = Util;
  globalThis.$ = $;
  globalThis.$$ = $$;
  let __activeBinding = null;
  let __noWriteBack = null;
  const _setActiveBinding = (val) => __activeBinding = val;
  const _setNoWriteBack = (val) => __noWriteBack = val;
  const _notifiers = /* @__PURE__ */ new Set();
  const _onNotifyUpdate = (fn) => _notifiers.add(fn);
  function NewState(defaults = {}, getter = null, setter = null) {
    const _defaults = {};
    const _stateMappings = /* @__PURE__ */ new Map();
    const _watchers = /* @__PURE__ */ new Map();
    const _watchFunc = (k, cb) => {
      if (!_watchers.has(k)) _watchers.set(k, /* @__PURE__ */ new Set());
      !cb ? _watchers.get(k).clear() : _watchers.get(k).add(cb);
      return () => _watchers.get(k).delete(cb);
    };
    const _unwatchFunc = (k, cb) => {
      if (_watchers.has(k)) _watchers.set(k, /* @__PURE__ */ new Set());
      _watchers.get(k).delete(cb);
    };
    const __getter = getter || ((k) => _defaults[k]);
    const __setter = setter || ((k, v) => _defaults[k] = v);
    Object.assign(_defaults, defaults);
    return new Proxy(_defaults, {
      get(target, key) {
        if (key === "__watch") return _watchFunc;
        if (key === "__unwatch") return _unwatchFunc;
        if (key === "__isProxy") return true;
        if (__activeBinding) {
          if (!_stateMappings.has(key)) _stateMappings.set(key, /* @__PURE__ */ new Set());
          _stateMappings.get(key).add(__activeBinding);
          if (!__activeBinding.node._states) __activeBinding.node._states = /* @__PURE__ */ new Set();
          __activeBinding.node._states.add(_stateMappings);
        }
        return __getter(key);
      },
      set(target, key, value) {
        if (__getter(key) !== value) {
          __setter(key, value);
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
          const bindings = _stateMappings.get(key);
          for (const binding of bindings) {
            if (!binding.node.isConnected) {
              bindings.delete(binding);
              continue;
            }
            if (__noWriteBack !== binding.node) {
              _notifiers.forEach((fn) => fn(binding));
            }
          }
        }
        return true;
      }
    });
  }
  globalThis.NewState = NewState;
  let _hashParams = new URLSearchParams(typeof globalThis !== "undefined" ? ((_b = (_a = globalThis.location) == null ? void 0 : _a.hash) == null ? void 0 : _b.substring(1)) || "" : "");
  const Hash = NewState({}, (k) => Util.safeJson(_hashParams.get(k)), (k, v) => {
    const oldStr = _hashParams.get(k);
    const newStr = v === void 0 ? void 0 : JSON.stringify(v);
    if (oldStr === newStr || oldStr === null && newStr === void 0) return;
    v === void 0 ? _hashParams.delete(k) : _hashParams.set(k, newStr);
    globalThis.location.hash = "#" + _hashParams.toString();
  });
  if (typeof globalThis !== "undefined") {
    globalThis.addEventListener("hashchange", () => {
      var _a2;
      const newParams = new URLSearchParams(((_a2 = globalThis.location.hash) == null ? void 0 : _a2.substring(1)) || "");
      const keys = /* @__PURE__ */ new Set([..._hashParams.keys(), ...newParams.keys()]);
      _hashParams = newParams;
      keys.forEach((k) => Hash[k] = Hash[k]);
    });
  }
  const LocalStorage = NewState({}, (k) => Util.safeJson(localStorage.getItem(k)), (k, v) => {
    const oldStr = localStorage.getItem(k);
    const newStr = v === void 0 ? void 0 : JSON.stringify(v);
    if (oldStr === newStr || oldStr === null && newStr === void 0) return;
    v === void 0 ? localStorage.removeItem(k) : localStorage.setItem(k, newStr);
  });
  const readCookies = () => Object.fromEntries(document.cookie.split(";").map((item) => {
    const index = item.indexOf("=");
    if (index < 0) return [item.trim(), ""];
    return [item.slice(0, index).trim(), item.slice(index + 1)];
  }).filter(([key]) => key));
  const Cookie = NewState({}, (k) => {
    const value = readCookies()[k];
    if (value === void 0) return void 0;
    try {
      return Util.safeJson(decodeURIComponent(value));
    } catch (_) {
      return void 0;
    }
  }, (k, v) => {
    const value = v === void 0 ? "" : encodeURIComponent(JSON.stringify(v));
    const maxAge = v === void 0 ? 0 : 31536e5;
    document.cookie = `${k}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  });
  const Lang = NewState({});
  if (Cookie.language === void 0 && typeof navigator !== "undefined") {
    Cookie.language = ((_c = navigator.languages) == null ? void 0 : _c[0]) || navigator.language || "en-US";
  }
  const State = NewState({});
  globalThis.Hash = Hash;
  globalThis.LocalStorage = LocalStorage;
  globalThis.Cookie = Cookie;
  globalThis.Lang = Lang;
  globalThis.State = State;
  let _disableRunCodeError = false;
  const setDisableRunCodeError = (value) => {
    _disableRunCodeError = value;
  };
  const _fnCache = /* @__PURE__ */ new Map();
  function _runCode(code, vars, thisObj, extendVars) {
    const allVars = { ...extendVars || {}, ...vars || {} };
    const argKeys = Object.keys(allVars);
    const argValues = Object.values(allVars);
    const cacheKey = code + argKeys.join(",");
    try {
      let fn = _fnCache.get(cacheKey);
      if (!fn) {
        fn = new Function("Hash", "LocalStorage", "State", ...argKeys, code);
        _fnCache.set(cacheKey, fn);
      }
      return fn.apply(thisObj, [globalThis.Hash, globalThis.LocalStorage, globalThis.State, ...argValues]);
    } catch (e) {
      if (!_disableRunCodeError) console.error(e, extendVars, [code, extendVars, vars, thisObj]);
      return null;
    }
  }
  function _returnCode(code, vars, thisObj, extendVars) {
    if (code.includes("${")) return _runCode("return `" + code + "`", vars, thisObj, extendVars);
    else return _runCode("return " + code, vars, thisObj, extendVars);
  }
  const _components = /* @__PURE__ */ new Map();
  const _pendingTemplates = [];
  const __eventRegistry = /* @__PURE__ */ new WeakMap();
  const __nodeKeys = /* @__PURE__ */ new WeakMap();
  const __nodeRegistry = /* @__PURE__ */ new Map();
  let __nodeSequence = 0;
  const _registerNodeEvent = (node, eventName) => {
    let nodeKey = __nodeKeys.get(node);
    if (!nodeKey) {
      nodeKey = (++__nodeSequence).toString(36);
      __nodeKeys.set(node, nodeKey);
      __nodeRegistry.set(nodeKey, typeof WeakRef === "function" ? new WeakRef(node) : node);
    }
    let events = __eventRegistry.get(node);
    if (!events) {
      events = /* @__PURE__ */ new Set();
      __eventRegistry.set(node, events);
    }
    events.add(eventName);
  };
  globalThis.__eachEventedNodes = (callback, root = null) => {
    if (typeof callback !== "function") return;
    for (const [key, reference] of __nodeRegistry) {
      const node = typeof (reference == null ? void 0 : reference.deref) === "function" ? reference.deref() : reference;
      if (!node || !node.isConnected) {
        __nodeRegistry.delete(key);
        continue;
      }
      if (root && node !== root && !root.contains(node)) continue;
      callback(node, __eventRegistry.get(node), key);
    }
  };
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
      Array.from(from.attributes).forEach((attr) => {
        if (attr.name === "class") return;
        if (attr.name === "style") {
          if (to.hasAttribute("style")) to.setAttribute("style", `${attr.value}; ${to.getAttribute("style")}`);
          else to.setAttribute("style", attr.value);
        } else if (to.hasAttribute(attr.name)) {
          const isClass = ["$class", "st-class"].includes(attr.name);
          const isStyle = ["$style", "st-style"].includes(attr.name);
          if (isClass || isStyle) {
            const oldVal = to.getAttribute(attr.name);
            const newVal = attr.value;
            const delimiter = isClass ? " " : "; ";
            const oldExpr = oldVal.includes("${") ? oldVal : `\${${oldVal}}`;
            const newExpr = newVal.includes("${") ? newVal : `\${${newVal}}`;
            to.setAttribute(attr.name, `${newExpr}${delimiter}${oldExpr}`);
          }
        } else {
          to.setAttribute(attr.name, attr.value);
        }
      });
    }
    const toClassList = [...to.classList];
    to.className = "";
    to.classList.add(...from.classList);
    to.classList.add(...toClassList);
    const target = to.tagName === "TEMPLATE" ? to.content : to;
    const sourceNodes = from.tagName === "TEMPLATE" ? from.content.childNodes : from.childNodes;
    Array.from(sourceNodes).forEach((child) => target.appendChild(child));
    if (from.tagName && Component.exists(from.tagName)) _makeComponent(from.tagName, to, scanObj, exists);
  }
  const _findSlotPlaceholders = (root) => {
    const placeholders = [...root.querySelectorAll("[slot-id]")];
    root.querySelectorAll("template").forEach((template) => {
      placeholders.push(..._findSlotPlaceholders(template.content));
    });
    return placeholders;
  };
  function _makeComponent(name, node, scanObj, exists = {}) {
    if (exists[name]) return;
    exists[name] = true;
    const parentThis = scanObj.thisObj;
    if (scanObj.thisObj) {
      Array.from(node.attributes).forEach((attr) => {
        if ((attr.name.startsWith("$") || attr.name.startsWith("st-")) && attr.value.includes("this.")) {
          attr.value = attr.value.replace(/\bthis\./g, "this.parent.");
        }
      });
    }
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
        if (rootNode) _mergeNode(rootNode, node, scanObj, exists);
        _findSlotPlaceholders(node).forEach((placeholder) => {
          const slotName = placeholder.getAttribute("slot-id");
          if (slots[slotName]) {
            placeholder.removeAttribute("slot-id");
            placeholder.innerHTML = "";
            _mergeNode(slots[slotName], placeholder, scanObj, exists);
          }
        });
      }
    }
    if (componentFunc) componentFunc(node);
    node._thisObj = node;
    if (parentThis && parentThis !== node) node._thisObj.parent = parentThis;
  }
  let _translator = (text, args) => {
    if (!text || typeof text !== "string") return text;
    return text.replace(/\{(.+?)\}/g, (match, key) => args.hasOwnProperty(key) ? args[key] : match);
  };
  const SetTranslator = (fn) => _translator = fn;
  const _translationLoads = /* @__PURE__ */ new Map();
  const _isPromise = (value) => value && typeof value.then === "function";
  const _fillTranslationArgs = (text, args) => {
    if (!text || typeof text !== "string") return text;
    return text.replace(/\{(.+?)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(args, key) ? args[key] : match);
  };
  const _getTranslation = (text, args) => {
    var _a2;
    const cached = Lang[text];
    if (Object.prototype.hasOwnProperty.call(Lang, text)) return _fillTranslationArgs(cached, args);
    const language = (_a2 = globalThis.Cookie) == null ? void 0 : _a2.language;
    const loadKey = `${language}\0${text}`;
    if (_translationLoads.has(loadKey)) return text;
    let result;
    try {
      result = _translator(text, args);
    } catch (_) {
      return text;
    }
    if (!_isPromise(result)) return typeof result === "string" ? result : text;
    const loading = Promise.resolve(result).then((translated) => {
      var _a3;
      if (((_a3 = globalThis.Cookie) == null ? void 0 : _a3.language) === language && typeof translated === "string") Lang[text] = translated;
      return translated;
    }).catch(() => text).finally(() => _translationLoads.delete(loadKey));
    _translationLoads.set(loadKey, loading);
    return text;
  };
  const _translate = (text) => {
    if (!text || typeof text !== "string" || !text.includes("{#")) return text;
    return text.replace(/\{#(.+?)#\}/g, (m, content) => {
      const parts = content.split("||").map((s) => s.trim());
      const args = {};
      if (parts.length > 1) {
        const matches = parts[0].match(/\{(.+?)\}/g);
        if (matches) matches.forEach((match, i) => args[match.substring(1, match.length - 1)] = parts[i + 1] || "");
      }
      return _getTranslation(parts[0], args);
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
  _onNotifyUpdate((binding) => _updateBinding(binding));
  function _clearRenderedNodes(node) {
    if (node._renderedNodes) node._renderedNodes.forEach((nodes) => nodes.forEach((child) => {
      child.remove();
      if (child._renderedNodes) _clearRenderedNodes(child);
    }));
  }
  function _updateBinding(binding) {
    const node = binding.node;
    if (!node.isConnected && node.tagName !== "TEMPLATE") return;
    _setActiveBinding(binding);
    let result = binding.exp ? binding.tpl ? _returnCode(binding.tpl, { thisNode: node }, node._thisObj || node, node._ref || null) : null : binding.tpl;
    if (binding.exp === 2 && typeof result === "string") {
      try {
        result = _returnCode(result, { thisNode: node }, node._thisObj || node, node._ref || null);
      } catch (e) {
      }
    }
    if (typeof result === "string" && result.includes("{#")) result = _translate(result);
    _setActiveBinding(null);
    binding.lastResult = result;
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
        const lk = prop[prop.length - 1];
        if (lk) {
          if (typeof result === "object" && result != null && !Array.isArray(result) && o[lk] == null) o[lk] = {};
          const lo = o[lk];
          if (typeof lo === "object" && lo != null && lo.__watch) Object.assign(lo, result);
          else {
            if (o[lk] !== result) o[lk] = result;
          }
        } else if (typeof result === "object" && result != null && !Array.isArray(result)) {
          Object.assign(o, result);
        }
      }
    } else if (binding.attr) {
      const attr = binding.attr;
      if (attr === "if") {
        if (result) {
          if (!node._renderedNodes || node._renderedNodes.length === 0) {
            const rendered = node._children.map((child) => {
              const cloned = child.cloneNode(true);
              node.parentNode.insertBefore(cloned, node);
              cloned._ref = { ...node._ref };
              cloned._thisObj = node._thisObj;
              return cloned;
            });
            node._renderedNodes = [rendered];
          }
        } else {
          _clearRenderedNodes(node);
          node._renderedNodes = [];
        }
      } else if (attr === "each") {
        if (result && typeof result === "object") {
          const asName = node.getAttribute("as") || "item";
          const indexName = node.getAttribute("index") || "index";
          const keyName = node.getAttribute("key");
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
          if (!node._keyedNodes) node._keyedNodes = /* @__PURE__ */ new Map();
          const newKeyedNodes = /* @__PURE__ */ new Map();
          const currentRenderedNodes = [];
          keys.forEach((k, i) => {
            const item = getVal(k);
            const rawKey = keyName ? item && typeof item === "object" ? item[keyName] : item : k;
            const keyVal = rawKey === void 0 || rawKey === null || newKeyedNodes.has(rawKey) ? `st_key_${i}` : rawKey;
            let existingNodes = node._keyedNodes.get(keyVal);
            if (existingNodes) {
              node._keyedNodes.delete(keyVal);
              existingNodes.forEach((child) => {
                node.parentNode.insertBefore(child, node);
                child._ref[indexName] = k;
                child._ref[asName] = item;
                _scanTree(child);
              });
            } else {
              existingNodes = [];
              node._children.forEach((child) => {
                const cloned = child.cloneNode(true);
                cloned._ref = { ...node._ref, [indexName]: k, [asName]: item };
                cloned._thisObj = node._thisObj;
                node.parentNode.insertBefore(cloned, node);
                existingNodes.push(cloned);
              });
            }
            newKeyedNodes.set(keyVal, existingNodes);
            currentRenderedNodes.push(existingNodes);
          });
          node._keyedNodes.forEach((nodes) => nodes.forEach((child) => {
            _clearRenderedNodes(child);
            child.remove();
          }));
          node._keyedNodes = newKeyedNodes;
          node._renderedNodes = currentRenderedNodes;
        } else {
          _clearRenderedNodes(node);
          node._renderedNodes = [];
        }
      } else if (attr === "bind") {
        if (["INPUT", "SELECT", "TEXTAREA"].includes(node.tagName) && !node.hasAttribute("autocomplete")) node.setAttribute("autocomplete", "off");
        if (node.type === "checkbox") {
          if (node.value !== "on" && !result) {
            _runCode(`${binding.tpl} = []`, { thisNode: node }, node._thisObj || node, node._ref || {});
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
        if (typeof result === "boolean") result ? node.setAttribute(attr, "") : node.removeAttribute(attr);
        else if (result !== void 0) {
          if (typeof result !== "string") result = JSON.stringify(result);
          if (attr === "text") node.textContent = result ?? "";
          else if (attr === "html") node.innerHTML = result ?? "";
          else if (node.tagName === "IMG" && attr === "src" && result.includes(".svg")) node.setAttribute("_src", result ?? "");
          else if (attr === "class") {
            if (node._staticClasses === void 0) {
              node._staticClasses = node.getAttribute("class") || "";
            }
            const staticClasses = node._staticClasses;
            const finalClass = result ? staticClasses ? `${result} ${staticClasses}` : result : staticClasses;
            node.setAttribute("class", finalClass.trim().replace(/\s+/g, " "));
          } else if (attr === "style") {
            if (node._staticStyles === void 0) {
              node._staticStyles = node.getAttribute("style") || "";
            }
            const staticStyles = node._staticStyles;
            const finalStyle = result ? staticStyles ? `${result}; ${staticStyles}` : result : staticStyles;
            node.setAttribute("style", finalStyle.trim().replace(/;;+/g, ";").replace(/^;+\s*|;\s*$/g, ""));
          } else node.setAttribute(attr, result ?? "");
        }
      }
    }
  }
  function _initBinding(binding) {
    if (!binding.node._bindings) binding.node._bindings = [];
    binding.node._bindings.push({ attr: binding.attr, prop: binding.prop, tpl: binding.tpl, exp: binding.exp });
    _updateBinding(binding);
  }
  function _parseNode(node, scanObj) {
    if (node._bindings) {
      node._states = /* @__PURE__ */ new Set();
      node._bindings.forEach((b) => _updateBinding({ node, ...b }));
      if (node._hasOnUpdate) node.dispatchEvent(new Event("update", { bubbles: false }));
      return;
    }
    if (Component.exists(node.tagName) && !node._componentInitialized) {
      Array.from(node.attributes).forEach((attr) => {
        var _a2;
        if (attr.name.startsWith("$.")) {
          const realAttrName = attr.name.slice(2);
          let tpl = _translate(attr.value);
          if (scanObj.thisObj && tpl.includes("this.")) tpl = tpl.replace(/\bthis\./g, "this.parent.");
          const result = _returnCode(tpl, { thisNode: node }, { parent: scanObj.thisObj || node }, node._ref || {});
          let o = node;
          const prop = realAttrName.split(".");
          for (let i = 0; i < prop.length - 1; i++) {
            if (prop[i]) o = o[_a2 = prop[i]] ?? (o[_a2] = {});
          }
          o[prop[prop.length - 1]] = result;
        }
      });
      _makeComponent(node.tagName, node, scanObj);
      $$(node, "[slot-id]").forEach((p) => p.removeAttribute("slot-id"));
      node._componentInitialized = true;
      if (!node._thisObj) node._thisObj = node;
    }
    if (node.tagName === "TEMPLATE") {
      node._children = [...node.content.childNodes];
      if (!node._renderedNodes) node._renderedNodes = [];
    }
    let attrs = [];
    if (node.tagName === "TEMPLATE") {
      ["$if", "$each", "st-if", "st-each", "$$if", "$$each", "st-st-if", "st-st-each"].forEach((n) => node.hasAttribute(n) && attrs.push(node.getAttributeNode(n)));
    } else {
      attrs = Array.from(node.attributes).filter((a) => (a.name.startsWith("$") || a.name.startsWith("st-")) && !["$if", "$each", "st-if", "st-each", "$$if", "$$each", "st-st-if", "st-st-each"].includes(a.name) || a.name.includes(".") || !a.name.startsWith("$") && !a.name.startsWith("st-") && !a.name.startsWith(".") && !a.name.startsWith("on") && a.name !== "bind" && a.value.includes("{#"));
    }
    if (node._thisObj && scanObj.thisObj && node._thisObj !== scanObj.thisObj) node._thisObj.parent = scanObj.thisObj;
    if (!node._thisObj) node._thisObj = scanObj.thisObj || null;
    if (!node._ref) node._ref = scanObj.extendVars || {};
    node._states = /* @__PURE__ */ new Set();
    attrs.forEach((attr) => {
      let exp = 0;
      if (attr.name.startsWith("$$") || attr.name.startsWith("st-st-")) exp = 2;
      else if (attr.name.startsWith("$") || attr.name.startsWith("st-")) exp = 1;
      const realAttrName = exp === 2 ? attr.name.startsWith("$$") ? attr.name.slice(2) : attr.name.slice(6) : exp === 1 ? attr.name.startsWith("$") ? attr.name.slice(1) : attr.name.slice(3) : attr.name;
      let tpl = attr.value;
      node.removeAttribute(attr.name);
      if (realAttrName.startsWith(".")) _initBinding({ node, prop: realAttrName.split("."), tpl, exp });
      else if (realAttrName.startsWith("on")) {
        const eventName = realAttrName.slice(2);
        if (eventName === "update") node._hasOnUpdate = true;
        if (eventName === "load" && !["BODY", "IMG", "IFRAME"].includes(node.tagName)) node._hasOnLoad = true;
        if (eventName === "unload" && !["BODY", "IMG", "IFRAME"].includes(node.tagName)) node._hasOnUnload = true;
        _registerNodeEvent(node, eventName);
        node.addEventListener(eventName, (e) => {
          const detailVars = e.detail && typeof e.detail === "object" && !Array.isArray(e.detail) ? e.detail : {};
          _runCode(tpl, { event: e, thisNode: node, ...detailVars }, scanObj.thisObj || node, node._ref || {});
        });
      } else {
        if (realAttrName === "bind") {
          const isTextInput = ["INPUT", "TEXTAREA"].includes(node.tagName) && ["textarea", "text", "password", "email", "number", "search", "url", "tel"].includes(node.type || "text") || node.isContentEditable;
          const bindEventName = isTextInput ? "input" : "change";
          _registerNodeEvent(node, bindEventName);
          node.addEventListener(bindEventName, (e) => {
            if (e.target !== node) return;
            let newVal = node.isContentEditable ? e.target.innerHTML : node.type === "checkbox" ? e.target.checked : node.type === "file" ? e.target.files : e.target.value ?? e.detail;
            _setNoWriteBack(node);
            setDisableRunCodeError(true);
            if (node.type === "checkbox" && node._checkboxMultiMode) _runCode(`!!checked ? (!${tpl}.includes(val) && ${tpl}.push(val)) : (index = ${tpl}.indexOf(val), index > -1 && ${tpl}.splice(index, 1))`, { val: node.value, checked: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {});
            else _runCode(`${tpl} = val`, { val: newVal, thisNode: node }, scanObj.thisObj || node, node._ref || {});
            setDisableRunCodeError(false);
            _setNoWriteBack(null);
          });
        } else if (realAttrName === "text" && !tpl) {
          tpl = node.textContent;
          node.textContent = "";
        }
        if (tpl) _initBinding({ node, attr: realAttrName, tpl, exp });
      }
    });
    if (node._hasOnLoad || node._componentInitialized) Promise.resolve().then(() => node.dispatchEvent(new Event("load", { bubbles: false })));
    if (node._hasOnUpdate) node.dispatchEvent(new Event("update", { bubbles: false }));
    if (node._thisObj) scanObj.thisObj = node._thisObj;
  }
  const _scanTree = (node, scanObj = {}) => {
    if (node.nodeType === 3) {
      if (node._bindings) {
        node._states = /* @__PURE__ */ new Set();
        node._bindings.forEach((binding) => _updateBinding({ node, ...binding }));
        return;
      }
      if (node._stTranslated) return;
      if (node.textContent.includes("{#")) _initBinding({ node, attr: "text", tpl: node.textContent, exp: 0 });
      node._stTranslated = true;
      return;
    }
    if (node.nodeType !== 1) return;
    if (!node._stTranslated) node._stTranslated = true;
    if (node.tagName !== "TEMPLATE" && (node.hasAttribute("$if") || node.hasAttribute("$each") || node.hasAttribute("st-if") || node.hasAttribute("st-each") || node.hasAttribute("$$if") || node.hasAttribute("$$each") || node.hasAttribute("st-st-if") || node.hasAttribute("st-st-each"))) {
      const template = document.createElement("TEMPLATE");
      const attrs = Array.from(node.attributes).filter((attr) => ["$if", "$each", "st-if", "st-each", "$$if", "$$each", "st-st-if", "st-st-each"].includes(attr.name) || (node.hasAttribute("$each") || node.hasAttribute("st-each") || node.hasAttribute("$$each") || node.hasAttribute("st-st-each")) && ["as", "index"].includes(attr.name));
      attrs.forEach((attr) => {
        template.setAttribute(attr.name, attr.value);
        node.removeAttribute(attr.name);
      });
      node.parentNode.insertBefore(template, node);
      template.content.appendChild(node);
      template._ref = node._ref;
      _scanTree(template, scanObj);
      return;
    }
    if (node.tagName === "TEMPLATE" && (node.hasAttribute("$if") || node.hasAttribute("st-if") || node.hasAttribute("$$if") || node.hasAttribute("st-st-if")) && (node.hasAttribute("$each") || node.hasAttribute("st-each") || node.hasAttribute("$$each") || node.hasAttribute("st-st-each"))) {
      const template = document.createElement("TEMPLATE");
      const attrs = Array.from(node.attributes).filter((attr2) => ["$if", "$each", "st-if", "st-each", "$$if", "$$each", "st-st-if", "st-st-each"].includes(attr2.name));
      const attr = attrs[attrs.length - 1];
      template.setAttribute(attr.name, attr.value);
      node.removeAttribute(attr.name);
      if (["$each", "st-each", "$$each", "st-st-each"].includes(attr.name)) {
        Array.from(node.attributes).filter((attr2) => ["as", "index"].includes(attr2.name)).forEach((attr2) => {
          template.setAttribute(attr2.name, attr2.value);
          node.removeAttribute(attr2.name);
        });
      }
      Array.from(node.content.childNodes).forEach((child) => template.content.appendChild(child));
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
    else {
      let curr = node;
      while (curr && curr._thisObj === void 0) curr = curr.parentNode;
      scanObj.thisObj = curr ? curr._thisObj : null;
    }
    if (node._ref === void 0) {
      let curr = node;
      while (curr && curr._ref === void 0) curr = curr.parentNode;
      node._ref = curr ? { ...curr._ref } : {};
    }
    if (scanObj.extendVars) Object.assign(node._ref, scanObj.extendVars);
    _parseNode(node, { ...scanObj });
    const nodes = [...node.childNodes || []];
    nodes.forEach((child) => _scanTree(child, { thisObj: node._thisObj ?? scanObj.thisObj, extendVars: { ...node._ref } }));
  };
  const _unbindTree = (node) => {
    if (node.nodeType !== 1 && !node._states) return;
    if (node.nodeType === 1 && node._hasOnUnload) node.dispatchEvent(new Event("unload", { bubbles: false }));
    if (node._states) node._states.forEach((mappings) => {
      for (const [key, bindingSet] of mappings) {
        for (const binding of bindingSet) {
          if (binding.node === node) bindingSet.delete(binding);
        }
      }
    });
    node.childNodes && node.childNodes.forEach((child) => _unbindTree(child));
  };
  globalThis.Component = Component;
  globalThis.SetTranslator = SetTranslator;
  globalThis.__unsafeRefreshState = _scanTree;
  if (typeof document !== "undefined") {
    const init = () => {
      if (globalThis.Component && globalThis.Component._initPending) {
        globalThis.Component._initPending();
      }
      const htmlNode = document.documentElement;
      if (!htmlNode.hasAttribute("$data-bs-theme") && !htmlNode.hasAttribute("data-bs-theme")) {
        htmlNode.setAttribute("$data-bs-theme", "LocalStorage.darkMode?'dark':'light'");
      }
      new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((newNode) => {
            if (newNode.isConnected) _scanTree(newNode);
          });
          mutation.removedNodes.forEach((oldNode) => _unbindTree(oldNode));
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
      _scanTree(document.documentElement);
    };
    if (document.readyState !== "loading") init();
    else document.addEventListener("DOMContentLoaded", init, true);
  }
  const __unsafeRefreshState = _scanTree;
  exports2.$ = $;
  exports2.$$ = $$;
  exports2.Component = Component;
  exports2.Cookie = Cookie;
  exports2.Hash = Hash;
  exports2.Lang = Lang;
  exports2.LocalStorage = LocalStorage;
  exports2.NewState = NewState;
  exports2.SetTranslator = SetTranslator;
  exports2.State = State;
  exports2.Util = Util;
  exports2.__unsafeRefreshState = __unsafeRefreshState;
  exports2._returnCode = _returnCode;
  exports2._runCode = _runCode;
  exports2.onNotifyUpdate = _onNotifyUpdate;
  exports2.setActiveBinding = _setActiveBinding;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
