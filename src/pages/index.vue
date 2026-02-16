<template lang="pug">
#home-route.max-w-3xl.mx-auto.px-4.py-8.prose
  header.flex.gap-4.items-center.justify-between
    .logo
      img(src='/logo@sm.png', alt='Fishing Gears Logo', width='80')
    .flex-1
      h1.text-3xl.font-bold.m0 Fishing Gears
      p.text-gray-400.m0.mt-2 A collection of embeddable widgets driven by URL parameters.

  section.mb-8(v-for='group in groups', :key='group.title')
    h2 {{ group.title }}
    ul.grid.grid-cols-1.gap-4.list-none.pl-0(class='sm:grid-cols-2')
      li(v-for='item in group.items', :key='item.path')
        RouterLink.block.p-4.border.rounded-lg.hover_bg-gray-50.transition(
          :to='item.path'
        )
          .font-medium {{ item.title }}
          .text-sm.text-gray-500.mt-1 {{ item.desc }}
</template>

<script setup lang="ts">
type Group = {
  title: string
  items: {
    path: string
    title: string
    desc: string
  }[]
}

const groups: Group[] = [
  {
    title: 'Charts',
    items: [
      {
        path: '/charts/radar',
        title: 'Radar Chart',
        desc: 'Basic radar chart for displaying multivariate data.',
      },
    ],
  },
]
</script>

<style scoped lang="scss"></style>
