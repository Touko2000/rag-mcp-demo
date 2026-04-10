#!/usr/bin/env node

/**
 * 测试 MCP 服务器支持的工具列表
 */

import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';

async function testMCPTools() {
  console.log('测试 MCP 服务器支持的工具列表...');
  
  try {
    // 创建 stdio 传输
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/touko/Desktop']
    });
    
    // 创建客户端
    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });
    
    // 连接到服务器
    await client.connect(transport);
    console.log('MCP 服务器连接成功');
    
    // 尝试调用 list_tools 工具
    try {
      const response = await client.callTool({
        name: 'list_tools',
        arguments: {}
      });
      
      console.log('MCP 服务器支持的工具:', response.toolResult);
    } catch (error) {
      console.error('调用 list_tools 工具失败:', error);
      
      // 尝试调用其他可能的工具来获取工具列表
      try {
        const response = await client.callTool({
          name: 'help',
          arguments: {}
        });
        
        console.log('MCP 服务器 help 工具返回:', response.toolResult);
      } catch (error) {
        console.error('调用 help 工具失败:', error);
      }
    }
    
    // 断开连接
    client.disconnect();
    console.log('MCP 服务器断开连接');
  } catch (error) {
    console.error('测试 MCP 服务器失败:', error);
  }
}

testMCPTools();