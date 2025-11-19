import { ChromaClient, Collection, type Metadata } from "chromadb";
import * as dotenv from "dotenv";
import axios from "axios";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

dotenv.config();

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DashScope文本嵌入API的实现
async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY 环境变量未设置");
  }

  const embeddings: number[][] = [];

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
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      const { embedding } = response.data.output.embeddings[0];
      embeddings.push(embedding);
    } catch (error) {
      console.error("嵌入生成失败:", error);
      throw error;
    }
  }

  return embeddings;
}

// ChromaDB 服务类
export class ChromaService {
  private readonly client: ChromaClient;

  private readonly collectionName: string;

  private collection: Collection | null = null;

  constructor(collectionName = "documents") {
    // 使用纯 Node.js 方式，数据存储在本地
    // ChromaDB 需要运行本地服务器，默认端口 8000
    // 数据会持久化到 chroma_data 目录（需要启动 ChromaDB 服务器时指定）
    const chromaServerUrl =
      process.env.CHROMA_SERVER_URL || "http://localhost:8000";
    this.client = new ChromaClient({
      path: chromaServerUrl
    });
    this.collectionName = collectionName;
  }

  // 初始化集合
  async initialize(): Promise<void> {
    try {
      // 确保数据目录存在（用于 ChromaDB 服务器持久化）
      const chromaDataPath = path.resolve(__dirname, "../../chroma_data");
      await mkdir(chromaDataPath, { recursive: true });

      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: "文档向量存储集合" }
      });
      console.log(`ChromaDB 集合 "${this.collectionName}" 初始化成功`);
    } catch (error) {
      console.error("ChromaDB 初始化失败:", error);
      console.error("提示: 请确保 ChromaDB 服务器正在运行");
      console.error("启动命令: chroma run --path ./chroma_data");
      throw error;
    }
  }

  // 添加文档
  async addDocuments(
    texts: string[],
    ids?: string[],
    metadatas?: Metadata[]
  ): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    if (!this.collection) {
      throw new Error("集合未初始化");
    }

    // 生成嵌入向量
    console.log("正在生成嵌入向量...");
    const embeddings = await embedTexts(texts);

    // 生成 ID（如果未提供）
    const documentIds =
      ids || texts.map((_, index) => `doc_${Date.now()}_${index}`);

    // 准备元数据
    const documentsMetadata: Metadata[] =
      metadatas ||
      texts.map((text, index) => ({
        text,
        index,
        createdAt: new Date().toISOString()
      }));

    try {
      await this.collection.add({
        ids: documentIds,
        embeddings,
        documents: texts,
        metadatas: documentsMetadata
      });
      console.log(`成功添加 ${texts.length} 个文档到 ChromaDB`);
    } catch (error) {
      console.error("添加文档失败:", error);
      throw error;
    }
  }

  // 查询相似文档
  async query(
    queryText: string,
    where?: Record<string, unknown>,
    nResults = 5
  ): Promise<{
    ids: string[][];
    documents: string[][];
    metadatas: Record<string, unknown>[][];
    distances: number[][];
  }> {
    if (!this.collection) {
      await this.initialize();
    }

    if (!this.collection) {
      throw new Error("集合未初始化");
    }

    // 为查询生成嵌入向量
    const queryEmbedding = (await embedTexts([queryText]))[0];

    try {
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
        where
      });

      // 处理可能为 null 的 documents 和 distances
      return {
        ids: results.ids,
        documents: results.documents.map((docArray) =>
          docArray.map((doc) => doc || "")
        ),
        metadatas: results.metadatas as Record<string, unknown>[][],
        distances: results.distances || []
      };
    } catch (error) {
      console.error("查询失败:", error);
      throw error;
    }
  }

  // 获取所有文档
  async getAllDocuments(): Promise<{
    ids: string[];
    documents: string[];
    metadatas: Record<string, unknown>[];
  }> {
    if (!this.collection) {
      await this.initialize();
    }

    if (!this.collection) {
      throw new Error("集合未初始化");
    }

    try {
      const results = await this.collection.get();
      // 处理可能为 null 的 documents
      return {
        ids: results.ids,
        documents: results.documents.map((doc) => doc || ""),
        metadatas: results.metadatas as Record<string, unknown>[]
      };
    } catch (error) {
      console.error("获取文档失败:", error);
      throw error;
    }
  }

  // 删除文档
  async deleteDocuments(ids: string[]): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    if (!this.collection) {
      throw new Error("集合未初始化");
    }

    try {
      await this.collection.delete({ ids });
      console.log(`成功删除 ${ids.length} 个文档`);
    } catch (error) {
      console.error("删除文档失败:", error);
      throw error;
    }
  }

  // 获取集合统计信息
  async getCollectionInfo(): Promise<{
    name: string;
    count: number;
    metadata: Record<string, unknown>;
  }> {
    if (!this.collection) {
      await this.initialize();
    }

    if (!this.collection) {
      throw new Error("集合未初始化");
    }

    try {
      const count = await this.collection.count();
      return {
        name: this.collectionName,
        count,
        metadata: {}
      };
    } catch (error) {
      console.error("获取集合信息失败:", error);
      throw error;
    }
  }

  // 清空集合
  async clearCollection(): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    if (!this.collection) {
      throw new Error("集合未初始化");
    }

    try {
      const allDocs = await this.collection.get();
      if (allDocs.ids.length > 0) {
        await this.collection.delete({ ids: allDocs.ids });
      }
      console.log("集合已清空");
    } catch (error) {
      console.error("清空集合失败:", error);
      throw error;
    }
  }
}
