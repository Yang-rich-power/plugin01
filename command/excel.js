const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { refreshCodeSnippetsTip } = require("./codeCompletion.js");

// 添加导入Excel文件的命令
function importExcelSnippets(context) {
  const importExcelDisposable = vscode.commands.registerCommand(
    "engine-helper.importExcelSnippets",
    async () => {
      // 打开文件选择对话框
      const options = {
        canSelectMany: false,
        openLabel: "选择Excel文件",
        filters: {
          "Excel Files": ["xlsx", "xls"],
        },
      };

      const fileUri = await vscode.window.showOpenDialog(options);
      if (fileUri && fileUri[0]) {
        try {
          // 读取并解析Excel文件
          const workbook = XLSX.readFile(fileUri[0].fsPath);
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // 转换为JSON格式
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          // 读取现有snippets数据
          const snippetsFilePath = path.join(
            context.extensionPath,
            "config/snippets.json"
          );

          let snippetsData = {};
          // if (fs.existsSync(snippetsFilePath)) {
          //   snippetsData = JSON.parse(
          //     fs.readFileSync(snippetsFilePath, "utf8")
          //   );
          // }
          // 解析Excel数据并添加到snippets中
          jsonData.forEach((row) => {
            console.log(row["712说明文档（是否添加）"]);
            if (
              row["712说明文档（是否添加）"] &&
              row["712说明文档（是否添加）"] === 1
            ) {
              let prefix = row["接口名称"];
              let snippet = {
                模块: defaultStr(row["模块"]),
                参数说明: defaultStr(row["参数说明"]),
                接口功能详述: defaultStr(row["接口功能详述"]),
                返回参数: defaultStr(row["返回值说明"]),
                参数说明: defaultStr(row["参数说明"]),
                示例: defaultStr(row["示例"]),
              };
              snippetsData[prefix] = snippet;
            }
          });
          console.log(snippetsData);
          // 保存更新后的代码片段数据
          fs.writeFileSync(
            snippetsFilePath,
            JSON.stringify(snippetsData, null, 2),
            "utf8"
          );

          vscode.window.showInformationMessage(
            `成功从Excel导入 ${jsonData.length} 个代码片段！`
          );
          refreshCodeSnippetsTip(context);
        } catch (error) {
          vscode.window.showErrorMessage(`导入Excel文件失败: ${error.message}`);
        }
      }
    }
  );

  context.subscriptions.push(importExcelDisposable);
  return importExcelDisposable;
}

function defaultStr(str) {
  return str || "";
}

function exportSnippetsToExcel(context) {
  const exportDisposable = vscode.commands.registerCommand(
    "engine-helper.exportSnippetsToExcel",
    async () => {
      // 读取现有snippets数据
      const snippetsFilePath = path.join(
        context.extensionPath,
        "config/snippets.json"
      );

      if (!fs.existsSync(snippetsFilePath)) {
        vscode.window.showErrorMessage("未找到代码片段文件");
        return;
      }

      const snippetsData = JSON.parse(
        fs.readFileSync(snippetsFilePath, "utf8")
      );

      // 转换为Excel格式数据
      const exportData = Object.keys(snippetsData).map((key) => {
        const snippet = snippetsData[key];
        return {
          prefix: snippet.prefix || key,
          body: Array.isArray(snippet.body)
            ? snippet.body.join("\\n")
            : snippet.body,
          description: snippet.description || snippet.prefix || key,
        };
      });

      // 创建工作簿
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "CodeSnippets");

      // 保存文件
      const saveUri = await vscode.window.showSaveDialog({
        filters: { "Excel Files": ["xlsx"] },
        defaultUri: vscode.Uri.file("code-snippets.xlsx"),
      });

      if (saveUri) {
        XLSX.writeFile(wb, saveUri.fsPath);
        vscode.window.showInformationMessage("代码片段已导出到Excel文件");
      }
    }
  );

  context.subscriptions.push(exportDisposable);
  return exportDisposable;
}

module.exports = {
  importExcelSnippets,
  exportSnippetsToExcel,
};
