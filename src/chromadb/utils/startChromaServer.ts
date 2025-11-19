import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROMA_DATA_PATH = path.resolve(__dirname, "../../../chroma_data");
const CHROMA_PORT = process.env.CHROMA_PORT || "8000";

/**
 * 启动 ChromaDB 服务器
 * 注意：需要先安装 chromadb CLI 工具
 * npm install -g chromadb 或使用 Docker
 */
export function startChromaServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 尝试使用 chroma CLI 启动服务器
    const chromaProcess = spawn(
      "chroma",
      ["run", "--path", CHROMA_DATA_PATH, "--port", CHROMA_PORT],
      {
        stdio: "inherit",
        shell: true
      }
    );

    chromaProcess.on("error", (error) => {
      console.error("无法启动 ChromaDB 服务器:", error);
      console.error("\n请确保已安装 ChromaDB CLI:");
      console.error("  pip install chromadb");
      console.error("\n或者使用 Docker:");
      console.error(
        "  docker run -p 8000:8000 -v $(pwd)/chroma_data:/chroma/chroma chromadb/chroma"
      );
      reject(error);
    });

    chromaProcess.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`ChromaDB 服务器退出，代码: ${code}`));
      }
    });

    // 等待服务器启动
    setTimeout(() => {
      resolve();
    }, 2000);
  });
}

