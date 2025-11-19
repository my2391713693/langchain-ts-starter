#!/bin/bash

# ChromaDB 启动脚本
# 此脚本会尝试使用 Docker 启动 ChromaDB 服务器

CHROMA_DATA_DIR="./chroma_data"
CHROMA_PORT=8000

echo "🚀 正在启动 ChromaDB 服务器..."

# 检查 Docker 是否安装
if command -v docker &> /dev/null; then
    echo "✅ 检测到 Docker"
    
    # 检查容器是否已存在
    if docker ps -a --format '{{.Names}}' | grep -q "^chromadb$"; then
        echo "📦 发现已存在的 ChromaDB 容器"
        if docker ps --format '{{.Names}}' | grep -q "^chromadb$"; then
            echo "✅ ChromaDB 服务器已在运行"
        else
            echo "🔄 启动现有容器..."
            docker start chromadb
        fi
    else
        echo "🆕 创建新的 ChromaDB 容器..."
        docker run -d \
            -p ${CHROMA_PORT}:8000 \
            -v "$(pwd)/${CHROMA_DATA_DIR}:/chroma/chroma" \
            --name chromadb \
            chromadb/chroma
    fi
    
    echo "✅ ChromaDB 服务器已启动在 http://localhost:${CHROMA_PORT}"
    echo "📊 数据存储在: $(pwd)/${CHROMA_DATA_DIR}"
    echo ""
    echo "停止服务器: docker stop chromadb"
    echo "查看日志: docker logs -f chromadb"
    
elif command -v chroma &> /dev/null; then
    echo "✅ 检测到 ChromaDB CLI"
    echo "🔄 使用 CLI 启动服务器..."
    chroma run --path "${CHROMA_DATA_DIR}"
    
else
    echo "❌ 未找到 Docker 或 ChromaDB CLI"
    echo ""
    echo "请选择以下方式之一："
    echo ""
    echo "1. 安装 Docker（推荐）:"
    echo "   https://www.docker.com/get-started"
    echo ""
    echo "2. 安装 ChromaDB CLI:"
    echo "   # 使用 pipx（推荐）"
    echo "   brew install pipx"
    echo "   pipx install chromadb"
    echo ""
    echo "   # 或使用虚拟环境"
    echo "   python3 -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install chromadb"
    exit 1
fi

