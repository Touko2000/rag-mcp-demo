<template>
  <header class="bg-white border-b border-gray-200">
    <div class="container mx-auto px-4 py-4 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <h1 class="text-2xl font-bold text-gray-900">RAG MCP Demo</h1>
        <span class="text-sm text-gray-600"> 经济研究文档智能检索系统 </span>
      </div>

      <div class="flex items-center space-x-6">
        <!-- MCP 连接状态指示灯 -->
        <div class="flex items-center space-x-2">
          <span
            class="w-3 h-3 rounded-full"
            :class="{
              'bg-green-500': isConnected,
              'bg-red-500': !isConnected,
            }"
          ></span>
          <span
            class="text-sm"
            :class="{
              'text-green-600': isConnected,
              'text-gray-600': !isConnected,
            }"
          >
            {{ isConnected ? 'MCP 已连接' : 'MCP 未连接' }}
          </span>
        </div>

        <button
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          @click="connectToMCP"
        >
          配置
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMCPStore } from '../../stores/mcp-store'

const mcpStore = useMCPStore()
const isConnected = computed(() => mcpStore.isConnected)

const connectToMCP = async () => {
  try {
    // 尝试使用 SSE 传输（通过 Vite 代理）
    await mcpStore.connectToServer({
      type: 'sse',
      url: '/mcp/mcp-sse',
    })
    console.log('MCP 连接成功')
  } catch (error) {
    console.error('MCP 连接失败 (SSE):', error)
    // 尝试使用 stdio 传输作为备选
    try {
      console.log('尝试使用 stdio 传输...')
      await mcpStore.connectToServer({
        type: 'stdio',
        path: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/touko/Desktop'],
      })
      console.log('MCP 连接成功 (stdio)')
    } catch (stdioError) {
      console.error('MCP 连接失败 (stdio):', stdioError)
    }
  }
}
</script>

<script lang="ts">
export default {
  name: 'AppHeader',
}
</script>

<style scoped>
.header {
  @apply bg-white border-b border-border;
}
</style>
