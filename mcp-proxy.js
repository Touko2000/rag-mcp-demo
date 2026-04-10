#!/usr/bin/env node

/**
 * MCP Server Proxy
 * 一个使用 Express 和 CORS 的透明代理服务器，用于连接基于 stdio 的 MCP Server
 * 为浏览器客户端提供 SSE 端点
 */

import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import readline from 'readline'
import path from 'path'
import fs from 'fs'

// 配置
const PORT = 3001
// 使用当前工作目录作为默认目标文件夹
// 注意：MCP服务器只能访问启动时指定的目录及其子目录
const TARGET_DIRECTORY = path.join(process.cwd())
const MCP_SERVER_PATH = 'npx' // npx 命令
const MCP_SERVER_ARGS = ['-y', '@modelcontextprotocol/server-filesystem', TARGET_DIRECTORY] // 运行官方的 server-filesystem MCP Server

// 创建 Express 应用
const app = express()

// 使用 CORS 中间件解决跨域问题
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Cache-Control'],
  }),
)

// 解析 JSON 请求体
app.use(express.json())

// 存储所有活跃的 SSE 连接
let activeConnections = []

// MCP 子进程
let mcpProcess = null

// 启动 MCP 子进程
function startMCPServer() {
  if (mcpProcess) return
  console.log(`🚀 正在启动底层 MCP Server，挂载目录: ${TARGET_DIRECTORY}`)

  // 启动 MCP 子进程
  mcpProcess = spawn(MCP_SERVER_PATH, MCP_SERVER_ARGS, {
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  // 使用 readline 按行读取输出
  const rl = readline.createInterface({
    input: mcpProcess.stdout,
    terminal: false,
  })

  // 监听 stdout，往所有活跃的 SSE 连接灌数据
  rl.on('line', (line) => {
    if (line.trim()) {
      console.log('⬅️ 收到底层响应:', line)
      // 遍历所有活跃的连接并发送消息
      activeConnections.forEach((res) => {
        try {
          res.write(`event: message\ndata: ${line}\n\n`)
        } catch (error) {
          console.error('Error writing to connection:', error)
        }
      })
    }
  })

  // 监听 stderr
  mcpProcess.stderr.on('data', (data) => {
    console.error(`⚠️ 底层警告: ${data.toString()}`)
  })

  // 监听子进程的退出
  mcpProcess.on('exit', (code) => {
    console.log(`❌ 底层进程已退出，状态码 ${code}`)
    mcpProcess = null
  })
}

// 处理 OPTIONS 请求
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Cache-Control')
    res.setHeader('Access-Control-Max-Age', '86400')
    res.sendStatus(204)
  } else {
    next()
  }
})

// 建立 SSE 连接
app.get('/mcp-sse', (req, res) => {
  console.log('🔗 前端已建立 SSE 连接')

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // 将新连接添加到活跃连接数组
  activeConnections.push(res)

  // 确保底层进程活着
  startMCPServer()

  // 告诉前端去哪里发指令（使用相对路径，通过 Vite 代理）
  const endpoint = `/mcp/mcp-send`
  res.write(`event: endpoint\ndata: ${endpoint}\n\n`)

  // 当客户端关闭连接时，清理资源
  req.on('close', () => {
    console.log('🔌 前端已断开连接')
    // 从活跃连接数组中移除断开的连接
    const index = activeConnections.indexOf(res)
    if (index !== -1) {
      activeConnections.splice(index, 1)
    }
  })

  // 处理错误
  req.on('error', (err) => {
    console.error('❌ 请求错误:', err)
  })

  res.on('error', (err) => {
    console.error('❌ 响应错误:', err)
  })
})

// 前端发送指令的通道
app.post('/mcp-send', (req, res) => {
  console.log('📨 收到前端指令')

  if (!mcpProcess || !mcpProcess.stdin) {
    console.error('❌ MCP Server 未运行')
    return res.status(500).send('MCP Server 未运行')
  }

  try {
    // 确保消息是字符串
    const message = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    console.log('➡️ 转发指令:', message)
    mcpProcess.stdin.write(message + '\n')
    res.sendStatus(200)
  } catch (error) {
    console.error('❌ 消息发送失败:', error)
    res.status(500).send('消息发送失败')
  }
})

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mcpRunning: !!mcpProcess })
})

// 获取文件信息端点
app.post('/get-file-info', (req, res) => {
  console.log('📨 收到获取文件信息请求')

  const { paths } = req.body

  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ error: 'Paths array is required' })
  }

  try {
    const fileInfos = paths.map(filePath => {
      try {
        // 规范化路径，确保跨平台兼容性
        const normalizedPath = path.normalize(filePath)

        let fullPath;
        // 检查路径是否是绝对路径
        if (path.isAbsolute(normalizedPath)) {
          // 对于绝对路径，直接使用
          fullPath = normalizedPath
        } else {
          // 对于相对路径，基于项目根目录
          fullPath = path.join(TARGET_DIRECTORY, normalizedPath)
        }

        console.log(`Getting info for file: ${fullPath}`)
        const stats = fs.statSync(fullPath)

        return {
          path: filePath,
          size: stats.size,
          mtime: stats.mtime.getTime() / 1000,
          exists: true
        }
      } catch (error) {
        console.error(`Failed to get info for ${filePath}:`, error)
        return {
          path: filePath,
          size: 0,
          mtime: Date.now() / 1000,
          exists: false
        }
      }
    })

    res.json({ fileInfos })
  } catch (error) {
    console.error('Failed to process file info request:', error)
    res.status(500).json({ error: 'Failed to get file info' })
  }
})

// 读取文件内容端点
app.post('/read-file', (req, res) => {
  console.log('📨 收到读取文件内容请求')

  const { path: filePath } = req.body

  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' })
  }

  try {
    // 规范化路径，确保跨平台兼容性
    const normalizedPath = path.normalize(filePath)

    let fullPath;
    // 检查路径是否是绝对路径
    if (path.isAbsolute(normalizedPath)) {
      // 对于绝对路径，直接使用
      fullPath = normalizedPath
    } else {
      // 对于相对路径，基于项目根目录
      fullPath = path.join(TARGET_DIRECTORY, normalizedPath)
    }

    console.log(`Reading file: ${fullPath}`)

    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    // 检查是否是文件
    const stats = fs.statSync(fullPath)
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' })
    }

    // 读取文件内容
    const content = fs.readFileSync(fullPath, 'utf8')

    // 提取文件类型
    const ext = path.extname(fullPath).toLowerCase()
    let type = 'text/plain'
    if (ext === '.md' || ext === '.markdown') {
      type = 'text/markdown'
    }

    res.json({
      path: filePath,
      content: content,
      type: type,
      size: stats.size,
      lastModified: stats.mtime.getTime() / 1000
    })
  } catch (error) {
    console.error('Failed to read file:', error)
    res.status(500).json({ error: 'Failed to read file' })
  }
})

// 扫描文档端点
app.post('/scan-documents', (req, res) => {
  console.log('📨 收到扫描文档请求')

  const { folderPath } = req.body

  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path is required' })
  }

  try {
    // 规范化路径，确保跨平台兼容性
    const normalizedPath = path.normalize(folderPath)

    let fullPath;
    // 检查路径是否是绝对路径
    if (path.isAbsolute(normalizedPath)) {
      // 对于绝对路径，直接使用
      fullPath = normalizedPath
    } else {
      // 对于相对路径，基于项目根目录
      fullPath = path.join(TARGET_DIRECTORY, normalizedPath)
    }

    console.log(`Scanning folder: ${fullPath}`)

    // 检查文件夹是否存在
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Folder not found' })
    }

    // 检查是否是文件夹
    const stats = fs.statSync(fullPath)
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' })
    }

    // 扫描文件夹中的所有文件
    const documents = []
    const files = fs.readdirSync(fullPath)

    files.forEach(file => {
      try {
        const filePath = path.join(fullPath, file)
        const fileStats = fs.statSync(filePath)

        if (fileStats.isFile()) {
          const ext = path.extname(file).toLowerCase()
          if (ext === '.md' || ext === '.markdown' || ext === '.pdf') {
            documents.push({
              id: filePath,
              filename: file,
              path: filePath,
              size: fileStats.size,
              lastModified: new Date(fileStats.mtime).toISOString(),
              type: ext === '.pdf' ? 'pdf' : 'markdown'
            })
          }
        }
      } catch (error) {
        console.error(`Failed to process file ${file}:`, error)
      }
    })

    res.json({ documents })
  } catch (error) {
    console.error('Failed to scan documents:', error)
    res.status(500).json({ error: 'Failed to scan documents' })
  }
})

// 检索端点
app.post('/search', (req, res) => {
  console.log('📨 收到检索请求')

  const { query, paths } = req.body

  if (!query) {
    return res.status(400).json({ error: 'Query is required' })
  }

  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ error: 'Paths array is required' })
  }

  try {
    const results = []

    // 遍历所有文件路径
    for (const filePath of paths) {
      try {
        // 规范化路径，确保跨平台兼容性
        const normalizedPath = path.normalize(filePath)

        let fullPath;
        // 检查路径是否是绝对路径
        if (path.isAbsolute(normalizedPath)) {
          // 对于绝对路径，直接使用
          fullPath = normalizedPath
        } else {
          // 对于相对路径，先尝试直接使用（适用于用户选择的文件夹中的文件）
          fullPath = normalizedPath;
          // 如果文件不存在，再尝试基于项目根目录
          if (!fs.existsSync(fullPath)) {
            fullPath = path.join(TARGET_DIRECTORY, normalizedPath);
          }
        }

        // 检查文件是否存在
        if (!fs.existsSync(fullPath)) {
          console.log(`File not found: ${fullPath}`);
          continue
        }

        // 检查是否是文件
        const stats = fs.statSync(fullPath)
        if (!stats.isFile()) {
          continue
        }

        // 读取文件内容
        const content = fs.readFileSync(fullPath, 'utf8')

        // 提取文件名
        const filename = path.basename(fullPath)

        // 关键词匹配
        const matches = findKeywordMatches(content, query)

        // 计算相关度分数
        const score = calculateRelevanceScore(content, query)

        // 如果有匹配，添加到结果中
        if (matches.length > 0) {
          results.push({
            filename: filename,
            path: filePath,
            score: score,
            matches: matches
          })
        }
      } catch (error) {
        console.error(`Failed to process file ${filePath}:`, error)
        continue
      }
    }

    // 按相关度分数排序
    results.sort((a, b) => b.score - a.score)

    res.json({
      query: query,
      results: results
    })
  } catch (error) {
    console.error('Failed to process search request:', error)
    res.status(500).json({ error: 'Failed to process search request' })
  }
})

// 查找关键词匹配
function findKeywordMatches(content, query) {
  const matches = []
  const lines = content.split('\n')

  // 支持多个关键词
  const keywords = query.split(' ').filter(k => k.trim())

  lines.forEach((line, lineIndex) => {
    // 检查是否包含任何关键词
    const hasMatch = keywords.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))

    if (hasMatch) {
      // 提取匹配的文本片段（包含前后几行）
      const startLine = Math.max(0, lineIndex - 1)
      const endLine = Math.min(lines.length - 1, lineIndex + 1)
      const context = lines.slice(startLine, endLine + 1).join('\n')

      matches.push({
        line: lineIndex + 1,
        content: context
      })
    }
  })

  return matches
}

// 计算相关度分数
function calculateRelevanceScore(content, query) {
  // 支持多个关键词
  const keywords = query.split(' ').filter(k => k.trim())
  if (keywords.length === 0) {
    return 0
  }

  // 计算关键词出现的总次数
  let totalMatches = 0
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword.toLowerCase(), 'g')
    const matches = content.toLowerCase().match(regex)
    if (matches) {
      totalMatches += matches.length
    }
  })

  // 计算文档长度
  const docLength = content.length

  // 计算关键词密度
  const density = totalMatches / docLength

  // 归一化分数到 0-1 范围
  // 使用 sigmoid 函数使其在合理范围内
  const score = 1 / (1 + Math.exp(-1000 * density))

  return score
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ MCP Proxy 运行在 http://localhost:${PORT}`)
  console.log(`📡 SSE 端点: http://localhost:${PORT}/mcp-sse`)
  console.log(`📤 发送端点: http://localhost:${PORT}/mcp-send`)
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`)
  console.log(`📖 读取文件端点: http://localhost:${PORT}/read-file`)
  console.log(`🔍 检索端点: http://localhost:${PORT}/search`)
})

// 处理进程终止
process.on('SIGINT', async () => {
  console.log('🛑 正在关闭 MCP Proxy...')

  // 停止 MCP 子进程
  if (mcpProcess) {
    try {
      mcpProcess.kill()
    } catch (error) {
      console.error('Error killing MCP process:', error)
    }
  }

  console.log('✅ MCP Proxy 已关闭')
  process.exit(0)
})
