"use strict";

const SYSTEM_DATE_OPERATION = "com.tcs.bancs.bancsone.coex.impl.jolt.SystemDate";

const sampleInput = `{
  "rating": {
    "primary": {
      "value": 5,
      "label": "優良"
    }
  },
  "name": "中文測試",
  "businessDate": "systemDate",
  "requestTime": "systemTime"
}`;

const sampleSpec = `[
  {
    "operation": "com.tcs.bancs.bancsone.coex.impl.jolt.SystemDate",
    "spec": {}
  },
  {
    "operation": "shift",
    "spec": {
      "rating": {
        "primary": {
          "value": "score",
          "label": "scoreText"
        }
      },
      "name": "displayName",
      "businessDate": "businessDate",
      "requestTime": "requestTime"
    }
  }
]`;

const state = {
  tabs: [],
  activeId: null,
  nextId: 1,
  inputCollapsed: false,
  notesVisible: false,
  stackView: false,
  editorFontSize: 14,
  layout: {
    input: 0.28,
    spec: 0.36,
    output: 0.36
  }
};

const els = {
  tabs: document.getElementById("tabs"),
  editorGrid: document.getElementById("editorGrid"),
  input: document.getElementById("inputEditor"),
  spec: document.getElementById("specEditor"),
  output: document.getElementById("outputEditor"),
  notes: document.getElementById("notesEditor"),
  notesPanel: document.getElementById("notesPanel"),
  toggleInput: document.getElementById("toggleInputBtn"),
  toggleNotes: document.getElementById("toggleNotesBtn"),
  toggleStack: document.getElementById("toggleStackBtn"),
  inputCollapsedStrip: document.getElementById("inputCollapsedStrip"),
  status: document.getElementById("status")
};

setupJsonEditors();

document.getElementById("addTabBtn").addEventListener("click", addTabFromPrompt);
document.getElementById("renameTabBtn").addEventListener("click", renameActiveTab);
document.getElementById("duplicateTabBtn").addEventListener("click", duplicateActiveTab);
document.getElementById("closeTabBtn").addEventListener("click", closeActiveTab);
document.getElementById("transformBtn").addEventListener("click", transformActiveTab);
document.getElementById("transformAllBtn").addEventListener("click", transformAllTabs);
document.getElementById("formatBtn").addEventListener("click", formatActiveTab);
document.getElementById("toggleInputBtn").addEventListener("click", toggleInputPane);
document.getElementById("inputCollapsedStrip").addEventListener("click", toggleInputPane);
document.getElementById("toggleStackBtn").addEventListener("click", toggleStackView);
document.getElementById("decreaseFontBtn").addEventListener("click", () => changeEditorFontSize(-1));
document.getElementById("increaseFontBtn").addEventListener("click", () => changeEditorFontSize(1));
document.getElementById("widenSpecBtn").addEventListener("click", () => adjustSpecOutputRatio(0.08));
document.getElementById("widenOutputBtn").addEventListener("click", () => adjustSpecOutputRatio(-0.08));
document.getElementById("toggleNotesBtn").addEventListener("click", toggleNotesPanel);
document.getElementById("sampleBtn").addEventListener("click", loadSample);
document.getElementById("copyBtn").addEventListener("click", copyOutput);
document.getElementById("downloadBtn").addEventListener("click", downloadOutput);
document.getElementById("inputFile").addEventListener("change", event => importFile(event, "input"));
document.getElementById("specFile").addEventListener("change", event => importFile(event, "spec"));

for (const editor of [els.input, els.spec, els.output, els.notes]) {
  editor.addEventListener("input", saveEditorsToActiveTab);
}

setupResizableLayout();
applyLayout();
addTab("範例 JOLT", sampleInput, sampleSpec, "");

function setupJsonEditors() {
  if (!window.CodeMirror) return;

  els.input = createJsonEditor(els.input);
  els.spec = createJsonEditor(els.spec);
  els.output = createJsonEditor(els.output, true);
}

function createJsonEditor(textarea, readOnly = false) {
  const editor = CodeMirror.fromTextArea(textarea, {
    mode: { name: "javascript", json: true },
    theme: "eclipse",
    lineNumbers: true,
    lineWrapping: false,
    tabSize: 2,
    indentUnit: 2,
    readOnly,
    viewportMargin: 50,
    matchBrackets: true,
    autoCloseBrackets: true
  });

  return {
    get value() {
      return editor.getValue();
    },
    set value(value) {
      editor.setValue(value || "");
      window.setTimeout(() => editor.refresh(), 0);
    },
    addEventListener(type, listener) {
      if (type === "input") {
        editor.on("change", listener);
      }
    },
    focus() {
      editor.focus();
    },
    editor
  };
}

function addTabFromPrompt() {
  const title = prompt("請輸入分頁名稱", `JOLT ${state.nextId}`);
  if (title === null) return;
  addTab(cleanTitle(title, `JOLT ${state.nextId}`), sampleInput, sampleSpec, "");
}

function addTab(title, input = "", spec = "", output = "", notes = "") {
  const tab = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    title,
    input,
    spec,
    output,
    notes
  };
  state.tabs.push(tab);
  state.nextId += 1;
  state.activeId = tab.id;
  renderTabs();
  loadActiveTabToEditors();
  setStatus(`已新增分頁：${title}`, "ok");
}

function renameActiveTab() {
  const tab = activeTab();
  const title = prompt("請輸入新的分頁名稱", tab.title);
  if (title === null) return;
  tab.title = cleanTitle(title, tab.title);
  renderTabs();
  setStatus(`分頁已重新命名：${tab.title}`, "ok");
}

function duplicateActiveTab() {
  saveEditorsToActiveTab();
  const tab = activeTab();
  const title = prompt("請輸入複製分頁名稱", `${tab.title} Copy`);
  if (title === null) return;
  addTab(cleanTitle(title, `${tab.title} Copy`), tab.input, tab.spec, tab.output, tab.notes);
}

function closeActiveTab() {
  if (state.tabs.length === 1) {
    const tab = activeTab();
    tab.input = "";
    tab.spec = "";
    tab.output = "";
    tab.notes = "";
    loadActiveTabToEditors();
    setStatus("已清空最後一個分頁", "ok");
    return;
  }
  const index = state.tabs.findIndex(tab => tab.id === state.activeId);
  state.tabs.splice(index, 1);
  state.activeId = state.tabs[Math.max(0, index - 1)].id;
  renderTabs();
  loadActiveTabToEditors();
  setStatus("已關閉分頁", "ok");
}

function renderTabs() {
  els.tabs.innerHTML = "";
  for (const tab of state.tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab${tab.id === state.activeId ? " active" : ""}`;
    button.textContent = tab.title;
    button.title = tab.title;
    button.addEventListener("click", () => {
      saveEditorsToActiveTab();
      state.activeId = tab.id;
      renderTabs();
      loadActiveTabToEditors();
    });
    els.tabs.appendChild(button);
  }
}

function activeTab() {
  const tab = state.tabs.find(item => item.id === state.activeId);
  if (!tab) throw new Error("找不到目前分頁");
  return tab;
}

function loadActiveTabToEditors() {
  const tab = activeTab();
  els.input.value = tab.input;
  els.spec.value = tab.spec;
  els.output.value = tab.output;
  els.notes.value = tab.notes || "";
  refreshEditors();
}

function saveEditorsToActiveTab() {
  const tab = activeTab();
  tab.input = els.input.value;
  tab.spec = els.spec.value;
  tab.output = els.output.value;
  tab.notes = els.notes.value;
}

function transformActiveTab() {
  try {
    saveEditorsToActiveTab();
    const tab = activeTab();
    tab.output = runJoltText(tab.input, tab.spec);
    loadActiveTabToEditors();
    setStatus(`${tab.title} 轉換完成`, "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function transformAllTabs() {
  try {
    saveEditorsToActiveTab();
    for (const tab of state.tabs) {
      tab.output = runJoltText(tab.input, tab.spec);
    }
    loadActiveTabToEditors();
    setStatus(`全部轉換完成：${state.tabs.length} 個分頁`, "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function runJoltText(inputText, specText) {
  const input = parseJson(inputText, "輸入 JSON");
  const spec = parseJson(specText, "JOLT Spec");
  return pretty(transformWithBuiltIns(input, spec));
}

function formatActiveTab() {
  try {
    els.input.value = pretty(parseJson(els.input.value || "{}", "輸入 JSON"));
    els.spec.value = pretty(parseJson(els.spec.value || "[]", "JOLT Spec"));
    if (els.output.value.trim()) {
      els.output.value = pretty(parseJson(els.output.value, "輸出 JSON"));
    }
    saveEditorsToActiveTab();
    setStatus("目前分頁已美化格式", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function loadSample() {
  const tab = activeTab();
  tab.input = sampleInput;
  tab.spec = sampleSpec;
  tab.output = "";
  tab.notes = "範例：示範 SystemDate + shift，包含中文 UTF-8 測試資料。";
  loadActiveTabToEditors();
  setStatus("已載入 UTF-8 中文範例", "ok");
}

function toggleInputPane() {
  state.inputCollapsed = !state.inputCollapsed;
  applyLayout();
  setStatus(state.inputCollapsed ? "已收合輸入 JSON，現在可專注閱讀 Spec 與 Output" : "已展開輸入 JSON", "ok");
}

function toggleStackView() {
  state.stackView = !state.stackView;
  applyLayout();
  setStatus(state.stackView ? "已切換成上下檢視，適合閱讀長內容" : "已切換成左右檢視", "ok");
}

function changeEditorFontSize(delta) {
  state.editorFontSize = clamp(state.editorFontSize + delta, 11, 24);
  applyLayout();
  setStatus(`編輯器字體大小：${state.editorFontSize}px`, "ok");
}

function adjustSpecOutputRatio(delta) {
  const base = state.inputCollapsed ? 0 : state.layout.input;
  const available = 1 - base;
  state.layout.spec = clamp(state.layout.spec + delta, 0.18, available - 0.18);
  state.layout.output = available - state.layout.spec;
  applyLayout();
}

function toggleNotesPanel() {
  state.notesVisible = !state.notesVisible;
  applyLayout();
  setStatus(state.notesVisible ? "已顯示分頁註解" : "已隱藏分頁註解", "ok");
}

function setupResizableLayout() {
  setupResizeHandle(document.getElementById("inputResize"), "input");
  setupResizeHandle(document.getElementById("specResize"), "spec");
}

function setupResizeHandle(handle, mode) {
  if (!handle) return;
  handle.addEventListener("pointerdown", event => {
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    handle.classList.add("dragging");
    const rect = els.editorGrid.getBoundingClientRect();

    const move = moveEvent => {
      const x = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
      if (mode === "input" && !state.inputCollapsed) {
        const input = clamp(x / rect.width, 0.16, 0.52);
        const remaining = 1 - input;
        const specOutput = state.layout.spec + state.layout.output || 2;
        state.layout.input = input;
        state.layout.spec = remaining * (state.layout.spec / specOutput);
        state.layout.output = remaining * (state.layout.output / specOutput);
      }
      if (mode === "spec") {
        const base = state.inputCollapsed ? 0 : state.layout.input;
        const available = Math.max(0.36, 1 - base);
        const spec = clamp((x / rect.width) - base, 0.18, available - 0.18);
        state.layout.spec = spec;
        state.layout.output = available - spec;
      }
      applyLayout();
    };

    const up = upEvent => {
      handle.releasePointerCapture(upEvent.pointerId);
      handle.classList.remove("dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
}

function applyLayout() {
  els.editorGrid.classList.toggle("input-collapsed", state.inputCollapsed);
  els.editorGrid.classList.toggle("stack-view", state.stackView);
  els.notesPanel.classList.toggle("hidden", !state.notesVisible);
  els.inputCollapsedStrip.classList.toggle("hidden", !state.inputCollapsed);
  els.toggleInput.textContent = state.inputCollapsed ? "展開輸入 JSON" : "收合輸入 JSON";
  els.toggleStack.textContent = state.stackView ? "左右檢視" : "上下檢視";
  els.toggleNotes.textContent = state.notesVisible ? "隱藏註解" : "顯示註解";

  if (state.inputCollapsed) {
    const total = Math.max(0.1, state.layout.spec + state.layout.output);
    els.editorGrid.style.setProperty("--input-col", "0fr");
    els.editorGrid.style.setProperty("--spec-col", `${state.layout.spec / total}fr`);
    els.editorGrid.style.setProperty("--output-col", `${state.layout.output / total}fr`);
  } else {
    const total = Math.max(0.1, state.layout.input + state.layout.spec + state.layout.output);
    els.editorGrid.style.setProperty("--input-col", `${state.layout.input / total}fr`);
    els.editorGrid.style.setProperty("--spec-col", `${state.layout.spec / total}fr`);
    els.editorGrid.style.setProperty("--output-col", `${state.layout.output / total}fr`);
  }
  document.documentElement.style.setProperty("--editor-font-size", `${state.editorFontSize}px`);
  refreshEditors();
}

function refreshEditors() {
  for (const editor of [els.input, els.spec, els.output]) {
    if (editor.editor) window.setTimeout(() => editor.editor.refresh(), 0);
  }
}

async function copyOutput() {
  await navigator.clipboard.writeText(els.output.value);
  setStatus("輸出已複製到剪貼簿", "ok");
}

function downloadOutput() {
  const blob = new Blob([els.output.value], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${activeTab().title || "output"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importFile(event, target) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (target === "input") els.input.value = String(reader.result);
    if (target === "spec") els.spec.value = String(reader.result);
    saveEditorsToActiveTab();
    setStatus(`已匯入檔案：${file.name}`, "ok");
  };
  reader.readAsText(file, "utf-8");
}

function transformWithBuiltIns(input, spec) {
  if (!Array.isArray(spec)) {
    return applyOperation(input, spec);
  }
  let current = deepClone(input);
  for (const step of spec) {
    if (step?.operation === SYSTEM_DATE_OPERATION) {
      current = applySystemDate(current);
    } else {
      current = applyOperation(current, step);
    }
  }
  return current;
}

function applyOperation(input, step) {
  switch (step?.operation) {
    case "shift":
      return applyShift(input, step.spec || {});
    case "default":
      return applyDefault(deepClone(input), step.spec || {});
    case "remove":
      return applyRemove(deepClone(input), step.spec || {});
    case "cardinality":
      return applyCardinality(deepClone(input), step.spec || {});
    case "modify-overwrite-beta":
      return applyModifyOverwrite(deepClone(input), step.spec || {});
    case "sort":
      return sortObject(input);
    default:
      throw new Error(`尚未支援的 JOLT operation：${step?.operation || "(空白)"}`);
  }
}

function applyShift(input, spec) {
  const output = {};
  walkShift(input, spec, output, [], "");
  return output;
}

function walkShift(inputNode, specNode, output, captures, currentKey) {
  if (typeof specNode === "string") {
    setPath(output, replaceCaptures(specNode, captures), inputNode);
    return;
  }
  if (Array.isArray(specNode)) {
    for (const target of specNode) {
      if (typeof target === "string") {
        setPath(output, replaceCaptures(target, captures), inputNode);
      }
    }
    return;
  }
  if (!isPlainObject(specNode) || inputNode == null) return;

  for (const [key, childSpec] of Object.entries(specNode)) {
    if (key === "*") {
      if (isObjectLike(inputNode)) {
        for (const [childKey, childValue] of entriesOf(inputNode)) {
          if (hasOwn(specNode, childKey)) continue;
          walkShift(childValue, childSpec, output, [childKey, ...captures], childKey);
        }
      }
    } else if (key === "$") {
      writeShiftValue(childSpec, output, currentKey, captures);
    } else if (hasOwn(inputNode, key)) {
      walkShift(inputNode[key], childSpec, output, captures, key);
    }
  }
}

function writeShiftValue(specNode, output, value, captures) {
  if (typeof specNode === "string") {
    setPath(output, replaceCaptures(specNode, captures), value);
  } else if (Array.isArray(specNode)) {
    for (const target of specNode) {
      if (typeof target === "string") setPath(output, replaceCaptures(target, captures), value);
    }
  }
}

function applyDefault(input, spec) {
  mergeDefault(input, spec);
  return input;
}

function mergeDefault(target, spec) {
  if (!isObjectLike(target) || !isPlainObject(spec)) return;
  for (const [key, value] of Object.entries(spec)) {
    if (key === "*") {
      for (const [, childValue] of entriesOf(target)) {
        mergeDefault(childValue, value);
      }
    } else if (!hasOwn(target, key)) {
      target[key] = deepClone(value);
    } else if (isObjectLike(target[key]) && isPlainObject(value)) {
      mergeDefault(target[key], value);
    }
  }
}

function applyRemove(input, spec) {
  removeBySpec(input, spec);
  return input;
}

function applyModifyOverwrite(input, spec) {
  walkModify(input, spec, input, []);
  return input;
}

function walkModify(currentNode, specNode, root, captures) {
  if (!isObjectLike(currentNode) || !isPlainObject(specNode)) return;

  for (const [rawKey, rawValue] of Object.entries(specNode)) {
    const key = normalizeModifyKey(rawKey);

    if (key === "*") {
      for (const [childKey, childValue] of entriesOf(currentNode)) {
        if (isObjectLike(childValue) && isPlainObject(rawValue)) {
          walkModify(childValue, rawValue, root, [childKey, ...captures]);
        }
      }
      continue;
    }

    const actualKey = replaceCaptures(key, captures);
    if (isPlainObject(rawValue)) {
      if (!isObjectLike(currentNode[actualKey])) {
        currentNode[actualKey] = {};
      }
      walkModify(currentNode[actualKey], rawValue, root, captures);
    } else {
      currentNode[actualKey] = evaluateModifyValue(rawValue, currentNode, root, captures);
    }
  }
}

function normalizeModifyKey(key) {
  return String(key).replace(/^[+~_?]+/, "");
}

function evaluateModifyValue(value, currentNode, root, captures) {
  if (typeof value !== "string") return deepClone(value);

  const captured = value.match(/^&(\d*)$/);
  if (captured) {
    const index = captured[1] === "" ? 0 : Number(captured[1]);
    return captures[index] ?? "";
  }

  const reference = value.match(/^@\((\d+)\s*,\s*([^)]+)\)$/);
  if (reference) {
    const upLevels = Number(reference[1]);
    const path = reference[2].trim();
    const base = upLevels <= 0 ? currentNode : root;
    return deepClone(getPath(base, replaceCaptures(path, captures)));
  }

  if (value.startsWith("=")) {
    return evaluateModifyFunction(value, currentNode, root, captures);
  }

  return value;
}

function evaluateModifyFunction(expression, currentNode, root, captures) {
  const match = expression.match(/^=([A-Za-z0-9_.$-]+)\((.*)\)$/);
  if (!match) return expression;

  const name = match[1];
  const args = splitFunctionArgs(match[2])
    .map(arg => evaluateModifyArgument(arg, currentNode, root, captures));

  switch (name) {
    case "concat":
      return args.map(arg => arg == null ? "" : String(arg)).join("");
    case "toInteger":
    case "toLong":
      return Number.parseInt(args[0], 10);
    case "toDouble":
      return Number.parseFloat(args[0]);
    case "toBoolean":
      return String(args[0]).toLowerCase() === "true";
    case "toUpper":
      return String(args[0] ?? "").toUpperCase();
    case "toLower":
      return String(args[0] ?? "").toLowerCase();
    case "substring":
    case "subString":
      return substringValue(args);
    case "size":
      if (Array.isArray(args[0]) || typeof args[0] === "string") return args[0].length;
      if (isPlainObject(args[0])) return Object.keys(args[0]).length;
      return 0;
    case "firstElement":
      return Array.isArray(args[0]) ? args[0][0] : args[0];
    case "lastElement":
      return Array.isArray(args[0]) ? args[0][args[0].length - 1] : args[0];
    default:
      throw new Error(`尚未支援的 modify-overwrite-beta 函式：=${name}(...)`);
  }
}

function substringValue(args) {
  const text = String(args[0] ?? "");
  const start = normalizeSubstringIndex(args[1], 0, text.length);
  const end = args.length >= 3
    ? normalizeSubstringIndex(args[2], text.length, text.length)
    : text.length;
  return text.substring(Math.min(start, end), Math.max(start, end));
}

function normalizeSubstringIndex(value, fallback, length) {
  const index = Number.parseInt(value, 10);
  if (Number.isNaN(index)) return fallback;
  return Math.max(0, Math.min(index, length));
}

function evaluateModifyArgument(arg, currentNode, root, captures) {
  const trimmed = arg.trim();
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return evaluateModifyValue(trimmed, currentNode, root, captures);
}

function splitFunctionArgs(argsText) {
  const args = [];
  let current = "";
  let quote = "";
  let depth = 0;

  for (let i = 0; i < argsText.length; i += 1) {
    const char = argsText[i];
    if (quote) {
      current += char;
      if (char === quote && argsText[i - 1] !== "\\") quote = "";
      continue;
    }
    if (char === "'" || char === "\"") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      args.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim() || argsText.trim()) {
    args.push(current.trim());
  }
  return args;
}

function removeBySpec(target, spec) {
  if (!isObjectLike(target) || !isPlainObject(spec)) return;
  for (const [key, childSpec] of Object.entries(spec)) {
    if (key === "*") {
      for (const [, childValue] of entriesOf(target)) {
        removeBySpec(childValue, childSpec);
      }
    } else if (childSpec === "" || childSpec === true || childSpec == null) {
      delete target[key];
    } else if (hasOwn(target, key)) {
      removeBySpec(target[key], childSpec);
    }
  }
}

function applyCardinality(input, spec) {
  applyCardinalitySpec(input, spec);
  return input;
}

function applyCardinalitySpec(target, spec) {
  if (!isObjectLike(target) || !isPlainObject(spec)) return;
  for (const [key, value] of Object.entries(spec)) {
    if (key === "*") {
      for (const [, childValue] of entriesOf(target)) {
        applyCardinalitySpec(childValue, value);
      }
    } else if (value === "ONE" && Array.isArray(target[key])) {
      target[key] = target[key][0];
    } else if (value === "MANY" && hasOwn(target, key) && !Array.isArray(target[key])) {
      target[key] = [target[key]];
    } else if (hasOwn(target, key)) {
      applyCardinalitySpec(target[key], value);
    }
  }
}

function applySystemDate(input) {
  const systemDate = new Date().toISOString().slice(0, 10);
  const systemTime = new Date().toISOString();
  replaceSystemDateValues(input, systemDate, systemTime);
  return input;
}

function replaceSystemDateValues(node, systemDate, systemTime) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      if (node[i] === "systemDate" || node[i] === "SystemDate") node[i] = systemDate;
      else if (node[i] === "systemTime" || node[i] === "SystemTime") node[i] = systemTime;
      else replaceSystemDateValues(node[i], systemDate, systemTime);
    }
    return;
  }
  if (isPlainObject(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (value === "systemDate" || value === "SystemDate") node[key] = systemDate;
      else if (value === "systemTime" || value === "SystemTime") node[key] = systemTime;
      else replaceSystemDateValues(value, systemDate, systemTime);
    }
  }
}

function setPath(target, path, value) {
  const parts = parsePath(path);
  let cursor = target;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const last = i === parts.length - 1;
    if (last) {
      cursor[part] = deepClone(value);
    } else {
      const nextPart = parts[i + 1];
      if (!isObjectLike(cursor[part])) {
        cursor[part] = isArrayIndex(nextPart) ? [] : {};
      }
      cursor = cursor[part];
    }
  }
}

function getPath(source, path) {
  if (path === "" || path === "@") return source;
  const parts = parsePath(path);
  let cursor = source;
  for (const part of parts) {
    if (cursor == null) return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

function parsePath(path) {
  return String(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .map(part => (isArrayIndex(part) ? Number(part) : part));
}

function replaceCaptures(path, captures) {
  return String(path).replace(/&(\d*)/g, (_, index) => {
    const captureIndex = index === "" ? 0 : Math.max(0, Number(index) - 1);
    return captures[captureIndex] ?? "";
  });
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!isPlainObject(value)) return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = sortObject(value[key]);
    return out;
  }, {});
}

function parseJson(text, label) {
  try {
    return JSON.parse(stripJsonCommentsAndTrailingCommas(text));
  } catch (error) {
    throw new Error(`${label} 不是有效 JSON：${error.message}`);
  }
}

function stripJsonCommentsAndTrailingCommas(text) {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 1;
      continue;
    }

    output += char;
  }

  return output.replace(/,\s*([}\]])/g, "$1");
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function isObjectLike(value) {
  return value !== null && typeof value === "object";
}

function entriesOf(value) {
  if (Array.isArray(value)) return value.map((item, index) => [String(index), item]);
  return Object.entries(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isArrayIndex(value) {
  return /^\d+$/.test(String(value));
}

function cleanTitle(value, fallback) {
  const title = String(value || "").trim();
  return title || fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setStatus(message, type = "") {
  els.status.className = type;
  els.status.textContent = message;
}
