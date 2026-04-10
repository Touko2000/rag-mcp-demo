<template>
  <div class="flex flex-col min-h-screen">
    <!-- 头部 -->
    <AppHeader />

    <!-- 主体内容 -->
    <div class="flex flex-1">
      <!-- 左侧边栏 -->
      <AppSidebar />

      <!-- 中间内容区域 -->
      <main class="flex-1 p-6 overflow-y-auto">
        <slot></slot>
      </main>

      <!-- 右侧聊天区域 -->
      <aside class="w-80 bg-white border-l border-gray-200 overflow-y-auto">
        <h2 class="text-lg font-semibold mb-4 p-4 border-b border-gray-200">智能问答</h2>
        <ChatInterface />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import ChatInterface from '../rag/ChatInterface.vue'
</script>

<script lang="ts">
export default {
  name: 'AppLayout',
  components: {
    AppHeader,
    AppSidebar,
    ChatInterface,
  },
}
</script>

<style scoped>
.layout {
  @apply flex flex-col min-h-screen;
}

.main-content {
  @apply flex-1 p-6 overflow-y-auto;
}

.chat-sidebar {
  @apply w-80 bg-white border-l border-border p-4 overflow-y-auto;
}
</style>
