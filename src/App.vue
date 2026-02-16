<template lang="pug">
#full-container(:class='[device.isEmbedded ? "embedded" : "standalone"]')
  main
    RouterView.root-router-view(:data-route='$route.name')
</template>

<script setup lang="ts">
const device = useDeviceStore()
</script>

<style scoped lang="scss"></style>
