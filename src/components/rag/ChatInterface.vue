<template>
  <div class="chat-interface">
    <!-- 聊天消息列表 -->
    <div class="chat-messages space-y-4 p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
      <!-- 系统消息 -->
      <div class="message system-message">
        <div class="message-content bg-gray-50 rounded-2xl rounded-tl-none p-4">
          <p class="text-gray-800">你好！我是 RAG 智能助手，有什么经济研究相关的问题可以问我。</p>
        </div>
      </div>

      <!-- 聊天记录 -->
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.type === 'user' ? 'user-message' : 'system-message']"
      >
        <div
          :class="[
            'message-content',
            message.type === 'user'
              ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none'
              : 'bg-gray-50 rounded-2xl rounded-tl-none',
          ]"
          class="p-4"
        >
          <p>{{ message.content }}</p>
          <!-- 引用标签 -->
          <div
            v-if="message.references && message.references.length > 0"
            class="message-references mt-3 space-y-2"
          >
            <div
              v-for="(ref, index) in message.references"
              :key="index"
              class="reference-tag bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full inline-flex items-center space-x-1"
            >
              <span>{{ ref.filename.endsWith('.pdf') ? '📄' : '📑' }}</span>
              <span>{{ ref.filename }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索输入区域 -->
    <div class="search-input-area p-4 border-t border-gray-200">
      <SearchInput @search="handleSearch" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SearchInput from './SearchInput.vue'
import { useMCPStore } from '../../stores/mcp-store'

const mcpStore = useMCPStore()
const messages = ref([])

const handleSearch = async (query) => {
  // 添加用户消息
  messages.value.push({
    id: Date.now() + '-user',
    type: 'user',
    content: query,
  })

  // 使用真实的搜索结果
  try {
    await mcpStore.searchQuery(query)

    const references = mcpStore.searchResults.map((result) => ({
      filename: result.metadata.filename,
    }))

    messages.value.push({
      id: Date.now() + '-system',
      type: 'system',
      content: `我找到了 ${mcpStore.searchResults.length} 个相关文档`,
      references: references,
    })
  } catch (error) {
    console.error('搜索失败:', error)
    messages.value.push({
      id: Date.now() + '-system',
      type: 'system',
      content: '搜索失败，请重试',
    })
  }
}
</script>

<script lang="ts">
export default {
  name: 'ChatInterface',
}
</script>

<style scoped>
.chat-interface {
  @apply flex flex-col h-full;
}

.chat-messages {
  @apply flex-1;
}

.message {
  @apply flex;
}

.user-message {
  @apply justify-end;
}

.system-message {
  @apply justify-start;
}

.message-content {
  @apply max-w-[80%] shadow-sm;
}

.message-references {
  @apply mt-3 space-y-2;
}

.reference-tag {
  @apply bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full inline-flex items-center space-x-1;
}
</style>
