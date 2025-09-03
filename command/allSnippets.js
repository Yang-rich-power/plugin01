// command/allSnippets.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function showAllSnippets(context) {
  const disposable = vscode.commands.registerCommand(
    "engine-helper.showAllSnippets",
    async (searchTerm) => {
      // 添加 searchTerm 参数
      try {
        // 读取代码片段数据
        const snippets = await getAllSnippets(context);

        if (!snippets || Object.keys(snippets).length === 0) {
          vscode.window.showInformationMessage("暂无代码片段");
          return;
        }

        // 创建Webview面板
        const panel = vscode.window.createWebviewPanel(
          "snippetsViewer", // viewType
          "接口列表", // 标题
          vscode.ViewColumn.One, // 显示在第一个编辑器列
          {
            enableScripts: true, // 启用JavaScript
            retainContextWhenHidden: true, // 保持上下文
          }
        );

        // 设置HTML内容，传递搜索词
        panel.webview.html = getWebviewContent(snippets, searchTerm);

        // 处理Webview消息
        panel.webview.onDidReceiveMessage(
          (message) => {
            switch (message.command) {
              case "findUsages":
                findUsagesInWorkspace(message.key);
                break;
              case "copySnippet":
                copySnippetToClipboard(message.snippet);
                break;
            }
          },
          undefined,
          context.subscriptions
        );
      } catch (error) {
        vscode.window.showErrorMessage(`显示代码片段失败: ${error.message}`);
      }
    }
  );

  context.subscriptions.push(disposable);
  return disposable;
}

// 查找代码片段在工作区中的用法
function findUsagesInWorkspace(key) {
  // 使用 VS Code 的工作区搜索功能
  vscode.commands.executeCommand("workbench.action.findInFiles", {
    query: key,
    isRegex: false,
    matchCase: false,
    wholeWord: false,
  });
}

// 获取所有代码片段
async function getAllSnippets(context) {
  const snippetsFilePath = path.join(
    context.extensionPath,
    "config/snippets.json"
  );

  const customSnippetsFilePath = path.join(
    context.extensionPath,
    "config/customsnippets.json"
  );

  let allSnippets = {};

  // 读取主代码片段文件
  if (fs.existsSync(snippetsFilePath)) {
    const snippetsData = JSON.parse(
      fs.readFileSync(snippetsFilePath, "utf8") || "{}"
    );
    Object.assign(allSnippets, snippetsData);
  }

  // 读取自定义代码片段文件
  if (fs.existsSync(customSnippetsFilePath)) {
    const customSnippetsData = JSON.parse(
      fs.readFileSync(customSnippetsFilePath, "utf8") || "{}"
    );
    Object.assign(allSnippets, customSnippetsData);
  }

  return allSnippets;
}

// 生成Webview内容
function getWebviewContent(snippets, searchTerm = null) {
  const snippetList = Object.keys(snippets)
    .map((key) => {
      const snippet = snippets[key];
      return `
      <div class="snippet-item" data-key="${key}">
        <div class="snippet-header">
          <h3>${key}</h3>
          <div class="snippet-actions">
            <button onclick="findUsages('${key}')">查找用法</button>
            <button onclick="copySnippet('${key}')">复制</button>
          </div>
        </div>
        <div class="snippet-content">
          <p class="module-desc"><strong>模块:</strong> ${
            snippet["模块"] || "未分类"
          }</p>
          <p class="function-desc"><strong>功能描述:</strong> ${
            snippet["接口功能详述"] || "无描述"
          }</p>
          <p class="param-desc"><strong>参数说明:</strong> ${
            snippet["参数说明"] || "无参数说明"
          }</p>
          <p class="return-desc"><strong>返回值:</strong> ${
            snippet["返回参数"] || "无返回值说明"
          }</p>
          <div class="code-example">
            <strong>示例:</strong>
            <pre class="code-block"><code>${
              Array.isArray(snippet["示例"])
                ? snippet["示例"].join("\n")
                : snippet["示例"] || ""
            }</code></pre>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  // 转义搜索词以防止在HTML中出现特殊字符
  const escapedSearchTerm = searchTerm
    ? searchTerm.replace(/"/g, "&quot;")
    : "";

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>接口列表</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 0;
                margin: 0;
            }
            .header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                padding: 20px;
                background-color: var(--vscode-editor-background);
                border-bottom: 1px solid var(--vscode-panel-border);
                z-index: 100;
            }
            .search-box {
                margin-bottom: 0;
            }
            .search-box input {
                width: 100%;
                padding: 8px;
                border: 1px solid var(--vscode-input-border);
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 4px;
                box-sizing: border-box;
            }
            .content {
                margin-top: 100px;
                padding: 20px;
            }
            .snippet-item {
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                margin-bottom: 20px;
                background-color: var(--vscode-editorWidget-background);
            }
            .snippet-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background-color: var(--vscode-sideBarTitle-background);
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .snippet-header h3 {
                margin: 0;
                color: var(--vscode-sideBarTitle-foreground);
            }
            .snippet-actions button {
                margin-left: 10px;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 5px 10px;
                border-radius: 2px;
                cursor: pointer;
            }
            .snippet-actions button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .snippet-content {
                padding: 15px;
            }
            .snippet-content p {
                margin: 5px 0;
            }
            /* 不同类型信息的颜色 */
            .module-desc {
                color: #569cd6; /* 蓝色 */
            }
            .function-desc {
                color: #f14c4c; /* 红色 */
            }
            .param-desc {
                color: #4ec9b0; /* 青色 */
            }
            .return-desc {
                color: #d7ba7d; /* 黄色 */
            }
            .code-example {
                color: var(--vscode-foreground);
                margin-top: 10px;
            }
            .code-example strong {
                color: #c586c0; /* 紫色 */
            }
            .code-example .code-block {
                background-color: var(--vscode-textCodeBlock-background);
                border: 1px solid #3c3c3c;
                border-radius: 6px;
                padding: 15px;
                overflow-x: auto;
                margin-top: 8px;
                font-family: var(--vscode-editor-font-family);
                font-size: var(--vscode-editor-font-size);
                line-height: 1.5;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .code-example .code-block code {
                font-family: var(--vscode-editor-font-family);
                font-size: var(--vscode-editor-font-size);
                color: #f17bb2ff; /* 代码文本颜色 */
                white-space: pre;
            }
            .highlight {
                background-color: rgba(255, 255, 0, 0.3);
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="搜索代码片段..." onkeyup="filterSnippets()">
            </div>
        </div>
        <div class="content">
            <div id="snippetsContainer">
                ${snippetList}
            </div>
        </div>
        
        <script>
            const vscode = acquireVsCodeApi();
            const snippets = ${JSON.stringify(snippets)};
            
            function findUsages(key) {
                vscode.postMessage({
                    command: 'findUsages',
                    key: key
                });
            }
            
            function copySnippet(key) {
                vscode.postMessage({
                    command: 'copySnippet',
                    snippet: snippets[key]
                });
            }
            
            function filterSnippets() {
                const searchInput = document.getElementById('searchInput');
                const filter = searchInput.value.toLowerCase();
                const snippetItems = document.getElementsByClassName('snippet-item');
                
                for (let i = 0; i < snippetItems.length; i++) {
                    const item = snippetItems[i];
                    const text = item.textContent || item.innerText;
                    if (text.toLowerCase().indexOf(filter) > -1) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                }
                
                // 移除之前的高亮
                const highlights = document.querySelectorAll('.highlight');
                highlights.forEach(el => {
                    const parent = el.parentNode;
                    parent.replaceChild(document.createTextNode(el.textContent), el);
                    parent.normalize();
                });
                
                // 添加新的高亮
                if (filter) {
                    highlightText(filter);
                }
            }
            
            function escapeRegExp(string) {
                return string.replace(/[.*+?^$\{\}()|[\\]\\/]/g, '\\$&');
            }
            
            function highlightText(keyword) {
                const container = document.getElementById('snippetsContainer');
                const walker = document.createTreeWalker(
                    container,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                const textNodes = [];
                let node;
                while (node = walker.nextNode()) {
                    textNodes.push(node);
                }
                
                textNodes.forEach(textNode => {
                    const escapedKeyword = escapeRegExp(keyword);
                    const regex = new RegExp('(' + escapedKeyword + ')', 'gi');
                    
                    const html = textNode.textContent.replace(regex, '<span class="highlight">$1</span>');
                    if (html !== textNode.textContent) {
                        const wrapper = document.createElement('div');
                        wrapper.innerHTML = html;
                        const fragment = document.createDocumentFragment();
                        while (wrapper.firstChild) {
                            fragment.appendChild(wrapper.firstChild);
                        }
                        textNode.parentNode.replaceChild(fragment, textNode);
                    }
                });
            }
            
            // 页面加载完成后自动搜索
            document.addEventListener('DOMContentLoaded', function() {
                ${searchTerm ? `searchSnippets("${escapedSearchTerm}");` : ""}
            });
            
            function searchSnippets(term) {
                const searchInput = document.getElementById('searchInput');
                if (term) {
                    searchInput.value = term;
                }
                filterSnippets();
                
                // 滚动到第一个匹配项
                const firstMatch = document.querySelector('.snippet-item:not([style*="display: none"])');
                if (firstMatch) {
                    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        </script>
    </body>
    </html>
  `;
}

// 插入代码片段到当前编辑器
function insertSnippetToEditor(snippet) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const snippetText = Array.isArray(snippet["示例"])
      ? snippet["示例"].join("\n")
      : snippet["示例"];
    editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, snippetText);
    });
    vscode.window.showInformationMessage("代码片段已插入");
  } else {
    vscode.window.showErrorMessage("请先打开一个文件");
  }
}

// 复制代码片段到剪贴板
function copySnippetToClipboard(snippet) {
  const snippetText = Array.isArray(snippet["示例"])
    ? snippet["示例"].join("\n")
    : snippet["示例"];
  vscode.env.clipboard.writeText(snippetText);
  vscode.window.showInformationMessage("代码片段已复制到剪贴板");
}

module.exports = {
  showAllSnippets,
};
