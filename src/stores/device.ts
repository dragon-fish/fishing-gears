export const useDeviceStore = defineStore('device', () => {
  const { width, height } = useWindowSize()

  const forcedEmbedded = ref(false)

  const isEmbedded = computed(() => {
    if (forcedEmbedded.value) {
      return true
    }
    // SSR
    if (typeof window === 'undefined') {
      return false
    }
    // Check if embedded in an iframe
    return window.self !== window.top
  })

  return {
    width,
    height,
    isEmbedded,
    forcedEmbedded,
  }
})
