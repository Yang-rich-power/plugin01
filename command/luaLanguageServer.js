// command/luaLanguageServer.js
const vscode = require("vscode");
const { LanguageClient } = require("vscode-languageclient/node");
const path = require("path");
const fs = require("fs");
const os = require("os");

let client;

function activateLuaLS(context) {
  try {
    // 根据操作系统确定可执行文件路径
    const isWindows = os.platform() === "win32";
    const executableName = isWindows
      ? "lua-language-server.exe"
      : "lua-language-server";

    // 获取LuaLS的可执行文件路径
    const serverModule = context.asAbsolutePath(
      path.join("lua-language-server-3.15.0-win32-x64", "bin", executableName)
    );

    // 检查LuaLS可执行文件是否存在
    if (!fs.existsSync(serverModule)) {
      console.log("LuaLS executable not found at:", serverModule);
      vscode.window.showWarningMessage(
        "Lua语言服务器未找到，类型检查功能可能受限"
      );
      return;
    }

    console.log("LuaLS executable found at:", serverModule);

    // 获取LuaLS的主目录
    const mainDir = context.asAbsolutePath(
      "lua-language-server-3.15.0-win32-x64"
    );

    console.log("LuaLS main directory:", mainDir);

    // 服务器配置选项
    const serverOptions = {
      run: {
        command: serverModule,
        args: ["-E", path.join(mainDir, "main.lua")],
        options: {
          cwd: mainDir,
        },
      },
      debug: {
        command: serverModule,
        args: ["-E", path.join(mainDir, "main.lua")],
        options: {
          cwd: mainDir,
        },
      },
    };

    // 客户端配置选项
    const clientOptions = {
      documentSelector: [
        { scheme: "file", language: "lua" },
        { scheme: "untitled", language: "lua" },
      ],
      synchronize: {
        fileEvents: [
          vscode.workspace.createFileSystemWatcher(
            "**/*.lua",
            false,
            false,
            false
          ),
          vscode.workspace.createFileSystemWatcher(
            "**/*.luarc.json",
            false,
            false,
            false
          ),
        ],
      },
      outputChannelName: "LuaLS",
      initializationOptions: {
        displayLanguage: "zh-cn",
        telemetry: {
          enable: false,
        },
        runtime: {
          version: "Lua 5.4",
        },
        diagnostics: {
          enable: true,
          neededFileStatus: {
            "*": "Any",
          },
        },
        workspace: {
          maxPreload: 1000,
          preloadFileSize: 1000,
          ignoreDir: [],
          useGitIgnore: true,
          library: [],
        },
      },
      markdown: {
        isTrusted: true,
      },
    };

    // 创建并启动语言客户端
    client = new LanguageClient(
      "luaLanguageServer",
      "Lua Language Server",
      serverOptions,
      clientOptions
    );

    console.log("Creating LanguageClient...");

    // 启动客户端
    const startPromise = client.start();

    startPromise
      .then(() => {
        console.log("Lua Language Server started successfully");
      })
      .catch((error) => {
        console.error("Failed to start Lua Language Server:", error);
        vscode.window.showErrorMessage(
          "启动Lua语言服务器失败: " + error.message
        );
      });

    // 监听各种通知来调试
    client.onNotification("textDocument/publishDiagnostics", (params) => {
      console.log("=== Diagnostics received ===");
      console.log("URI:", params.uri);
      console.log("Diagnostics count:", params.diagnostics.length);
      params.diagnostics.forEach((diag, index) => {
        console.log(
          `  ${index + 1}. ${diag.message} (line ${diag.range.start.line + 1})`
        );
      });
    });

    // 监听其他有用的通知
    client.onNotification("window/logMessage", (params) => {
      console.log("LuaLS Log Message:", params.type, params.message);
    });

    client.onNotification("window/showMessage", (params) => {
      console.log("LuaLS Show Message:", params.type, params.message);
    });
  } catch (error) {
    console.error("Error in activateLuaLS:", error);
    vscode.window.showErrorMessage(
      "启动Lua语言服务器时发生错误: " + error.message
    );
  }
}

function deactivateLuaLS() {
  console.log("Deactivating Lua Language Server...");
  if (!client) {
    return undefined;
  }
  return client.stop();
}

module.exports = {
  activateLuaLS,
  deactivateLuaLS,
};
