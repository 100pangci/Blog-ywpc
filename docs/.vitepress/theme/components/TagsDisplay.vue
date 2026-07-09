<template>
  <div class="tags-display">
    <span v-for="tag in tags" :key="tag" class="tags-display__tag">{{ tag }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ tags: string[] }>()
</script>

<style scoped>
.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.tags-display__tag {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>