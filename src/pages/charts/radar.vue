<template lang="pug">
#charts-radar
  header.toolbar(v-if='!device.isEmbedded')
    h1.title Radar
    .hint
      | URL:
      |
      code ?data=&lt;json&gt;

  #main(ref='containerEl', max-h-full, max-w-full)
    .stage
      .chart-box(:style='chartBoxStyle')
        .chart(ref='chartEl')
    .error(v-if='renderError') {{ renderError }}

  .editor(v-if='!device.isEmbedded')
    .editor-section
      h3.section-title 全局设置
      .form-row
        label 标题
        input.input(v-model='formState.title', placeholder='图表标题')
      .form-row
        label 最大值
        input.input(
          v-model.number='formState.max',
          type='number',
          placeholder='自动'
        )

    .editor-section
      h3.section-title 历史记录
      .history-list
        .history-item(v-for='(item, key) in savedCharts', :key='key')
          span.history-name
            | {{ key }} ({{ item.labels.length }} 点)
          .history-actions
            button.btn.secondary.small(@click='loadChart(key.toString())') 载入
            button.btn-icon.danger.small(
              @click='deleteChart(key.toString())',
              title='删除'
            )
              .icon-minus -
        .history-empty(v-if='Object.keys(savedCharts).length === 0') 暂无保存记录

    .editor-section
      h3.section-title 数据点 (Label - Value)
      .data-list
        .data-row(v-for='(item, index) in formState.items', :key='index')
          input.input(v-model='item.label', placeholder='名称', style='flex: 2')
          input.input(
            v-model.number='item.value',
            type='number',
            placeholder='数值',
            style='flex: 1'
          )
          button.btn-icon.danger(@click='removeRow(index)', title='删除')
            .icon-minus -
        .data-row.actions
          button.btn.secondary(@click='addRow') + 添加数据点

    .editor-actions(sticky, bottom-0, bg-white)
      button.btn.primary(@click='copyUrl') 复制 URL
      button.btn.secondary(@click='saveToStorage') 保存到本地
      .editor-error(v-if='editorError') {{ editorError }}
</template>

<script setup lang="ts">
import { RadarChart } from 'echarts/charts'
import {
  RadarComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { init, use } from 'echarts/core'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import JSON5 from 'json5'
import { z } from 'zod'

use([
  RadarChart,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
])

const device = useDeviceStore()
const savedCharts = useStorage<Record<string, RadarInput>>(
  'fishing-gears-radar-charts',
  {}
)

type RadarInput = {
  title?: string
  labels: string[]
  values: number[]
  max?: number
}

const route = useRoute()
const router = useRouter()

const containerEl = useTemplateRef('containerEl')

// 编辑器状态
const editorError = ref<string | null>(null)
const formState = reactive({
  title: '',
  max: undefined as number | undefined,
  items: [] as { label: string; value: number }[],
})

const chartEl = useTemplateRef('chartEl')

const { width: containerWidth, height: containerHeight } =
  useElementSize(containerEl)

const chartSize = computed(() => {
  const w = Number(containerWidth.value || 0)
  const h = Number(containerHeight.value || 0)
  const side = Math.min(w || 0, h || 0)
  return Math.max(0, Math.min(800, side || 0))
})

const chartBoxStyle = computed(() => {
  const size = chartSize.value
  return size > 0 ? { width: `${size}px`, height: `${size}px` } : undefined
})

const schema = z
  .object({
    title: z.string().optional(),
    labels: z.array(z.string()).default([]),
    values: z.array(z.number()).default([]),
    max: z.number().positive().optional(),
  })
  .strict()

const rawDataParam = computed(() => {
  const v = route.query.data
  return typeof v === 'string' ? v : ''
})

const defaultItems = [
  { label: '效率', value: 80 },
  { label: '质量', value: 70 },
  { label: '沟通', value: 60 },
  { label: '学习', value: 90 },
  { label: '交付', value: 75 },
]

function addRow() {
  formState.items.push({ label: '', value: 0 })
}

function removeRow(index: number) {
  formState.items.splice(index, 1)
}

watch(
  rawDataParam,
  (v) => {
    // 如果 URL 参数为空，使用默认值初始化
    if (!v) {
      if (
        !device.isEmbedded &&
        (!formState.items || formState.items.length === 0)
      ) {
        formState.title = 'Demo'
        formState.max = 100
        formState.items = [...defaultItems]
      }
      return
    }

    try {
      // 检查是否需要更新 formState，避免光标跳动
      // 将当前 formState 序列化后对比
      const currentPayload: RadarInput = {
        title: formState.title,
        max: formState.max,
        labels: formState.items.map((i) => i.label),
        values: formState.items.map((i) => i.value),
      }

      // 简单比较 JSON 字符串可能不可靠（属性顺序），但对于单向同步场景通常足够
      // 这里更严谨的做法是解析 v 后与 currentPayload 比较
      const parsed = JSON5.parse(v)
      const validated = schema.safeParse(parsed)

      if (validated.success) {
        const data = validated.data
        // 深度比较
        if (JSON.stringify(data) !== JSON.stringify(currentPayload)) {
          editorError.value = null
          formState.title = data.title || ''
          formState.max = data.max
          formState.items = data.labels.map((l, i) => ({
            label: l,
            value: data.values[i] || 0,
          }))
        }
      }
    } catch (e) {
      console.warn('URL Parse error', e)
    }
  },
  { immediate: true }
)

const parsed = computed<{ data: RadarInput | null; error: string | null }>(
  () => {
    if (!rawDataParam.value) {
      return { data: null, error: '缺少 data 参数' }
    }

    try {
      const obj = JSON5.parse(rawDataParam.value)
      const result = schema.safeParse(obj)
      if (!result.success) {
        return { data: null, error: 'data JSON 结构不正确' }
      }

      if (result.data.labels.length === 0) {
        return { data: null, error: 'labels 不能为空' }
      }
      if (result.data.labels.length !== result.data.values.length) {
        return { data: null, error: 'labels 与 values 长度不一致' }
      }

      return { data: result.data, error: null }
    } catch {
      return { data: null, error: 'data 不是合法 JSON（需要 URL encode）' }
    }
  }
)

const renderError = computed(() => parsed.value.error)

function computeMaxValue(input: RadarInput): number {
  if (
    typeof input.max === 'number' &&
    Number.isFinite(input.max) &&
    input.max > 0
  ) {
    return input.max
  }
  const maxValue = Math.max(
    ...input.values.map((v) => (Number.isFinite(v) ? v : 0)),
    0
  )
  if (maxValue <= 0) {
    return 1
  }
  return Math.ceil(maxValue / 10) * 10
}

let chart: ECharts | null = null

function ensureChart(): ECharts | null {
  if (!chartEl.value) {
    return null
  }
  if (chart) {
    return chart
  }
  chart = init(chartEl.value, undefined, { renderer: 'canvas' })
  return chart
}

function buildOption(input: RadarInput): EChartsCoreOption {
  const maxValue = computeMaxValue(input)
  const indicator = input.labels.map((name) => ({ name, max: maxValue }))

  return {
    title: input.title
      ? {
          text: input.title,
          top: '8px',
          left: '8px',
        }
      : undefined,
    tooltip: {},
    radar: {
      indicator,
      center: ['50%', '50%'],
      radius: '65%',
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: input.values,
            name: input.title ?? '',
          },
        ],
        areaStyle: {
          opacity: 0.6,
        },
      },
    ],
  }
}

function render() {
  const size = chartSize.value
  const input = parsed.value.data
  if (!input || size <= 0) {
    return
  }

  const instance = ensureChart()
  if (!instance) {
    return
  }

  instance.setOption(buildOption(input), { notMerge: true })
  instance.resize({ width: size, height: size })
}

watch([chartSize, () => parsed.value.data], () => render(), { immediate: true })

onBeforeUnmount(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
})

function saveToStorage() {
  editorError.value = null
  const title = (formState.title || '').trim()
  if (!title) {
    editorError.value = '请填写标题以便保存'
    return
  }

  const payload: RadarInput = {
    title: title,
    max: formState.max,
    labels: formState.items.map((i) => i.label),
    values: formState.items.map((i) => i.value),
  }

  const result = schema.safeParse(payload)
  if (!result.success) {
    editorError.value = result.error.message
    return
  }

  savedCharts.value[title] = result.data
  alert('保存成功')
}

function loadChart(key: string) {
  const chart = savedCharts.value[key]
  if (chart) {
    // 同步到表单状态，watch 会自动触发 URL 更新
    formState.title = chart.title || ''
    formState.max = chart.max
    formState.items = chart.labels.map((l, i) => ({
      label: l,
      value: chart.values[i] || 0,
    }))
  }
}

function deleteChart(key: string) {
  if (confirm(`确定删除 "${key}" 吗？`)) {
    delete savedCharts.value[key]
  }
}

async function copyUrl() {
  await navigator.clipboard.writeText(window.location.href)
  alert('URL 已复制到剪贴板')
}

// 防抖更新 URL，实现实时预览
const updateUrl = useDebounceFn(async () => {
  editorError.value = null

  if (formState.items.length === 0) {
    editorError.value = '请至少添加一行数据'
    return
  }

  const payload: RadarInput = {
    title: formState.title,
    max: formState.max,
    labels: formState.items.map((i) => i.label),
    values: formState.items.map((i) => i.value),
  }

  const result = schema.safeParse(payload)
  if (!result.success) {
    editorError.value = result.error.message
    return
  }

  const newData = JSON.stringify(result.data)
  // 如果内容没变，不更新路由，避免重复
  if (newData === rawDataParam.value) {
    return
  }

  await router.replace({
    query: { ...route.query, data: newData },
  })
}, 300)

watch(
  formState,
  () => {
    updateUrl()
  },
  { deep: true }
)
</script>

<style scoped lang="scss">
#charts-radar {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  padding: 12px 16px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #eee;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.hint {
  font-size: 12px;
  color: #666;

  code {
    background: #f5f5f5;
    padding: 2px 4px;
    border-radius: 4px;
  }
}

#main {
  flex: 1 1 auto;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-box {
  display: grid;
  place-items: center;
}

.chart {
  width: 100%;
  height: 100%;
}

.error {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  padding: 8px 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  font-size: 12px;
}

.editor {
  border-top: 1px solid #e5e7eb;
  padding: 16px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    min-width: 60px;
    font-size: 13px;
    color: #4b5563;
  }
}

.data-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-row {
  display: flex;
  gap: 8px;
  align-items: center;

  &.actions {
    justify-content: flex-start;
  }
}

.input {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  background: white;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #f9fafb;
  border-radius: 4px;

  &:hover {
    background: #f3f4f6;
  }
}

.history-name {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-empty {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  padding: 8px;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  padding-bottom: 8px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &.small {
    padding: 3px 8px;
    font-size: 11px;
    border-radius: 4px;
    line-height: 1.4;
  }

  &.primary {
    background: #3b82f6;
    color: white;
    border: 1px solid #2563eb;

    &:hover {
      background: #2563eb;
    }
  }

  &.secondary {
    background: white;
    border: 1px solid #d1d5db;
    color: #374151;

    &:hover {
      background: #f3f4f6;
    }
  }
}

.btn-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;

  &.small {
    width: 22px;
    height: 22px;
  }

  &.danger {
    color: #ef4444;

    &:hover {
      background: #fee2e2;
    }

    .icon-minus {
      font-size: 16px;
      font-weight: bold;
    }
  }
}

.editor-error {
  font-size: 12px;
  color: #ef4444;
}
</style>
