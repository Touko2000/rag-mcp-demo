<template>
  <div class="result-display">
    <h3 class="text-lg font-semibold mb-4">检索结果</h3>

    <!-- 结果列表 -->
    <div class="result-list space-y-4">
      <div
        v-for="result in searchResults"
        :key="result.id"
        class="result-item bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
      >
        <h4 class="text-base font-semibold text-gray-900 mb-2">{{ result.metadata.filename }}</h4>
        <p class="text-sm text-gray-600 mb-3">{{ result.content }}</p>

        <!-- 引用标签 -->
        <div class="result-meta flex items-center justify-between">
          <div
            class="reference-tag bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full inline-flex items-center space-x-1"
          >
            <span>{{ result.metadata?.filename.endsWith('.pdf') ? '📄' : '📑' }}</span>
            <span>{{ result.metadata?.filename }}</span>
          </div>
          <span class="text-xs text-gray-500">{{ result.score.toFixed(2) }} 相关度</span>
        </div>
      </div>

      <!-- 无结果提示 -->
      <div v-if="searchResults.length === 0" class="no-results text-center py-8 text-gray-500">
        <p>暂无检索结果</p>
        <p class="text-sm mt-2">请尝试使用其他关键词</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMCPStore } from '../../stores/mcp-store'

const mcpStore = useMCPStore()

// 从 store 获取搜索结果
const searchResults = computed(() => {
  console.log('ResultDisplay searchResults:', mcpStore.searchResults);
  return mcpStore.searchResults || [];
})
</script>

<script lang="ts">
export default {
  name: 'ResultDisplay',
}
</script>

<style scoped>
.result-display {
  @apply h-full;
}

.result-list {
  @apply space-y-4;
}

.result-item {
  @apply bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow;
}

.reference-tag {
  @apply bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full inline-flex items-center space-x-1;
}
</style>
