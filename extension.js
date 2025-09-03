const { saveSnippet } = require("./command/saveSnippet.js");
const { insertSnippet } = require("./command/insertSnippet.js");
const { deleteSnippet } = require("./command/deleteSnippet.js");
const { configEdit } = require("./command/configEdit.js");
const { showAllSnippets } = require("./command/allSnippets.js");
const {
  giteeConfig,
  codeSnippetSynchronization,
} = require("./command/giteeConfig.js");
const { codeSnippetsTip } = require("./command/codeCompletion.js");
const { importExcelSnippets } = require("./command/excel.js");
const {
  addCustomSnippet,
  deleteCustomSnippet,
} = require("./command/addOrDelCustomSnippets.js");
const { activateTypeChecker } = require("./command/typeChecker");
const {
  activateLuaLS,
  deactivateLuaLS,
} = require("./command/luaLanguageServer");
const {
  activateSnippetsUsageTracker,
} = require("./command/snippetsUsageTracker");

function activate(context) {
  codeSnippetsTip(context);
  saveSnippet(context);
  insertSnippet(context);
  giteeConfig(context);
  deleteSnippet(context);
  codeSnippetSynchronization(context);
  configEdit(context);
  importExcelSnippets(context);
  showAllSnippets(context);
  addCustomSnippet(context);
  deleteCustomSnippet(context);
  // activateLuaLS(context);
  // activateTypeChecker(context);
  activateSnippetsUsageTracker(context);
}

function deactivate() {
  // 插件失活时的清理操作（这里暂未涉及具体清理内容）
  // return deactivateLuaLS();
  console.log('插件 "engine-helper" 已停用');
}

module.exports = {
  activate: activate,
  deactivate: deactivate,
};
