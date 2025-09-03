// command/snippetsUsageTracker.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

class SnippetsUsageProvider {
  constructor(context) {
    this.context = context;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;

    // 监听文档变化事件
    vscode.workspace.onDidChangeTextDocument(() => {
      this.refresh();
    });

    // 监听活动编辑器变化
    vscode.window.onDidChangeActiveTextEditor(() => {
      this.refresh();
    });

    // 监听保存事件
    vscode.workspace.onDidSaveTextDocument(() => {
      this.refresh();
    });
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (element) {
      return Promise.resolve(element.children);
    } else {
      return Promise.resolve(this.getSnippetsUsageData());
    }
  }

  async getSnippetsUsageData() {
    try {
      // 获取所有代码片段
      const snippets = await this.getAllSnippets();

      // 统计使用情况
      const usageStats = await this.calculateUsageStats(snippets);

      // 按模块分类
      const modules = {};
      for (const [snippetName, count] of Object.entries(usageStats)) {
        if (count === 0) continue; // 跳过未使用的接口

        const snippet = snippets[snippetName];
        const moduleName =
          snippet && snippet["模块"] ? snippet["模块"] : "未分类";

        if (!modules[moduleName]) {
          modules[moduleName] = [];
        }

        modules[moduleName].push({
          name: snippetName,
          count: count,
          description: snippet ? snippet["接口功能详述"] || "" : "",
        });
      }

      // 构建树形结构
      const treeItems = [];

      // 按使用次数排序模块
      const sortedModules = Object.entries(modules).sort((a, b) => {
        const totalA = a[1].reduce((sum, item) => sum + item.count, 0);
        const totalB = b[1].reduce((sum, item) => sum + item.count, 0);
        return totalB - totalA;
      });

      // 定义模块颜色
      const moduleColors = [
        "#569cd6", // 蓝色
        "#f14c4c", // 红色
        "#4ec9b0", // 青色
        "#d7ba7d", // 黄色
        "#c586c0", // 紫色
        "#9cdcfe", // 浅蓝
        "#ce9178", // 橙色
        "#4fc1ff", // 天蓝
      ];

      for (let i = 0; i < sortedModules.length; i++) {
        const [moduleName, snippetsList] = sortedModules[i];
        const moduleColor = moduleColors[i % moduleColors.length];

        // 按使用次数排序接口
        const sortedSnippets = snippetsList.sort((a, b) => b.count - a.count);

        const children = sortedSnippets.map((item, index) => {
          // 定义接口颜色（与模块颜色相关但略有不同）
          const snippetColors = [
            "#a0d4f4", // 浅蓝
            "#f8a5a5", // 浅红
            "#86d6c2", // 浅青
            "#e4d2a3", // 浅黄
            "#dab0d8", // 浅紫
            "#c2e6ff", // 很浅的蓝
            "#e1c2b2", // 浅橙
            "#a3e0ff", // 浅天蓝
          ];
          const snippetColor = snippetColors[index % snippetColors.length];

          return new SnippetUsageItem(
            `${item.name} (${item.count})`,
            item.description,
            vscode.TreeItemCollapsibleState.None,
            {
              command: "engine-helper.showAllSnippetsWithSearch",
              title: "Show Snippet Details",
              arguments: [item.name],
            },
            null,
            snippetColor
          );
        });

        const totalUsage = snippetsList.reduce(
          (sum, item) => sum + item.count,
          0
        );
        const moduleItem = new SnippetUsageItem(
          `${moduleName} (总计: ${totalUsage})`,
          `包含 ${snippetsList.length} 个已使用的接口`,
          vscode.TreeItemCollapsibleState.Collapsed,
          null,
          children,
          moduleColor
        );

        treeItems.push(moduleItem);
      }

      if (treeItems.length === 0) {
        treeItems.push(
          new SnippetUsageItem(
            "暂无使用统计",
            "未在项目中发现已使用的接口",
            vscode.TreeItemCollapsibleState.None,
            null,
            null,
            "#6c757d"
          )
        );
      }

      return treeItems;
    } catch (error) {
      console.error("获取代码片段使用统计时出错:", error);
      return [
        new SnippetUsageItem(
          "统计出错",
          error.message,
          vscode.TreeItemCollapsibleState.None,
          null,
          null,
          "#f14c4c"
        ),
      ];
    }
  }

  async getAllSnippets() {
    const snippetsFilePath = path.join(
      this.context.extensionPath,
      "config/snippets.json"
    );

    const customSnippetsFilePath = path.join(
      this.context.extensionPath,
      "config/customsnippets.json"
    );

    let allSnippets = {};

    if (fs.existsSync(snippetsFilePath)) {
      const snippetsData = JSON.parse(
        fs.readFileSync(snippetsFilePath, "utf8") || "{}"
      );
      Object.assign(allSnippets, snippetsData);
    }

    if (fs.existsSync(customSnippetsFilePath)) {
      const customSnippetsData = JSON.parse(
        fs.readFileSync(customSnippetsFilePath, "utf8") || "{}"
      );
      Object.assign(allSnippets, customSnippetsData);
    }

    return allSnippets;
  }

  async calculateUsageStats(snippets) {
    const usageStats = {};

    // 初始化统计
    Object.keys(snippets).forEach((key) => {
      usageStats[key] = 0;
    });

    try {
      // 获取所有Lua文件
      const luaFiles = await vscode.workspace.findFiles("**/*.lua");

      // 遍历每个Lua文件统计使用情况
      for (const file of luaFiles) {
        try {
          const document = await vscode.workspace.openTextDocument(file);
          const text = document.getText();

          // 统计每个代码片段的使用次数
          Object.keys(snippets).forEach((key) => {
            // 转义正则表达式特殊字符
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp("\\b" + escapedKey + "\\b", "g");
            const matches = text.match(regex);
            if (matches) {
              usageStats[key] += matches.length;
            }
          });
        } catch (error) {
          console.error(`处理文件 ${file.path} 时出错:`, error);
        }
      }

      return usageStats;
    } catch (error) {
      console.error("计算使用统计时出错:", error);
      return usageStats;
    }
  }
}

class SnippetUsageItem extends vscode.TreeItem {
  constructor(
    label,
    description,
    collapsibleState,
    command,
    children,
    color = null
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.command = command;
    this.children = children;

    // 设置图标
    if (collapsibleState === vscode.TreeItemCollapsibleState.None) {
      if (label.startsWith("暂无") || label.startsWith("统计出错")) {
        this.iconPath = new vscode.ThemeIcon("info");
      } else {
        this.iconPath = new vscode.ThemeIcon("symbol-snippet");
      }
    } else {
      this.iconPath = new vscode.ThemeIcon("folder");
    }

    // 设置颜色
    if (color) {
      this.iconPath = new vscode.ThemeIcon(
        collapsibleState === vscode.TreeItemCollapsibleState.None
          ? "symbol-snippet"
          : "folder",
        new vscode.ThemeColor("charts.foreground")
      );

      // 使用资源标签装饰器设置颜色
      this.resourceUri = vscode.Uri.parse(`snippet://usage/${label}`);
      this.contextValue = "coloredTreeItem";
    }
  }
}

function activateSnippetsUsageTracker(context) {
  const snippetsUsageProvider = new SnippetsUsageProvider(context);
  vscode.window.createTreeView("snippetsUsageTreeView", {
    treeDataProvider: snippetsUsageProvider,
    showCollapseAll: true,
  });

  // 注册刷新命令
  const refreshCommand = vscode.commands.registerCommand(
    "engine-helper.refreshSnippetsUsage",
    () => snippetsUsageProvider.refresh()
  );

  // 注册带搜索的显示所有接口命令
  const showAllSnippetsWithSearch = vscode.commands.registerCommand(
    "engine-helper.showAllSnippetsWithSearch",
    (snippetName) => {
      // 执行显示所有接口命令，并传递搜索参数
      vscode.commands.executeCommand(
        "engine-helper.showAllSnippets",
        snippetName
      );
    }
  );

  context.subscriptions.push(refreshCommand, showAllSnippetsWithSearch);
}

module.exports = {
  activateSnippetsUsageTracker,
};
