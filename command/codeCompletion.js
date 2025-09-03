const vscode = require("vscode");
const { getExtensionFile, moduleAliases } = require("../utils/utils.js");
let completionItemsData = [];
let completionProvider = null;

// 定义提供代码补全项的方法
function provideCompletionItems(document, position, token, context) {
  return completionItemsData.map((item) => {
    const completionItem = new vscode.CompletionItem(item.label);
    completionItem.detail = item.detail;

    // 直接处理 documentation
    if (item.documentation) {
      if (typeof item.documentation === "string") {
        completionItem.documentation = new vscode.MarkdownString(
          item.documentation
        );
        completionItem.documentation.isTrusted = true;
      } else {
        completionItem.documentation = item.documentation;
      }
    }
    completionItem.insertText = item.insertText;
    return completionItem;
  });
}

// 定义解析单个代码补全项的方法
function resolveCompletionItem(completionItem, token) {
  // 如果 completionItem 有额外的文档处理需求，可以在这里处理
  if (
    completionItem.documentation &&
    typeof completionItem.documentation === "string"
  ) {
    // 将字符串文档转换为 MarkdownString
    completionItem.documentation = new vscode.MarkdownString(
      completionItem.documentation
    );
    completionItem.documentation.isTrusted = true;
  }
  const insertText = completionItem.insertText;
  if (insertText) {
    insertText = replaceCustomVariables(insertText, document);
    completionItem.insertText = insertText;
  }
  return completionItem;
}

async function codeSnippetsTip(context) {
  const snippets = await getExtensionFile(context, "config/snippets.json");
  const customsnippets = await getExtensionFile(
    context,
    "config/customsnippets.json"
  );
  completionItemsData = [];
  setSnippets(completionItemsData, snippets);
  setSnippets(completionItemsData, customsnippets);
  const config = await getExtensionFile(context, "config/config.json");
  const effectiveDocuments =
    config.effectiveDocuments ||
    "html,css,javascript,typescript,json,svg,less,sass,scss,vue,jsx,tsx,bat,sh,lua";
  // 注册代码提示提供者
  completionProvider = vscode.languages.registerCompletionItemProvider(
    effectiveDocuments.split(","), // 语言标识符，要与activationEvents中的设置匹配
    {
      provideCompletionItems: provideCompletionItems,
      resolveCompletionItem: resolveCompletionItem,
    },
    ""
  );

  context.subscriptions.push(completionProvider);
  return completionProvider;
}

function setSnippets(completionItemsData, snippets) {
  for (const key in snippets) {
    const snippet = snippets[key];

    // 获取模块的英文别名
    // const moduleAlias = getModuleAlias(snippet["模块"] || "unknown");

    // 使用 MarkdownString 格式化文档内容
    const documentation = new vscode.MarkdownString(
      `### 模块：${snippet["模块"] || "未知模块"}\n\n` +
        `### 参数说明：\n${(snippet["参数说明"] || "").replace(
          /\n/g,
          "  \n"
        )}\n\n` +
        `### 返回值说明：\n${(snippet["返回参数"] || "").replace(
          /\n/g,
          "  \n"
        )}`
    );
    // 设置支持 Markdown
    documentation.isTrusted = true;
    documentation.supportHtml = true;
    completionItemsData.push({
      // label: moduleAlias + "-" + key, // 使用英文别名
      label: key,
      detail: "接口功能详述:" + " \n" + snippet["接口功能详述"],
      insertText: snippet["示例"],
      documentation: documentation,
    });
  }
}

// 获取模块的英文别名
function getModuleAlias(chineseName) {
  // 如果有预定义的别名，使用别名
  if (moduleAliases[chineseName]) {
    return moduleAliases[chineseName];
  }
  // 如果都匹配不到，使用原始名称的小写形式（去除空格）
  return chineseName.toLowerCase().replace(/\s+/g, "");
}

// 处理自定义变量和VS Code内置变量替换
function replaceCustomVariables(text) {
  return text;
}

async function refreshCodeSnippetsTip(context) {
  let tmp = await completionProvider;
  if (tmp) tmp.dispose();
  codeSnippetsTip(context);
}

module.exports = {
  codeSnippetsTip,
  refreshCodeSnippetsTip,
};
