# langchain-ts-starter

Boilerplate to get started quickly with the [Langchain Typescript SDK](https://github.com/hwchase17/langchainjs).

This uses the same tsconfig and build setup as the [examples repo](https://github.com/hwchase17/langchainjs/tree/main/examples), to ensure it's in sync with the official docs.

# What's included

- Typescript
- .env file configuration
- ESLint and Prettier for formatting
- Turborepo to quickly run build scripts
- `tsup` to bundle Typescript code
- `tsx` to quickly run compiled code
- **ChromaDB 向量数据库集成（纯 Node.js 方式）**
- **Web 可视化界面**

# ChromaDB 配置和使用

本项目已配置 ChromaDB，**使用纯 Node.js 方式自动管理 ChromaDB 服务器**，数据存储在本地 `chroma_data` 目录。

**重要说明**：ChromaDB 服务器本身是用 Python 编写的，但本项目使用 Node.js 自动检测并启动 ChromaDB 服务器，您无需手动管理服务器进程。系统会按以下优先级自动选择启动方式：
1. Docker（如果已安装）
2. Python + ChromaDB（如果已安装）

## 环境变量配置

在项目根目录创建 `.env` 文件，添加以下配置：

```env
DASHSCOPE_API_KEY=your_dashscope_api_key_here
PORT=3000
CHROMA_SERVER_URL=http://localhost:8000
CHROMA_PORT=8000
```

## 启动 ChromaDB 可视化界面

### 方式一：自动启动（最简单，推荐）✨

**Node.js 会自动检测并启动 ChromaDB 服务器，无需手动操作！**

1. 安装项目依赖：
```bash
npm install
```

2. 启动 Web 服务器（会自动启动 ChromaDB）：
```bash
npm run start:server
```

系统会自动：
- 检测 Docker 是否可用，如果可用则使用 Docker 启动
- 如果 Docker 不可用，检测 Python 和 ChromaDB 是否已安装
- 自动启动 ChromaDB 服务器
- 等待服务器就绪后启动 Web 服务

3. 打开浏览器访问：`http://localhost:3000`

**停止服务器**：
- 按 `Ctrl+C` 停止 Web 服务器，ChromaDB 服务器也会自动停止（Python 模式）
- 如果使用 Docker：`docker stop chromadb && docker rm chromadb`

**注意**：首次运行需要确保已安装以下之一：
- **Docker（强烈推荐，最简单）**：https://www.docker.com/get-started
- 或 Python 3.8-3.13 和 ChromaDB（注意：Python 3.14 与旧版 chromadb 不兼容）：
  ```bash
  # 使用虚拟环境（推荐）
  python3 -m venv venv
  source venv/bin/activate
  pip install chromadb
  
  # 如果遇到 pydantic 错误，可能需要降级 pydantic
  pip install "pydantic<2.0"
  ```

### 方式二：手动使用 Docker

1. **启动 Docker Desktop**：
   - macOS: 打开"应用程序"文件夹，双击"Docker"图标
   - 或运行命令：`open -a Docker`
   - 等待 Docker 启动完成（状态栏显示 Docker 图标）

2. 启动 ChromaDB 服务器（新终端窗口）：
```bash
docker run -d -p 8000:8000 -v $(pwd)/chroma_data:/chroma/chroma --name chromadb chromadb/chroma
```

**如果遇到 "Cannot connect to the Docker daemon" 错误**：
- 确保 Docker Desktop 正在运行
- 检查 Docker Desktop 状态栏图标是否显示为运行状态
- 如果未安装 Docker Desktop，请访问：https://www.docker.com/products/docker-desktop/

2. 安装项目依赖：
```bash
npm install
```

3. 启动 Web 服务器：
```bash
npm run start:server
```

4. 打开浏览器访问：`http://localhost:3000`

**停止服务器**：
```bash
docker stop chromadb && docker rm chromadb
```

### 方式三：使用 ChromaDB CLI（需要 Python）

1. 安装 Python 3.8+（如果还没有）：
   - macOS: `brew install python3`
   - 或从 [python.org](https://www.python.org/downloads/) 下载

2. 安装 ChromaDB CLI（推荐使用 pipx）：
```bash
# 安装 pipx（如果还没有）
brew install pipx
pipx ensurepath

# 使用 pipx 安装 ChromaDB（推荐）
pipx install chromadb
```

或者使用虚拟环境：
```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装 ChromaDB
pip install chromadb
```

3. 在项目根目录启动 ChromaDB 服务器（新终端窗口）：
```bash
# 如果使用 pipx 安装
chroma run --path ./chroma_data

# 如果使用虚拟环境，先激活环境
source venv/bin/activate
chroma run --path ./chroma_data
```

4. 安装项目依赖：
```bash
npm install
```

5. 启动 Web 服务器：
```bash
npm run start:server
```

6. 打开浏览器访问：`http://localhost:3000`

**停止服务器**：在运行 `chroma run` 的终端按 `Ctrl+C`

### 验证 ChromaDB 服务器是否运行

在启动 Web 服务器之前，确保 ChromaDB 服务器正在运行。可以通过以下命令检查：

```bash
curl http://localhost:8000/api/v1/heartbeat
```

如果返回 JSON 响应，说明服务器运行正常。

## 功能特性

### 可视化界面功能

- **查询标签页**：向量相似度查询
  - 输入查询文本
  - 设置返回结果数量
  - 查看相似度得分和匹配文档

- **文档管理标签页**：管理所有文档
  - 查看所有已存储的文档
  - 删除单个文档
  - 清空整个集合

- **添加文档标签页**：批量添加文档
  - 支持多行输入，每行一个文档
  - 自动生成嵌入向量
  - 自动生成文档 ID 和元数据

### API 接口

- `GET /api/collection/info` - 获取集合信息
- `GET /api/documents` - 获取所有文档
- `POST /api/documents` - 添加文档
- `POST /api/query` - 查询相似文档
- `DELETE /api/documents` - 删除文档
- `DELETE /api/collection/clear` - 清空集合

## 其他命令

- `npm start` - 运行主程序
- `npm run start:vector` - 运行向量存储示例
- `npx turbo run build lint format` - 并行运行构建、检查和格式化
