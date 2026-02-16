<template lang="pug">
#full-container(:class='[device.isEmbedded ? "embedded" : "standalone"]')
  main
    RouterView.root-router-view(:data-route='$route.name')

  .dev-tools(v-if='isDev')
    label.dev-tool-item(title='Toggle embedded mode preview')
      input(type='checkbox', v-model='device.forcedEmbedded')
      span Emulate Embed
</template>

<script setup lang="ts">
const device = useDeviceStore()
const isDev = import.meta.env.DEV
</script>

<style scoped lang="scss">
.dev-tools {
  position: fixed;
  top: 8px;
  right: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 6px;
  font-size: 12px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .dev-tool-item {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;

    &:hover {
      opacity: 0.9;
    }
  }
}
</style>
