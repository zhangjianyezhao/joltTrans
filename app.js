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
  nextId: 1
};

const els = {
  tabs: document.getElementById("tabs"),
  input: document.getElementById("inputEditor"),
  spec: document.getElementById("specEditor"),
  output: document.getElementById("outputEditor"),
  status: document.getElementById("status")
};

document.getElementById("addTabBtn").addEventListener("click", addTabFromPrompt);
document.getElementById("renameTabBtn").addEventListener("click", renameActiveTab);
document.getElementById("duplicateTabBtn").addEventListener("click", duplicateActiveTab);
document.getElementById("closeTabBtn").addEventListener("click", closeActiveTab);
document.getElementById("transformBtn").addEventListener("click", transformActiveTab);
document.getElementById("transformAllBtn").addEventListener("click", transformAllTabs);
document.getElementById("formatBtn").addEventListener("click", formatActiveTab);
document.getElementById("sampleBtn").addEventListener("click", loadSample);
document.getElementById("copyBtn").addEventListener("click", copyOutput);
document.getElementById("downloadBtn").addEventListener("click", downloadOutput);
document.getElementById("inputFile").addEventListener("change", event => importFile(event, "input"));
document.getElementById("specFile").addEventListener("change", event => importFile(event, "spec"));

for (const editor of [els.input, els.spec, els.output]) {
  editor.addEventListener("input", saveEditorsToActiveTab);
}

addTab("範例 JOLT", sampleInput, sampleSpec, "");

function addTabFromPrompt() {
  const title = prompt("請輸入分頁名稱", `JOLT ${state.nextId}`);
  if (title === null) return;
  addTab(cleanTitle(title, `JOLT ${state.nextId}`), sampleInput, sampleSpec, "");
}

function addTab(title, input = "", spec = "", output = "") {
  const tab = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    title,
    input,
    spec,
    output
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
  addTab(cleanTitle(title, `${tab.title} Copy`), tab.input, tab.spec, tab.output);
}

function closeActiveTab() {
  if (state.tabs.length === 1) {
    const tab = activeTab();
    tab.input = "";
    tab.spec = "";
    tab.output = "";
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
}

function saveEditorsToActiveTab() {
  const tab = activeTab();
  tab.input = els.input.value;
  tab.spec = els.spec.value;
  tab.output = els.output.value;
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
    saveEditorsToActiveTab();
    setStatus("目前分頁已格式化", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function loadSample() {
  const tab = activeTab();
  tab.input = sampleInput;
  tab.spec = sampleSpec;
  tab.output = "";
  loadActiveTabToEditors();
  setStatus("已載入 UTF-8 中文範例", "ok");
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
    case "sort":
      return sortObject(input);
    default:
      throw new Error(`尚未支援的 JOLT operation：${step?.operation || "(空白)"}`);
  }
}

function applyShift(input, spec) {
  const output = {};
  walkShift(input, spec, output, []);
  return output;
}

function walkShift(inputNode, specNode, output, captures) {
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
          walkShift(childValue, childSpec, output, [childKey, ...captures]);
        }
      }
    } else if (hasOwn(inputNode, key)) {
      walkShift(inputNode[key], childSpec, output, captures);
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
    if (!hasOwn(target, key)) {
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

function parsePath(path) {
  return String(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .map(part => (isArrayIndex(part) ? Number(part) : part));
}

function replaceCaptures(path, captures) {
  return String(path).replace(/&(\d*)/g, (_, index) => {
    const captureIndex = index === "" ? 0 : Number(index);
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
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} 不是有效 JSON：${error.message}`);
  }
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

function setStatus(message, type = "") {
  els.status.className = type;
  els.status.textContent = message;
}
