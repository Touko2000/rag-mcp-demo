#!/bin/bash

# 启动脚本 - 用于启动 RAG MCP 演示应用

# 颜色定义
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${GREEN}=== RAG MCP 演示应用启动脚本 ===${NC}"

# 检查并停止可能正在运行的服务器进程
echo -e "${YELLOW}检查并停止现有进程...${NC}"
# 停止前端开发服务器（端口 5173）
if lsof -i:5173 > /dev/null 2>&1; then
  echo -e "${YELLOW}停止前端开发服务器...${NC}"
  lsof -t -i:5173 | xargs kill -9 2>/dev/null || true
fi

# 停止 MCP 代理服务器（端口 3001）
if lsof -i:3001 > /dev/null 2>&1; then
  echo -e "${YELLOW}停止 MCP 代理服务器...${NC}"
  lsof -t -i:3001 | xargs kill -9 2>/dev/null || true
fi

# 等待进程停止
sleep 2

# 启动 MCP 代理服务器
echo -e "${GREEN}启动 MCP 代理服务器...${NC}"
nohup node mcp-proxy.js > mcp-proxy.log 2>&1 &
sleep 3

# 检查 MCP 代理服务器是否启动成功
if lsof -i:3001 > /dev/null 2>&1; then
  echo -e "${GREEN}MCP 代理服务器启动成功，端口: 3001${NC}"
else
  echo -e "${RED}MCP 代理服务器启动失败${NC}"
  exit 1
fi

# 启动前端开发服务器
echo -e "${GREEN}启动前端开发服务器...${NC}"
nohup npm run dev > dev-server.log 2>&1 &
sleep 3

# 检查前端开发服务器是否启动成功
if lsof -i:5173 > /dev/null 2>&1; then
  echo -e "${GREEN}前端开发服务器启动成功，端口: 5173${NC}"
else
  echo -e "${RED}前端开发服务器启动失败${NC}"
  exit 1
fi

# 显示服务器状态
echo -e "${GREEN}=== 服务器启动完成 ===${NC}"
echo -e "${GREEN}前端应用访问地址: http://localhost:5173${NC}"
echo -e "${GREEN}MCP 代理服务器地址: http://localhost:3001${NC}"
echo -e "${YELLOW}查看日志:${NC}"
echo -e "  - 前端开发服务器日志: tail -f dev-server.log"
echo -e "  - MCP 代理服务器日志: tail -f mcp-proxy.log"
echo -e "${GREEN}=== 启动脚本执行完成 ===${NC}"
