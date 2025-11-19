import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROMA_DATA_PATH = path.resolve(__dirname, "../../../chroma_data");
const CHROMA_PORT = process.env.CHROMA_PORT || "8000";
const CHROMA_SERVER_URL =
  process.env.CHROMA_SERVER_URL || `http://localhost:${CHROMA_PORT}`;

let chromaProcess: ChildProcess | null = null;

/**
 * 检查 ChromaDB 服务器是否正在运行
 */
async function checkServerRunning(): Promise<boolean> {
  try {
    // Node.js 18+ 支持原生 fetch，chromadb 包也导入了 isomorphic-fetch
    const response = await fetch(`${CHROMA_SERVER_URL}/api/v1/heartbeat`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 检查 chromadb 是否已安装（通过 pipx 或 Python 模块）
 */
async function checkChromaInstalled(): Promise<{
  installed: boolean;
  method: "pipx" | "python-module" | null;
  pythonCmd?: string;
}> {
  // 方法1: 检查 pipx 安装的 chromadb
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const pipxChromaPath = `${homeDir}/.local/pipx/venvs/chromadb/bin/python`;
  try {
    const { execSync } = await import("node:child_process");
    const { existsSync } = await import("node:fs");
    if (existsSync(pipxChromaPath)) {
      // 验证是否可以运行 chromadb CLI
      try {
        execSync(`${pipxChromaPath} -m chromadb.cli.cli --help`, {
          stdio: "ignore"
        });
        return { installed: true, method: "pipx", pythonCmd: pipxChromaPath };
      } catch {
        // pipx 虚拟环境存在但无法运行，继续检查其他方式
      }
    }
  } catch {
    // 继续检查其他方式
  }

  // 方法2: 检查项目虚拟环境中的 chromadb
  const projectRoot = path.resolve(__dirname, "../../..");
  const venvPythonPath = path.join(projectRoot, "venv", "bin", "python");
  try {
    const { existsSync } = await import("node:fs");
    if (existsSync(venvPythonPath)) {
      // 验证是否可以运行 chromadb CLI
      try {
        const { execSync } = await import("node:child_process");
        execSync(`${venvPythonPath} -m chromadb.cli.cli --help`, {
          stdio: "ignore"
        });
        return {
          installed: true,
          method: "python-module",
          pythonCmd: venvPythonPath
        };
      } catch {
        // 虚拟环境存在但无法运行，继续检查系统 Python
      }
    }
  } catch {
    // 继续检查其他方式
  }

  // 方法3: 检查系统 Python 模块
  const pythonCommands = ["python3", "python"];
  for (const cmd of pythonCommands) {
    try {
      const { execSync } = await import("node:child_process");
      execSync(`which ${cmd}`, { stdio: "ignore" });

      // 检查 chromadb 模块是否可用
      try {
        execSync(`${cmd} -m chromadb.cli.cli --help`, { stdio: "ignore" });
        return { installed: true, method: "python-module", pythonCmd: cmd };
      } catch {
        // 模块不存在，继续尝试下一个 Python 命令
      }
    } catch {
      // Python 命令不存在，继续尝试下一个
    }
  }

  return { installed: false, method: null };
}

/**
 * 使用 Python 启动 ChromaDB 服务器
 */
async function startWithPython(): Promise<ChildProcess> {
  // 先检查是否已安装
  const checkResult = await checkChromaInstalled();

  if (!checkResult.installed) {
    throw new Error(
      "ChromaDB 未安装或无法运行。\n\n" +
        "请选择以下方式之一安装：\n" +
        "1. 使用 Docker（最简单，推荐）:\n" +
        "   https://www.docker.com/get-started\n\n" +
        "2. 使用系统 Python 和虚拟环境:\n" +
        "   python3 -m venv venv\n" +
        "   source venv/bin/activate\n" +
        "   pip install chromadb\n\n" +
        "3. 使用 pip（全局安装，不推荐）:\n" +
        "   pip3 install chromadb\n\n" +
        "注意: pipx 安装的 chromadb 可能存在依赖问题，建议使用 Docker 或虚拟环境。"
    );
  }

  // 确保数据目录存在
  await mkdir(CHROMA_DATA_PATH, { recursive: true });

  let chromaProcess: ChildProcess;

  if (
    (checkResult.method === "pipx" || checkResult.method === "python-module") &&
    checkResult.pythonCmd
  ) {
    // 使用 Python 模块方式启动（pipx 或系统 Python）
    chromaProcess = spawn(
      checkResult.pythonCmd,
      [
        "-m",
        "chromadb.cli.cli",
        "run",
        "--path",
        CHROMA_DATA_PATH,
        "--port",
        CHROMA_PORT
      ],
      {
        stdio: "pipe",
        cwd: process.cwd()
      }
    );
  } else {
    throw new Error("无法确定启动方式");
  }

  // 处理输出
  chromaProcess.stdout?.on("data", (data) => {
    const output = data.toString();
    if (
      output.includes("Running Chroma") ||
      output.includes("Uvicorn running") ||
      output.includes("Application startup complete")
    ) {
      console.log("✅ ChromaDB 服务器已启动");
    }
  });

  chromaProcess.stderr?.on("data", (data) => {
    const error = data.toString();
    // 检查是否是模块未找到的错误
    if (
      error.includes("ModuleNotFoundError") ||
      error.includes("No module named 'chromadb'")
    ) {
      console.error("\n❌ ChromaDB Python 模块未安装");
      console.error("请运行以下命令安装：");
      console.error("  python3 -m venv venv");
      console.error("  source venv/bin/activate");
      console.error("  pip install chromadb");
    } else if (
      error.includes("PydanticImportError") ||
      error.includes("BaseSettings")
    ) {
      console.error("\n❌ ChromaDB 依赖问题（pydantic 版本不兼容）");
      console.error("建议使用 Docker 或虚拟环境重新安装：");
      console.error("  docker run -d -p 8000:8000 chromadb/chroma");
      console.error(
        "  或: python3 -m venv venv && source venv/bin/activate && pip install chromadb"
      );
    } else if (
      !error.includes("WARNING") &&
      !error.includes("INFO") &&
      !error.includes("DEBUG")
    ) {
      // 只显示非警告/信息级别的错误
      const errorLines = error
        .split("\n")
        .filter(
          (line: string) =>
            line.trim() &&
            !line.includes("WARNING") &&
            !line.includes("INFO") &&
            !line.includes("DEBUG")
        );
      if (errorLines.length > 0) {
        console.error("ChromaDB 服务器错误:", errorLines.join("\n"));
      }
    }
  });

  chromaProcess.on("error", (error) => {
    console.error("无法启动 ChromaDB 服务器:", error.message);
  });

  return chromaProcess;
}

/**
 * 使用 Docker 启动 ChromaDB 服务器
 */
async function startWithDocker(): Promise<ChildProcess> {
  // 检查 Docker 是否可用
  try {
    const { execSync } = await import("node:child_process");
    execSync("docker --version", { stdio: "ignore" });
  } catch {
    throw new Error("Docker 未安装或不可用");
  }

  // 确保数据目录存在
  await mkdir(CHROMA_DATA_PATH, { recursive: true });

  // 检查容器是否已存在
  try {
    const { execSync } = await import("node:child_process");
    const containerExists = execSync(
      `docker ps -a --filter "name=chromadb" --format "{{.Names}}"`,
      { encoding: "utf-8" }
    ).trim();

    if (containerExists === "chromadb") {
      // 检查是否正在运行
      const isRunning = execSync(
        `docker ps --filter "name=chromadb" --format "{{.Names}}"`,
        { encoding: "utf-8" }
      ).trim();

      if (isRunning === "chromadb") {
        console.log("✅ ChromaDB 容器已在运行");
      } else {
        console.log("🔄 启动现有容器...");
        execSync("docker start chromadb", { stdio: "inherit" });
      }
      // Docker 容器是后台运行的，不需要返回进程
      return null as unknown as ChildProcess;
    }
    // 创建新容器
    console.log("🆕 创建新的 ChromaDB 容器...");
    execSync(
      `docker run -d -p ${CHROMA_PORT}:8000 -v "${CHROMA_DATA_PATH}:/chroma/chroma" --name chromadb chromadb/chroma`,
      { stdio: "inherit" }
    );
    return null as unknown as ChildProcess;
  } catch (error) {
    throw new Error(
      `Docker 操作失败: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * 启动 ChromaDB 服务器
 * 自动检测并使用可用的方式（Docker > Python）
 */
export async function startChromaServer(): Promise<void> {
  // 先检查服务器是否已经在运行
  if (await checkServerRunning()) {
    console.log("✅ ChromaDB 服务器已在运行");
    return;
  }

  // 优先尝试 Docker
  try {
    await startWithDocker();
    console.log("✅ 使用 Docker 启动 ChromaDB 服务器");

    // 等待服务器启动
    const maxRetries = 10;
    let retries = maxRetries;
    while (retries > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });
      if (await checkServerRunning()) {
        return;
      }
      retries -= 1;
    }
    throw new Error("服务器启动超时");
  } catch (dockerError) {
    console.log("⚠️  Docker 不可用，尝试使用 Python...");

    // 回退到 Python
    try {
      chromaProcess = await startWithPython();
      console.log("✅ 使用 Python 启动 ChromaDB 服务器");

      // 等待服务器启动
      const maxRetries2 = 10;
      let retries2 = maxRetries2;
      while (retries2 > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 1000);
        });
        if (await checkServerRunning()) {
          return;
        }
        retries2 -= 1;
      }
      throw new Error("服务器启动超时");
    } catch (pythonError) {
      throw new Error(
        `无法启动 ChromaDB 服务器。\n` +
          `Docker 错误: ${
            dockerError instanceof Error
              ? dockerError.message
              : String(dockerError)
          }\n` +
          `Python 错误: ${
            pythonError instanceof Error
              ? pythonError.message
              : String(pythonError)
          }\n\n` +
          `请确保安装了以下之一：\n` +
          `1. Docker: https://www.docker.com/get-started\n` +
          `2. Python 3.8+ 和 ChromaDB: pip3 install chromadb`
      );
    }
  }
}

/**
 * 停止 ChromaDB 服务器
 */
export async function stopChromaServer(): Promise<void> {
  if (chromaProcess) {
    chromaProcess.kill();
    chromaProcess = null;
    console.log("✅ ChromaDB 服务器已停止");
  } else {
    // 尝试停止 Docker 容器
    try {
      const { execSync } = await import("node:child_process");
      execSync("docker stop chromadb", { stdio: "ignore" });
      console.log("✅ ChromaDB Docker 容器已停止");
    } catch {
      // 忽略错误
    }
  }
}

/**
 * 检查 ChromaDB 服务器状态
 */
export async function getServerStatus(): Promise<{
  running: boolean;
  url: string;
}> {
  const running = await checkServerRunning();
  return {
    running,
    url: CHROMA_SERVER_URL
  };
}

