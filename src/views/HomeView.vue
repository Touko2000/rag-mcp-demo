<template>
  <div class="space-y-6">
    <div class="bg-gray-50 rounded-lg p-6 shadow-sm">
      <h2 class="text-2xl font-bold mb-4">RAG MCP 演示应用</h2>
      <p class="text-gray-600">
        这是一个基于 Vue 3 的 RAG（检索增强生成）演示应用，通过 MCP（Model Context
        Protocol）连接本地文件夹， 实现对经济研究文档（PDF/Markdown）的语义检索和问答。
      </p>
    </div>

    <ResultDisplay />

    <div class="grid grid-cols-3 gap-6">
      <div class="bg-gray-50 rounded-lg p-6 shadow-sm">
        <h3 class="text-lg font-semibold mb-2">📁 文档管理</h3>
        <p class="text-gray-600 text-sm">扫描本地文件夹，管理 PDF 和 Markdown 文档</p>
      </div>

      <div class="bg-gray-50 rounded-lg p-6 shadow-sm">
        <h3 class="text-lg font-semibold mb-2">🔍 语义检索</h3>
        <p class="text-gray-600 text-sm">基于自然语言查询，检索相关文档内容</p>
      </div>

      <div class="bg-gray-50 rounded-lg p-6 shadow-sm">
        <h3 class="text-lg font-semibold mb-2">💬 智能问答</h3>
        <p class="text-gray-600 text-sm">基于检索结果，生成准确的问答响应</p>
      </div>
    </div>

    <div class="bg-gray-50 rounded-lg p-6 shadow-sm">
      <h3 class="text-lg font-semibold mb-4">使用指南</h3>
      <ol class="list-decimal list-inside space-y-2 text-gray-600">
        <li>在左侧边栏选择包含经济研究文档的文件夹</li>
        <li>等待系统扫描并索引文档</li>
        <li>在右侧聊天区域输入您的问题</li>
        <li>系统将基于文档内容生成回答</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import ResultDisplay from '../components/rag/ResultDisplay.vue'
</script>
