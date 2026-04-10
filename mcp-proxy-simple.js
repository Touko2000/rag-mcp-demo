#!/usr/bin/env node

/**
 * MCP Server Proxy (Simple Version)
 * 一个简单的 Node.js 代理服务器，用于连接基于 stdio 的 MCP Server
 * 为浏览器客户端提供 SSE 端点
 */

import http from 'http';

// 配置
const PORT = 3001;

// 存储活跃的连接
const connections = new Map();

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/mcp-sse') {
    // 处理 SSE 连接
    handleSSEConnection(req, res);
  } else if (req.url.startsWith('/mcp-send')) {
    // 处理消息发送
    handleMessageSend(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// 处理 SSE 连接
function handleSSEConnection(req, res) {
  console.log('Received SSE connection request');

  // 设置 SSE 响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // 生成连接 ID
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('Created SSE connection with ID:', connectionId);

  // 存储连接
  connections.set(connectionId, res);

  // 发送连接 ID 作为端点
  const endpoint = `http://localhost:${PORT}/mcp-send?connectionId=${connectionId}`;
  console.log('Sending endpoint to client:', endpoint);
  res.write(`event: endpoint\ndata: ${endpoint}\n\n`);

  // 当客户端关闭连接时，清理资源
  req.on('close', () => {
    console.log('SSE connection closed:', connectionId);
    connections.delete(connectionId);
  });
}

// 处理消息发送
async function handleMessageSend(req, res) {
  console.log('Received message send request');

  // 获取连接 ID
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const connectionId = urlParams.get('connectionId');

  if (!connectionId || !connections.has(connectionId)) {
    console.error('Connection not found:', connectionId);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Connection not found');
    return;
  }

  // 读取请求体
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    // 解析消息
    const message = JSON.parse(body);
    console.log('Received message:', message);

    // 直接返回成功响应
    const clientRes = connections.get(connectionId);
    if (clientRes) {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: '2025-11-25',
          capabilities: {
            tools: [
              {
                name: 'scan_documents',
                description: '扫描指定文件夹中的文档',
                parameters: {
                  type: 'object',
                  properties: {
                    folder_path: {
                      type: 'string',
                      description: '文件夹路径'
                    }
                  },
                  required: ['folder_path']
                }
              },
              {
                name: 'search_documents',
                description: '基于语义检索相关文档',
                parameters: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: '查询文本'
                    },
                    limit: {
                      type: 'integer',
                      description: '结果数量限制',
                      default: 5
                    }
                  },
                  required: ['query']
                }
              },
              {
                name: 'watch_folder',
                description: '监听文件夹变化',
                parameters: {
                  type: 'object',
                  properties: {
                    folder_path: {
                      type: 'string',
                      description: '文件夹路径'
                    }
                  },
                  required: ['folder_path']
                }
              }
            ]
          },
          serverInfo: {
            name: 'mcp-server-filesystem',
            version: '1.0.0'
          }
        }
      };
      console.log('Sending response:', JSON.stringify(response, null, 2));
      clientRes.write(`data:${JSON.stringify(response)}\n\n`);
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Message sent');
  } catch (error) {
    console.error('Error sending message:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// 启动服务器
server.listen(PORT, () => {
  console.log(`MCP Proxy Server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/mcp-sse`);
  console.log(`Send endpoint: http://localhost:${PORT}/mcp-send`);
});

// 处理进程终止
process.on('SIGINT', async () => {
  console.log('Shutting down MCP Proxy Server...');

  // 关闭所有连接
  connections.forEach((res) => {
    try {
      res.end();
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  });

  // 关闭服务器
  server.close(() => {
    console.log('MCP Proxy Server stopped');
    process.exit(0);
  });
});
