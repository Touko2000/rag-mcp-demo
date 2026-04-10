// 测试MCP连接的脚本
const { MCPClientService } = require('./dist/assets/index-ClC3XnqX.js');

async function testMCPConnection() {
  console.log('测试MCP连接...');
  
  const mcpClient = new MCPClientService();
  
  try {
    // 尝试连接到MCP服务器
    await mcpClient.connect({
      type: 'sse',
      url: 'http://localhost:5174/mcp/mcp-sse'
    });
    
    console.log('✅ MCP连接成功！');
    
    // 尝试扫描文档
    const documents = await mcpClient.scanDocuments('');
    console.log('✅ 文档扫描成功，找到', documents.length, '个文档');
    
    // 断开连接
    await mcpClient.disconnect();
    console.log('✅ MCP连接已断开');
    
  } catch (error) {
    console.error('❌ MCP连接失败:', error);
  }
}

testMCPConnection();
