import { commonTools } from "./commonTools.ts";

/**
 * 示例：演示如何使用工具链中的工具
 */
async function runToolChainExample() {
  console.log("🔧 工具链示例演示\n");
  
  // 获取所有工具
  const tools = commonTools;
  
  console.log(`已加载 ${tools.length} 个工具:\n`);
  tools.forEach((tool, index) => {
    console.log(`${index + 1}. ${tool.name}: ${tool.description}`);
  });
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // 演示各个工具的使用方法
  // 1. 计算器工具
  console.log("🧮 使用计算器工具:");
  try {
    const calcResult = await tools[0].call("15 * (3 + 2) - 10");
    console.log(`计算结果: ${calcResult}\n`);
  } catch (error) {
    console.error("计算器执行出错:", error);
  }
  
  // 2. 天气查询工具
  console.log("☀️ 使用天气查询工具:");
  try {
    const weatherResult = await tools[1].call("北京");
    console.log(`${weatherResult}\n`);
  } catch (error) {
    console.error("天气查询出错:", error);
  }
  
  // 3. 网络搜索工具
  console.log("🔍 使用网络搜索工具:");
  try {
    const searchResult = await tools[2].call("人工智能发展历史");
    console.log(`${searchResult}\n`);
  } catch (error) {
    console.error("网络搜索出错:", error);
  }
  
  // 4. 时间查询工具
  console.log("⏰ 使用时间查询工具:");
  try {
    const timeResult = await tools[3].call("");
    console.log(`${timeResult}\n`);
  } catch (error) {
    console.error("时间查询出错:", error);
  }
  
  console.log("=".repeat(50));
  console.log("✅ 工具链示例演示完成");
}

// 执行示例
runToolChainExample().catch(console.error);