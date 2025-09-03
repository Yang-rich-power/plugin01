const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { refreshCodeSnippetsTip } = require("./codeCompletion.js");

function addCustomSnippet(context) {
  const disposable = vscode.commands.registerCommand(
    "engine-helper.addCustomSnippet",
    async () => {
      try {
        // 获取用户输入的代码片段信息
        const snippetName = await vscode.window.showInputBox({
          prompt: "请输入代码提示名称",
          placeHolder: "例如: getPlayerInfo",
        });

        if (!snippetName) {
          return;
        }

        const module = await vscode.window.showInputBox({
          prompt: "请输入模块名称",
          placeHolder: "例如: 玩家, 系统, 工具等",
          value: "自定义",
        });

        if (!module) {
          return;
        }

        const description = await vscode.window.showInputBox({
          prompt: "请输入功能描述",
          placeHolder: "简要描述该代码片段的功能",
        });

        if (description === undefined) {
          return;
        }

        const params = await vscode.window.showInputBox({
          prompt: "请输入参数说明(可选)",
          placeHolder: "参数1:描述1, 参数2:描述2",
        });

        const returnVal = await vscode.window.showInputBox({
          prompt: "请输入返回值说明(可选)",
          placeHolder: "返回值类型和含义",
        });

        // 获取代码示例
        const editor = vscode.window.activeTextEditor;
        let exampleCode = "";
        if (editor && !editor.selection.isEmpty) {
          // 如果有选中文本，使用选中的文本作为示例
          exampleCode = editor.document.getText(editor.selection);
        } else {
          // 否则让用户手动输入
          exampleCode = await vscode.window.showInputBox({
            prompt: "请输入代码示例",
            placeHolder: "function example() {\n  // 代码内容\n}",
            ignoreFocusOut: true,
          });
        }

        if (exampleCode === undefined) {
          return;
        }

        if (!exampleCode) {
          vscode.window.showErrorMessage("代码示例不能为空");
          return;
        }

        // 构造代码片段对象
        const customSnippet = {
          模块: module,
          参数说明: params || "",
          接口功能详述: description || "",
          返回参数: returnVal || "",
          示例: exampleCode,
        };

        // 读取现有的自定义代码片段文件
        const customSnippetsFilePath = path.join(
          context.extensionPath,
          "config/customsnippets.json"
        );

        let customSnippets = {};
        if (fs.existsSync(customSnippetsFilePath)) {
          const fileContent = fs.readFileSync(customSnippetsFilePath, "utf8");
          if (fileContent) {
            customSnippets = JSON.parse(fileContent);
          }
        }

        // 添加新的代码片段
        customSnippets[snippetName] = customSnippet;

        // 保存到文件
        fs.writeFileSync(
          customSnippetsFilePath,
          JSON.stringify(customSnippets, null, 2),
          "utf8"
        );

        // 刷新代码提示
        refreshCodeSnippetsTip(context);

        vscode.window.showInformationMessage(
          `自定义代码片段 "${snippetName}" 添加成功！`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `添加自定义代码片段失败: ${error.message}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
  return disposable;
}

// 添加删除自定义代码片段的功能
function deleteCustomSnippet(context) {
  const disposable = vscode.commands.registerCommand(
    "engine-helper.deleteCustomSnippet",
    async () => {
      try {
        // 读取现有的自定义代码片段文件
        const customSnippetsFilePath = path.join(
          context.extensionPath,
          "config/customsnippets.json"
        );

        if (!fs.existsSync(customSnippetsFilePath)) {
          vscode.window.showInformationMessage("暂无自定义代码片段");
          return;
        }

        const fileContent = fs.readFileSync(customSnippetsFilePath, "utf8");
        if (!fileContent) {
          vscode.window.showInformationMessage("暂无自定义代码片段");
          return;
        }

        const customSnippets = JSON.parse(fileContent);
        const selections = [];
        for (const key in customSnippets) {
          const selection = key + " - " + customSnippets[key]["模块"];
          selections.push(selection);
        }
        if (selections.length === 0) {
          vscode.window.showInformationMessage("暂无自定义代码片段");
          return;
        }

        // 让用户选择要删除的代码片段
        const selectedSnippet = await vscode.window.showQuickPick(selections, {
          placeHolder: "请选择要删除的自定义代码片段",
        });

        if (!selectedSnippet) {
          return;
        }

        // 确认删除操作
        const confirm = await vscode.window.showWarningMessage(
          `确定要删除代码片段 "${selectedSnippet}" 吗？此操作不可撤销。`,
          { modal: true },
          "确定",
          "取消"
        );

        if (confirm !== "确定") {
          return;
        }
        // 取键
        const snippetName = selectedSnippet.split(" - ")[0];
        // 删除选中的代码片段
        delete customSnippets[snippetName];

        // 保存到文件
        fs.writeFileSync(
          customSnippetsFilePath,
          JSON.stringify(customSnippets, null, 2),
          "utf8"
        );

        // 刷新代码提示
        refreshCodeSnippetsTip(context);

        vscode.window.showInformationMessage(
          `自定义代码片段 "${selectedSnippet}" 删除成功！`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `删除自定义代码片段失败: ${error.message}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
  return disposable;
}

module.exports = {
  addCustomSnippet,
  deleteCustomSnippet,
};
