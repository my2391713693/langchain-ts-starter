import { DynamicTool } from "langchain/tools";
import { qwenModal } from "@/chatModel/index.ts";
import { Calculator } from "langchain/tools";

// 创建一个计算器工具
const calculatorTool = new Calculator();

// 创建一个简单的天气查询工具
const weatherTool = new DynamicTool({
  name: "weather_checker",
  description: "查询指定城市的天气情况。输入参数应该是城市名称，例如：北京",
  func: async (input: string) => {
    try {
      // 使用qwenModal生成搜索结果
      const prompt = `你是一个天气查询助手，请提供"${input}"城市的天气信息。
要求按照以下JSON格式返回数据：
{
  "condition": "天气状况，如晴天、多云等",
  "temperature": "温度数值，只需要数字，不需要单位"
}

严格按照这个格式返回，不要添加其他内容。`;

      const response = await qwenModal.invoke(prompt);
      const weatherData = JSON.parse(response.content.toString());
      
      // 按照指定格式返回
      return `城市: ${input}\n天气情况: ${weatherData.condition}\n温度: ${weatherData.temperature}°C`;
    } catch (error) {
      console.error("天气工具发生错误:", error);
      return "天气查询失败，请稍后再试。";
    }
  }
});

// 创建一个基于qwenModal的网络搜索工具
const searchTool = new DynamicTool({
  name: "web_search",
  description: "执行网络搜索。输入参数应该是搜索关键词，例如：人工智能发展历史",
  func: async (input: string) => {
    try {
      // 使用qwenModal生成搜索结果
      const prompt = `请根据关键词 "${input}" 生成一个网络搜索结果摘要。要求：
1. 提供3个与关键词相关的要点信息
2. 每个要点信息应该包含标题和简要说明
3. 保持内容准确、简洁且相关性强
4. 以纯文本格式返回，不要使用其他格式

搜索结果：`;

      const response = await qwenModal.invoke(prompt);
      return `关于"${input}"的搜索结果：\n${response.content}`;
    } catch (error) {
      console.error("搜索工具发生错误:", error);
      // 如果模型调用失败，回退到模拟结果
      return "网络搜索失败，请稍后再试。"
    }
  }
});

// 创建一个时间查询工具
const timeTool = new DynamicTool({
  name: "current_time",
  description: "获取当前时间",
  func: async () => {
    return `当前时间: ${new Date().toLocaleString("zh-CN", { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })}`;
  }
});

// 导出全部工具
export { calculatorTool, weatherTool, searchTool, timeTool }

export const commonTools = [calculatorTool, weatherTool, searchTool, timeTool];