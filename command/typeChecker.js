// command/typeChecker.js

const vscode = require("vscode");

// 诊断集合
let diagnosticCollection;

// 激活类型检查功能
function activateTypeChecker(context) {
  try {
    // 创建诊断集合
    if (!diagnosticCollection) {
      diagnosticCollection =
        vscode.languages.createDiagnosticCollection("luaTypeChecker");
      context.subscriptions.push(diagnosticCollection);
    }

    // 注册保存事件监听器
    const saveDisposable = vscode.workspace.onDidSaveTextDocument(
      (document) => {
        if (document.languageId === "lua") {
          setTimeout(() => {
            provideDiagnostics(document);
          }, 1500); // 延迟1.5秒执行，等待LuaLS完成分析
        }
      }
    );

    // 初始化当前打开的文档
    if (vscode.window.activeTextEditor) {
      const document = vscode.window.activeTextEditor.document;
      if (document.languageId === "lua") {
        setTimeout(() => {
          provideDiagnostics(document);
        }, 3000); // 延迟3秒执行，确保LuaLS已启动
      }
    }

    context.subscriptions.push(saveDisposable);

    // 注册文本变化事件监听器（用于Lua文件）
    const changeDisposable = vscode.workspace.onDidChangeTextDocument(
      (event) => {
        if (event.document.languageId === "lua") {
          // 延迟执行诊断，避免频繁触发
          setTimeout(() => {
            provideDiagnostics(event.document);
          }, 2000);
        }
      }
    );

    context.subscriptions.push(changeDisposable);

    // 注册激活事件监听器
    const editorDisposable = vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor && editor.document.languageId === "lua") {
          setTimeout(() => {
            provideDiagnostics(editor.document);
          }, 1000);
        }
      }
    );

    context.subscriptions.push(editorDisposable);
  } catch (e) {
    console.log("Error in activateTypeChecker:", e.message);
  }
}

// 修改 provideDiagnostics 函数
async function provideDiagnostics(document) {
  try {
    if (!diagnosticCollection) {
      diagnosticCollection =
        vscode.languages.createDiagnosticCollection("luaTypeChecker");
    }

    console.log("Requesting diagnostics for:", document.uri.toString());

    // 获取LuaLS提供的诊断信息
    const diagnostics = await getLuaLSDiagnostics(document);
    console.log("Setting diagnostics count:", diagnostics.length);

    diagnosticCollection.set(document.uri, diagnostics);
  } catch (e) {
    console.error("Error in provideDiagnostics:", e);
  }
}

// 修改 getLuaLSDiagnostics 函数
async function getLuaLSDiagnostics(document) {
  try {
    console.log("Getting diagnostics for document:", document.uri.toString());

    // 等待更长时间确保 LuaLS 完成分析
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // 获取当前工作区的所有诊断信息
    const allDiagnostics = vscode.languages.getDiagnostics();
    console.log(`Total diagnostic collections: ${allDiagnostics.length}`);

    // 打印所有诊断集合的信息
    allDiagnostics.forEach(([uri, diagnostics], index) => {
      console.log(
        `Diagnostic collection ${index}: ${uri.toString()} - ${
          diagnostics.length
        } diagnostics`
      );
      diagnostics.forEach((diag, diagIndex) => {
        console.log(
          `  Diagnostic ${diagIndex}: ${diag.message} (source: ${
            diag.source || "unknown"
          })`
        );
      });
    });

    // 获取特定文档的诊断信息
    const documentDiagnostics = vscode.languages.getDiagnostics(document.uri);
    console.log(`Document diagnostics count: ${documentDiagnostics.length}`);

    // 如果文档诊断为空，尝试获取所有诊断并过滤
    if (documentDiagnostics.length === 0) {
      console.log("Document diagnostics is empty, checking all diagnostics...");
      const allWorkspaceDiagnostics = vscode.languages.getDiagnostics();

      for (const [uri, diagnostics] of allWorkspaceDiagnostics) {
        if (uri.toString() === document.uri.toString()) {
          console.log(
            `Found matching URI with ${diagnostics.length} diagnostics`
          );
          return filterDiagnostics(diagnostics);
        }
      }
    }

    // 筛选诊断信息
    const filteredDiagnostics = filterDiagnostics(documentDiagnostics);
    console.log(`Filtered diagnostics count: ${filteredDiagnostics.length}`);
    return filteredDiagnostics;
  } catch (e) {
    console.error("Error getting LuaLS diagnostics:", e);
    return [];
  }
}

// 筛选诊断信息的辅助函数
function filterDiagnostics(diagnostics) {
  // 目前返回所有诊断进行测试
  // 后续可以根据需要添加筛选逻辑
  return diagnostics.filter((diagnostic) => {
    const source = diagnostic.source ? diagnostic.source.toLowerCase() : "";

    // 检查是否来自 Lua 相关的诊断源
    const isLuaSource =
      source.includes("lua") ||
      source.includes("luaserver") ||
      source.includes("sumneko") ||
      source === "";

    return isLuaSource;
  });
}

module.exports = {
  activateTypeChecker,
};
