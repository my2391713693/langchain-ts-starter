import * as dotenv from "dotenv";
import { DynamicTool } from "langchain/tools";
import { qwenModal } from "@/chatModel/index.ts";
import { Calculator } from "langchain/tools";
import axios from "axios";

// 加载环境变量
dotenv.config();

// 创建一个计算器工具
const calculatorTool = new Calculator();

// 创建一个基于搜索引擎和大模型的天气查询工具
const weatherTool = new DynamicTool({
  name: "weather_checker",
  description: "查询指定城市的天气情况。输入参数应该是城市名称，例如：北京",
  func: async (input: string) => {
    try {
      const apiKey = process.env.SERPER_API_KEY;
      if (!apiKey) {
        return "错误：未配置SERPER_API_KEY，请在.env文件中设置该环境变量。";
      }

      // 使用搜索引擎获取天气信息
      const response = await axios.post(
        'https://google.serper.dev/search',
        { 
          q: `${input} 天气`,
          gl: 'cn',
          hl: 'zh-cn'
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;
      
      // 构造给大模型的提示词
      let searchResult = '';
      if (data.organic && data.organic.length > 0) {
        // 提取前几个搜索结果
        const topResults = data.organic.slice(0, 3);
        searchResult = topResults.map((item: any) => item.snippet).join('\n');
      } else if (data.answerBox?.answer) {
        searchResult = data.answerBox.answer;
      }
      
      if (!searchResult) {
        return "未找到相关天气信息。";
      }

      // 使用大模型整理信息
      const prompt = `请根据以下搜索结果，用简洁明了的中文回答"${input}"的天气情况:\n\n${searchResult}`;
      const llmResponse = await qwenModal.invoke(prompt);
      
      return llmResponse.content as string;
    } catch (error: any) {
      return `天气查询失败: ${error.message}`;
    }
  },
});

// 创建一个简单的网络搜索工具
const searchTool = new DynamicTool({
  name: "web_search",
  description: "执行网络搜索。输入参数应该是搜索关键词，例如：人工智能发展历史",
  func: async (input: string) => {
    try {
      const apiKey = process.env.SERPER_API_KEY;
      if (!apiKey) {
        return "错误：未配置SERPER_API_KEY，请在.env文件中设置该环境变量。";
      }

      // 使用搜索引擎获取信息
      const response = await axios.post(
        'https://google.serper.dev/search',
        { q: input },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;
      
      // 提取搜索结果
      let searchResults = '';
      if (data.answerBox?.answer) {
        searchResults = data.answerBox.answer;
      } else if (data.organic?.length > 0) {
        // 整理前几个搜索结果
        const topResults = data.organic.slice(0, 5);
        searchResults = topResults.map((item: any) => 
          `标题: ${item.title}\n摘要: ${item.snippet}${item.link ? `\n链接: ${item.link}` : ''}`
        ).join('\n\n');
      }
      
      if (!searchResults) {
        return "未找到相关搜索结果。";
      }

      // 使用大模型整理和总结信息
      const prompt = `请根据以下搜索结果，用中文回答问题"${input}"。请组织语言，提供清晰、准确且有条理的回答：\n\n${searchResults}`;
      const llmResponse = await qwenModal.invoke(prompt);
      
      return llmResponse.content as string;
    } catch (error: any) {
      return `搜索失败: ${error.message}`;
    }
  },
});

// 创建一个时间查询工具
const timeTool = new DynamicTool({
  name: "current_time",
  description: "获取当前时间",
  func: async () => {
    return `当前时间: ${new Date().toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })}`;
  },
});

// 导出全部工具
export { calculatorTool, weatherTool, searchTool, timeTool };

export const commonTools = [calculatorTool, weatherTool, searchTool, timeTool];
