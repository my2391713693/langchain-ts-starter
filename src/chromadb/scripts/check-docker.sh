#!/bin/bash

# 检查 Docker 是否运行
echo "🔍 检查 Docker 状态..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    echo ""
    echo "请安装 Docker Desktop:"
    echo "  macOS: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if docker info &> /dev/null; then
    echo "✅ Docker 正在运行"
    echo ""
    echo "可以启动 ChromaDB 服务器："
    echo "  docker run -d -p 8000:8000 -v \$(pwd)/chroma_data:/chroma/chroma --name chromadb chromadb/chroma"
else
    echo "⚠️  Docker 已安装但未运行"
    echo ""
    echo "请启动 Docker Desktop："
    echo "  macOS: open -a Docker"
    echo "  或从应用程序文件夹打开 Docker"
    echo ""
    echo "等待 Docker 启动后，再次运行此脚本检查"
    exit 1
fi

