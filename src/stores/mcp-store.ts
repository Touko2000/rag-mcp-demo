import { defineStore } from 'pinia';
import { mcpClientService } from '../services/mcp-client';
import type { DocumentInfo, SearchResult, ServerConfig } from '../services/mcp-client';

export const useMCPStore = defineStore('mcp', {
  state: () => ({
    // 连接状态
    isConnected: false,
    connectionError: null as string | null,

    // 服务器配置
    serverConfig: null as ServerConfig | null,

    // 文档相关
    currentFolder: null as string | null,
    documents: [] as DocumentInfo[],
    isScanning: false,
    scanError: null as string | null,

    // 检索相关
    searchResults: [] as SearchResult[],
    isSearching: false,
    searchError: null as string | null,

    // 文件监听相关
    isWatching: false,
    watchedFolder: null as string | null,
    watchError: null as string | null
  }),

  getters: {
    // 文档数量
    documentCount: (state) => state.documents.length,

    // 检索结果数量
    searchResultCount: (state) => state.searchResults.length,

    // 是否有连接错误
    hasConnectionError: (state) => !!state.connectionError,

    // 是否有扫描错误
    hasScanError: (state) => !!state.scanError,

    // 是否有搜索错误
    hasSearchError: (state) => !!state.searchError
  },

  actions: {
    /**
     * 连接到 MCP Server
     */
    async connectToServer(serverConfig: ServerConfig) {
      this.isConnected = false;
      this.connectionError = null;

      try {
        await mcpClientService.connect(serverConfig);
        this.isConnected = true;
        this.serverConfig = serverConfig;
        this.connectionError = null;
      } catch (error) {
        this.isConnected = false;
        this.connectionError = error instanceof Error ? error.message : 'Failed to connect to MCP Server';
        console.error('Connection error:', error);
      }
    },

    /**
     * 断开连接
     */
    async disconnectFromServer() {
      try {
        await mcpClientService.disconnect();
        this.isConnected = false;
        this.serverConfig = null;
        this.connectionError = null;
      } catch (error) {
        console.error('Disconnection error:', error);
      }
    },

    /**
     * 选择文件夹并扫描文档
     */
    async selectFolder(folderPath: string) {
      this.currentFolder = folderPath;
      this.documents = [];
      this.isScanning = true;
      this.scanError = null;

      try {
        this.documents = await mcpClientService.scanDocuments(folderPath);
        this.scanError = null;
      } catch (error) {
        this.scanError = error instanceof Error ? error.message : 'Failed to scan documents';
        console.error('Scan error:', error);
      } finally {
        this.isScanning = false;
      }
    },

    /**
     * 扫描文档
     */
    async scanDocuments(path: string = '.') {
      this.documents = [];
      this.isScanning = true;
      this.scanError = null;

      try {
        // 调用后端的 list_directory 工具或者 scan_documents 工具
        console.log('Calling mcpClientService.scanDocuments with path:', path);
        const result = await mcpClientService.scanDocuments(path);
        console.log('mcpClientService.scanDocuments returned:', result);
        console.log('mcpClientService.scanDocuments returned document count:', result.length);
        this.documents = result;
        console.log('this.documents after assignment:', this.documents);
        console.log('this.documents.length after assignment:', this.documents.length);
        this.scanError = null;
      } catch (error) {
        this.scanError = error instanceof Error ? error.message : 'Failed to scan documents';
        console.error('Scan error:', error);
      } finally {
        this.isScanning = false;
      }
    },

    /**
     * 执行 RAG 检索
     */
    async searchQuery(query: string, limit: number = 5) {
      this.searchResults = [];
      this.isSearching = true;
      this.searchError = null;

      try {
        console.log('开始搜索:', query);
        console.log('文档数量:', this.documents.length);

        // 直接在前端进行搜索，使用已经读取的文件内容
        const searchResults = [];

        // 遍历文档列表
        for (const doc of this.documents) {
          try {
            console.log(`搜索文档: ${doc.filename}`);
            // 检查文档是否有内容
            if (!doc.content) {
              console.warn(`Document ${doc.filename} has no content`);
              continue;
            }

            console.log(`文档内容长度: ${doc.content.length}`);
            // 简单的关键词匹配
            if (doc.content.toLowerCase().includes(query.toLowerCase())) {
              console.log(`找到匹配: ${doc.filename}`);
              // 计算简单的相关度分数
              const matchCount = doc.content.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || [];
              const score = matchCount.length > 0 ? matchCount.length / doc.content.length : 0;
              console.log(`文档 ${doc.filename} 匹配次数: ${matchCount.length}, 内容长度: ${doc.content.length}, 相关度: ${score}`);

              // 提取匹配的文本片段
              const matches = [];
              const lines = doc.content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                  matches.push({
                    line: i + 1,
                    content: lines[i]
                  });
                }
              }

              if (matches.length > 0) {
                searchResults.push({
                  id: 'result-' + searchResults.length,
                  documentId: doc.id,
                  content: matches[0].content,
                  score: score,
                  metadata: {
                    filename: doc.filename,
                    path: doc.path
                  }
                });
              }
            }
          } catch (error) {
            console.error(`Failed to search document ${doc.filename}:`, error);
            continue;
          }
        }

        console.log('搜索结果数量:', searchResults.length);
        // 按相关度分数排序
        searchResults.sort((a, b) => b.score - a.score);

        this.searchResults = searchResults.slice(0, limit);
        console.log('最终搜索结果数量:', this.searchResults.length);
        this.searchError = null;
      } catch (error) {
        this.searchError = error instanceof Error ? error.message : 'Failed to search documents';
        console.error('Search error:', error);
      } finally {
        this.isSearching = false;
      }
    },

    /**
     * 监听文件夹
     */
    async startWatching(folderPath: string) {
      this.isWatching = false;
      this.watchError = null;

      try {
        await mcpClientService.watchFolder(folderPath);
        this.isWatching = true;
        this.watchedFolder = folderPath;
        this.watchError = null;
      } catch (error) {
        this.watchError = error instanceof Error ? error.message : 'Failed to start watching folder';
        console.error('Watch error:', error);
      }
    },

    /**
     * 清除搜索结果
     */
    clearSearchResults() {
      this.searchResults = [];
      this.searchError = null;
    },

    /**
     * 清除文档列表
     */
    clearDocuments() {
      this.documents = [];
      this.currentFolder = null;
      this.scanError = null;
    }
  }
});
