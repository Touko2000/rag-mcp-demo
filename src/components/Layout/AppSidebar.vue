<template>
  <aside class="w-64 bg-white border-r border-gray-200 h-full">
    <div class="p-4">
      <h2 class="text-lg font-semibold mb-4">文档资源</h2>

      <!-- 文件夹选择区域 -->
      <div class="mb-4">
        <button
          class="w-full px-4 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          @click="openFolderSelector"
          :disabled="!isConnected"
        >
          <span class="w-4 h-4">📁</span>
          <span>选择文件夹</span>
        </button>
        <!-- 隐藏的文件夹选择器 -->
        <input
          ref="folderInput"
          type="file"
          webkitdirectory
          directory
          multiple
          class="hidden"
          @change="handleFolderSelect"
        />
      </div>

      <!-- 文档列表区域 -->
      <div class="space-y-2">
        <div v-if="!isConnected" class="text-center py-8 text-gray-600">
          <p>未连接到 MCP Server</p>
          <p class="text-xs mt-2">请先点击头部的"配置"按钮连接</p>
        </div>
        <div v-else-if="documents.length === 0" class="text-center py-8 text-gray-600">
          <p>暂无文档</p>
          <p class="text-xs mt-2">请选择文件夹以扫描文档</p>
        </div>

        <div v-else class="max-h-[calc(100vh-200px)] overflow-y-auto">
          <div
            v-for="doc in documents"
            :key="doc.id"
            class="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span class="w-8 h-8 flex items-center justify-center mr-3">
              {{ doc.type === 'pdf' ? '📄' : '📑' }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ doc.filename }}</p>
              <p class="text-xs text-gray-600">
                {{ formatFileSize(doc.size) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMCPStore } from '../../stores/mcp-store'

const mcpStore = useMCPStore()
const documents = computed(() => mcpStore.documents || [])
const isConnected = computed(() => mcpStore.isConnected)
const folderInput = ref<HTMLInputElement | null>(null)

// 打开文件夹选择器
const openFolderSelector = () => {
  console.log('打开文件夹选择器')
  if (!isConnected.value) {
    console.error('MCP Server not connected')
    return
  }

  if (folderInput.value) {
    folderInput.value.click()
  }
}

// 处理文件夹选择
const handleFolderSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files

  if (!files || files.length === 0) {
    console.error('No folder selected')
    return
  }

  console.log('文件夹选择成功，开始扫描文档...')

  try {
    // 提取文件夹路径
    const firstFile = files[0]
    console.log('First file:', firstFile)
    console.log('File path:', firstFile.webkitRelativePath)

    // 从 webkitRelativePath 中提取文件夹路径
    const webkitRelativePath = firstFile.webkitRelativePath
    const folderPath = webkitRelativePath.split('/')[0] || '.'
    console.log('Selected folder:', folderPath)

    // 将 FileList 转换为数组
    const filesArray = Array.from(files)

    // 直接处理文件，不依赖MCP扫描
    // 构建文档列表
    const documentsList = filesArray.map((file) => {
      // 从webkitRelativePath中提取完整路径
      const fullPath = file.webkitRelativePath
      // 提取文件名
      const filename = file.name
      // 提取文件类型
      let type: 'pdf' | 'markdown' = 'markdown'
      if (file.type === 'application/pdf') {
        type = 'pdf'
      } else if (filename.endsWith('.md')) {
        type = 'markdown'
      }

      return {
        id: fullPath,
        filename: filename,
        path: filename,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString(),
        type: type,
        content: '', // 预留字段，用于存储文件内容
      }
    })

    // 读取文件内容
    const readFilePromises = documentsList.map((doc) => {
      return new Promise((resolve) => {
        const file = filesArray.find((f) => f.name === doc.filename)
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            doc.content = e.target?.result as string
            resolve(doc)
          }
          reader.onerror = () => {
            resolve(doc)
          }
          reader.readAsText(file)
        } else {
          resolve(doc)
        }
      })
    })

    // 等待所有文件读取完成
    await Promise.all(readFilePromises)

    // 检查文档内容是否读取成功
    console.log('文档内容读取结果:')
    documentsList.forEach((doc) => {
      console.log(`${doc.filename}: ${doc.content ? '有内容' : '无内容'}`)
      if (doc.content) {
        console.log(`内容长度: ${doc.content.length}`)
      }
    })

    // 直接更新store
    mcpStore.documents = documentsList
    console.log('文档处理成功')
    console.log('文档数量:', documentsList.length)
  } catch (error) {
    console.error('文档扫描失败:', error)
  } finally {
    // 重置文件输入，以便可以再次选择同一个文件夹
    if (folderInput.value) {
      folderInput.value.value = ''
    }
  }
}

// 扫描文档
const scanDocuments = async (folderPath: string = '.') => {
  console.log('开始扫描文档...')
  try {
    await mcpStore.scanDocuments(folderPath)
    console.log('文档扫描成功')
    console.log('文档数量:', documents.value.length)
  } catch (error) {
    console.error('文档扫描失败:', error)
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<script lang="ts">
export default {
  name: 'AppSidebar',
}
</script>

<style scoped>
.sidebar {
  @apply w-64 bg-white border-r border-border h-full;
}
</style>
