<template lang="pug">
#home-route
  h1 Home
  pre {{ data }}
</template>

<script setup lang="ts">
const { data } = useFetch('/api')
</script>

<style scoped lang="scss"></style>
