<script setup lang="ts">
import { computed } from 'vue';
import { type ConfiguratorLogic, type Configuration } from '../logic/configurator';

const props = defineProps<{
    logic: ConfiguratorLogic;
    currentModelId: string;
    configOptions: Record<string, string | number | boolean>;
}>();

const emit = defineEmits(['optionChange', 'back']);

const accessories = computed(() => {
    return props.logic.getOptionsByGroup('accessories');
});

const isSelected = (optionId: string, value: string | number | boolean) => {
  return props.configOptions[optionId] === value;
};

const isAvailable = (optionId: string, value: string | number | boolean) => {
  const tempConfig: Configuration = {
    modelId: props.currentModelId,
    options: { ...props.configOptions }
  };
  return props.logic.isOptionAvailable(tempConfig, optionId, value);
};

</script>

<template>
    <div class="accessories-screen fade-in">
        <h2 class="category-title">Step 2: Add Accessories</h2>
        <p class="step-desc">Enhance your mixing solution with optional upgrades and maintenance kits. Only compatible accessories are shown.</p>

        <div class="accessories-grid">
            <template v-for="opt in accessories" :key="opt.id">
                <div 
                    v-if="isAvailable(opt.id, true) || isAvailable(opt.id, false)"
                    class="glass-card option-card accessory-card"
                    :class="{ 
                        selected: isSelected(opt.id, true),
                        disabled: !isAvailable(opt.id, true) && !isSelected(opt.id, true)
                    }"
                    @click="isAvailable(opt.id, !configOptions[opt.id]) && emit('optionChange', { optionId: opt.id, value: !configOptions[opt.id] })"
                >
                    <div class="accessory-info">
                        <div class="option-name">{{ opt.display_name }}</div>
                        <div class="option-desc" v-if="opt.notes">{{ opt.notes }}</div>
                    </div>
                    <div class="custom-checkbox" :class="{ checked: isSelected(opt.id, true) }"></div>
                </div>
            </template>
        </div>

        <div class="step-nav-footer">
            <button class="nav-btn prev" @click="emit('back')">← Back to Machine Spec</button>
            <div style="flex-grow: 1;"></div>
            <button class="nav-btn next premium-btn" @click="() => {}">
                Complete Configuration
                <span class="btn-arrow">✓</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.accessories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
}

.accessory-card {
    flex-direction: row !important;
    justify-content: space-between !important;
    text-align: left !important;
    padding: 1.5rem !important;
    align-items: center !important;
}

.accessory-info {
    flex: 1;
}

.custom-checkbox {
    width: 22px;
    height: 22px;
    border: 2px solid var(--border-glass);
    border-radius: 4px;
    margin-left: 1.5rem;
    flex-shrink: 0;
}

.custom-checkbox.checked {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    box-shadow: 0 0 10px var(--accent-primary);
}

.step-nav-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border-glass);
}
</style>
