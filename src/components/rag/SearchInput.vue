<template>
  <div class="search-input-container">
    <div class="relative">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="输入您的问题..."
        class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        @keyup.enter="handleSearch"
      />
      <button
        class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
        @click="handleSearch"
      >
        搜索
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMCPStore } from '../../stores/mcp-store'

const searchQuery = ref('')
const mcpStore = useMCPStore()

const emit = defineEmits(['search'])

const handleSearch = async () => {
  if (searchQuery.value.trim()) {
    try {
      emit('search', searchQuery.value)
      await mcpStore.searchQuery(searchQuery.value)
      console.log('搜索成功:', searchQuery.value)
      // 清空搜索输入
      searchQuery.value = ''
    } catch (error) {
      console.error('搜索失败:', error)
    }
  }
}
</script>

<script lang="ts">
export default {
  name: 'SearchInput'
}
</script>

<style scoped>
.search-input-container {
  @apply w-full;
}

input {
  @apply w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors;
}

button {
  @apply absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors;
}
</style>