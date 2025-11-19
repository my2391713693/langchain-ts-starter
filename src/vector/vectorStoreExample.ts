import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

// DashScope文本嵌入API的实现
async function embedTexts(texts: string[]) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY 环境变量未设置");
  }

  const embeddings = [];
  
  for (const text of texts) {
    try {
      const response = await axios.post(
        "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding",
        {
          model: "text-embedding-v1",
          input: {
            texts: [text]
          }
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      const embedding = response.data.output.embeddings[0].embedding;
      embeddings.push(embedding);
    } catch (error) {
      console.error("嵌入生成失败:", error);
      throw error;
    }
  }
  
  return embeddings;
}

// 简单的内存向量存储实现示例
async function run() {
  // 创建一些示例文档
  const texts = [
    "This is a document about machine learning",
    "This document covers natural language processing",
    "This document discusses computer vision techniques",
    "This is a document about deep learning neural networks"
  ];
  
  // 生成嵌入向量
  console.log("正在生成嵌入向量...");
  const vectors = await embedTexts(texts);
  
  console.log("嵌入向量生成完成");
  console.log("向量维度:", vectors[0].length);
  console.log("文档数量:", vectors.length);
  
  // 为查询生成嵌入向量
  const query = "neural networks";
  console.log(`\n正在为查询"${query}"生成嵌入向量...`);
  const queryVector = (await embedTexts([query]))[0];
  console.log("查询向量生成完成");
  
  // 简单的相似度计算（点积）
  console.log("\n计算相似度...");
  const similarities = vectors.map((vector, index) => {
    // 计算点积作为相似度得分
    const dotProduct = vector.reduce((sum, val, i) => sum + val * queryVector[i], 0);
    return { index, score: dotProduct };
  });
  
  // 按相似度排序并获取前2个结果
  similarities.sort((a, b) => b.score - a.score);
  const topResults = similarities.slice(0, 2);
  
  console.log("\n搜索结果:");
  topResults.forEach((result, rank) => {
    console.log(`${rank + 1}. ${texts[result.index]} (相似度: ${result.score.toFixed(4)})`);
  });
}

run().catch(console.error);