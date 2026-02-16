export const useDeviceStore = defineStore('device', () => {
  const { width, height } = useWindowSize()
  const isEmbedded = computed(() => {
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
  }
})
