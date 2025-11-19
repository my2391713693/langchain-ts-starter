import express, { Request, Response } from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChromaService } from "./services/chromaService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// 初始化 ChromaDB 服务
const chromaService = new ChromaService();

// 初始化 ChromaDB（自动启动服务器）
(async () => {
  try {
    // 尝试自动启动 ChromaDB 服务器
    const { startChromaServer } = await import(
      "./utils/chromaServerManager.js"
    );
    console.log("🔄 正在启动 ChromaDB 服务器...");
    await startChromaServer();

    // 等待一下确保服务器完全启动
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });

    // 初始化服务
    await chromaService.initialize();
  } catch (error) {
    console.error("ChromaDB 初始化失败:", error);
    console.error("\n提示: 请手动启动 ChromaDB 服务器");
    console.error(
      "  使用 Docker: docker run -d -p 8000:8000 -v $(pwd)/chroma_data:/chroma/chroma --name chromadb chromadb/chroma"
    );
    console.error("  或使用 Python: chroma run --path ./chroma_data");
  }
})();

// API 路由

// 获取集合信息
app.get("/api/collection/info", async (_req: Request, res: Response) => {
  try {
    const info = await chromaService.getCollectionInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    console.error("获取集合信息失败:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    });
  }
});

// 获取所有文档
app.get("/api/documents", async (_req: Request, res: Response) => {
  try {
    const documents = await chromaService.getAllDocuments();
    res.json({ success: true, data: documents });
  } catch (error) {
    console.error("获取文档失败:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    });
  }
});

// 添加文档
app.post(
  "/api/documents",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { texts, ids, metadatas } = req.body;

      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        res.status(400).json({
          success: false,
          error: "请提供 texts 数组"
        });
        return;
      }

      await chromaService.addDocuments(texts, ids, metadatas);
      res.json({ success: true, message: "文档添加成功" });
    } catch (error) {
      console.error("添加文档失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "未知错误"
      });
    }
  }
);

// 查询相似文档
app.post("/api/query", async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, nResults = 5, where } = req.body;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        error: "请提供查询文本"
      });
      return;
    }

    const results = await chromaService.query(query, where, nResults);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error("查询失败:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    });
  }
});

// 删除文档
app.delete(
  "/api/documents",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: "请提供要删除的文档 ID 数组"
        });
        return;
      }

      await chromaService.deleteDocuments(ids);
      res.json({ success: true, message: "文档删除成功" });
    } catch (error) {
      console.error("删除文档失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "未知错误"
      });
    }
  }
);

// 清空集合
app.delete("/api/collection/clear", async (_req: Request, res: Response) => {
  try {
    await chromaService.clearCollection();
    res.json({ success: true, message: "集合已清空" });
  } catch (error) {
    console.error("清空集合失败:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 可视化界面: http://localhost:${PORT}`);
});
