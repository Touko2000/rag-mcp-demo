import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse';

export interface DocumentInfo {
  id: string;
  filename: string;
  path: string;
  size: number;
  lastModified: string;
  type: 'pdf' | 'markdown';
  content?: string; // 可选的内容字段，用于存储文件内容
}

export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  score: number;
  metadata: {
    filename: string;
    path: string;
    page?: number;
  };
}

export interface ServerConfig {
  type: 'stdio' | 'sse';
  path?: string;
  url?: string;
  args?: string[];
}

export class MCPClientService {
  private client: Client | null = null;
  private transport: StdioClientTransport | SSEClientTransport | null = null;
  private isConnected: boolean = false;

  async connect(serverConfig: ServerConfig): Promise<void> {
    try {
      if (this.isConnected) {
        await this.disconnect();
      }

      if (serverConfig.type === 'stdio') {
        if (!serverConfig.path) {
          throw new Error('Path is required for stdio transport');
        }
        this.transport = new StdioClientTransport({
          command: serverConfig.path,
          args: serverConfig.args || []
        });
      } else if (serverConfig.type === 'sse') {
        if (!serverConfig.url) {
          throw new Error('URL is required for SSE transport');
        }
        let url;
        try {
          url = new URL(serverConfig.url);
        } catch {
          url = new URL(serverConfig.url, window.location.origin);
        }
        this.transport = new SSEClientTransport(url, {
          requestInit: {
            headers: {
              'Content-Type': 'application/json',
              'Accept': '*/*'
            },
            credentials: 'omit',
            mode: 'cors',
            cache: 'no-cache',
            redirect: 'follow'
          }
        });
      } else {
        throw new Error(`Unsupported transport type: ${serverConfig.type}`);
      }

      this.client = new Client({
        name: 'rag-mcp-demo',
        version: '1.0.0'
      });

      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log('MCP Server connected successfully');
    } catch (error) {
      console.error('Failed to connect to MCP Server:', error);
      this.isConnected = false;
      await this.cleanup();
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
    } catch (error) {
      console.error('Error closing transport:', error);
    }
    this.client = null;
    this.isConnected = false;
  }

  get connected(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.cleanup();
        console.log('MCP Server disconnected successfully');
      } catch (error) {
        console.error('Failed to disconnect from MCP Server:', error);
        throw error;
      }
    }
  }

  async scanDocuments(folderPath: string = '.'): Promise<DocumentInfo[]> {
    // 即使 MCP 连接失败，也返回本地文档列表
    try {
      // 调用 MCP 代理的 get-file-info 端点获取实际的文件信息
      // 扫描指定目录下的所有文件
      const response = await fetch('/mcp/scan-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folderPath })
      });

      if (response.ok) {
        const data = await response.json();
        const documents = data.documents || [];

        console.log('Scanned documents:', documents);
        return documents;
      } else {
        // 失败时返回空列表
        console.error('Failed to scan documents:', response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Failed to scan documents:', error);
      return [];
    }
  }

  /**
   * 读取文件内容
   * @param filePath 文件路径
   * @returns 文件内容信息
   */
  async readFile(filePath: string): Promise<any> {
    try {
      const response = await fetch('/mcp/read-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: filePath })
      });

      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }

  async searchDocuments(query: string, limit: number = 5, filePaths?: string[]): Promise<SearchResult[]> {
    try {
      // 如果没有提供文件路径，先扫描文档获取
      const paths = filePaths || (await this.scanDocuments()).map(doc => doc.path);

      // 调用 MCP 代理的检索端点
      const response = await fetch('/mcp/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, paths })
      });

      if (!response.ok) {
        throw new Error(`Failed to search documents: ${response.statusText}`);
      }

      const data = await response.json();
      const results = data.results || [];

      // 转换为 SearchResult 格式
      const searchResults = results.map((result: any, index: number) => ({
        id: 'result-' + index,
        documentId: result.path,
        content: result.matches[0]?.content || `Document: ${result.filename}`,
        score: result.score,
        metadata: {
          filename: result.filename,
          path: result.path
        }
      }));

      return searchResults.slice(0, limit);
    } catch (error) {
      console.error('Failed to search documents:', error);
      return [];
    }
  }

  async watchFolder(folderPath: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP Server not connected');
    }

    try {
      await this.client.callTool({
        name: 'watch_folder',
        arguments: {
          folder_path: folderPath
        }
      });
    } catch (error) {
      console.error('Failed to watch folder:', error);
    }
  }

  async callTool<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP Server not connected');
    }

    try {
      const response = await this.client.callTool({
        name: toolName,
        arguments: args
      });

      return response.toolResult as T;
    } catch (error) {
      console.error('Failed to call tool ' + toolName + ':', error);
      throw error;
    }
  }
}

export const mcpClientService = new MCPClientService();
