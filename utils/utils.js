const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

function merge(a, b) {
  const merged = {
    snippets: [],
  };

  // 先将a中的代码片段添加到merged对象的snippets数组中
  merged.snippets.push(...a.snippets);

  // 创建一个map用于快速查找已添加的代码片段名称
  const nameMap = new Map();
  merged.snippets.forEach((snippet) => {
    nameMap.set(snippet.name, true);
  });

  // 遍历b中的代码片段，通过map判断是否已存在，若不存在则添加到merged对象中
  b.snippets.forEach((snippetB) => {
    if (!nameMap.has(snippetB.name)) {
      merged.snippets.push(snippetB);
      nameMap.set(snippetB.name, true);
    }
  });

  return merged;
}

async function getExtensionFile(context, fileName) {
  const filePath = path.join(context.extensionPath, fileName);
  let gitConfigData = {};
  if (fs.existsSync(filePath)) {
    gitConfigData = JSON.parse(fs.readFileSync(filePath, "utf8") || "{}");
  }
  return gitConfigData;
}

async function getInput(name, value = "") {
  const inputVal = await vscode.window.showInputBox({
    placeHolder: `请输入${name}`,
    value,
  });
  return inputVal;
}

const moduleAliases = {
  定时器: "timer",
  通用: "common",
  文件操作: "file",
  属性: "attr",
  地图: "map",
  怪物: "mon",
  玩家: "actor",
  离线挂机: "offline",
  掉落: "drop",
  物品和装备: "item_equip",
  装备和物品: "item_equip",
  背包和仓库: "bag",
  组队: "team",
  技能: "skill",
  buff: "buff",
  交易和商店: "trade",
  战斗: "fight",
  邮件: "email",
  好友: "friend",
  聊天: "chat",
  变量操作: "var",
  任务: "task",
  商业化: "trade",
  活动: "acti",
  副本: "dup",
  角色: "actor",
  坐骑: "mount",
  交易行: "trade",
  战盟: "union",
  摊位: "stall",
  宠物: "pet",
  系统: "sys",
  道具: "item",
  召唤兽: "pet",
  时间日期: "date",
  人物: "actor",
  npc: "npc",
  NPC: "npc",
  全局数据接口: "var",
  匹配: "match",
  // 可以根据实际需要添加更多模块别名
};

module.exports = {
  merge,
  getExtensionFile,
  getInput,
  moduleAliases,
};
