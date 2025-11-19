import * as dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";

dotenv.config();

// 检查是否提供了DashScope API密钥
if (!process.env.DASHSCOPE_API_KEY) {
  console.error("错误: 未找到DashScope API密钥。");
  console.error("请在.env文件中设置DASHSCOPE_API_KEY环境变量。");
  console.error(
    "可以从阿里云百炼平台获取API密钥: https://bailian.console.aliyun.com/"
  );
  process.exit(1);
}

// 使用阿里云百炼平台的Qwen模型
export const model = new ChatOpenAI({
  model: "qwen-plus",
  apiKey: process.env.DASHSCOPE_API_KEY,
  configuration: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
  }
});
