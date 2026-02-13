<script setup lang="ts">
import { computed } from 'vue';
import { type ConfiguratorLogic, type Configuration } from '../logic/configurator';

const props = defineProps<{
    logic: ConfiguratorLogic;
    currentModelId: string;
    configOptions: Record<string, string | number | boolean>;
}>();

const emit = defineEmits(['optionChange', 'back']);

const groupedAccessories = computed(() => {
    const all = props.logic.getAccessories();
    const groups: Record<string, any[]> = {};
    
    all.forEach(opt => {
        let visible = false;
        if (opt.type === 'boolean') {
            visible = isAvailable(opt.id, true) || isAvailable(opt.id, false);
        } else {
            // For enum/index, we show it if the model supports it at all,
            // allowing it to be greyed out rather than hidden.
            const allowed = props.logic.getAllowedValues(props.currentModelId, opt.id);
            visible = allowed.length > 0;
        }

        if (visible) {
            const groupName = opt.group.charAt(0).toUpperCase() + opt.group.slice(1);
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(opt);
        }
    });
    
    return groups;
});

const isEnumAvailable = (optionId: string) => {
    // Duration is specifically non-editable when Standard is selected
    if (optionId === 'fap_warranty_years' && props.configOptions['fap_standard'] === true) return false;
    
    const allowed = props.logic.getAllowedValues(props.currentModelId, optionId);
    return allowed.some(val => isAvailable(optionId, val));
};

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

const handleEnumChange = (optionId: string, event: Event) => {
    const target = event.target as HTMLSelectElement;
    if (target) {
        emit('optionChange', { optionId, value: target.value });
    }
};

</script>

<template>
    <div class="accessories-screen fade-in">
        <h2 class="category-title">Step 2: Additional Options and Accessories</h2>
        <p class="step-desc">Enhance your mixing solution with optional upgrades and maintenance kits. Only compatible accessories are shown.</p>

        <div class="accessory-groups">
            <div v-for="(items, groupName) in groupedAccessories" :key="groupName" class="accessory-section">
                <h3 class="section-title">{{ groupName }}</h3>
                <div class="accessories-grid">
                <div v-for="opt in items" :key="opt.id">
                    <!-- Boolean Accessories -->
                    <div 
                        v-if="opt.type === 'boolean'"
                        class="glass-card option-card accessory-card"
                        :class="{ 
                            selected: isSelected(opt.id, true),
                            disabled: opt.group !== 'support' && !isAvailable(opt.id, true) && !isSelected(opt.id, true)
                        }"
                        @click="(opt.group === 'support' || isAvailable(opt.id, !configOptions[opt.id])) && emit('optionChange', { optionId: opt.id, value: !configOptions[opt.id] })"
                    >
                        <div class="accessory-info">
                            <div class="option-name">{{ opt.display_name }}</div>
                            <div class="option-desc" v-if="opt.notes">{{ opt.notes }}</div>
                        </div>
                        <div class="custom-checkbox" :class="{ checked: isSelected(opt.id, true) }"></div>
                    </div>

                    <!-- Enum Accessories (Dropdowns) -->
                    <div 
                        v-else-if="opt.type === 'enum' || opt.type === 'index'"
                        class="glass-card option-card accessory-card enum-accessory"
                        :class="{ disabled: !isEnumAvailable(opt.id) }"
                    >
                        <div class="accessory-info">
                            <div class="option-name">{{ opt.display_name }}</div>
                            <div class="option-desc" v-if="opt.notes">{{ opt.notes }}</div>
                            <div class="select-wrapper">
                                <select 
                                    class="accessory-select" 
                                    :value="configOptions[opt.id]"
                                    :disabled="!isEnumAvailable(opt.id)"
                                    @change="(e) => handleEnumChange(opt.id, e)"
                                >
                                    <option v-for="val in logic.getAllowedValues(currentModelId, opt.id)" :key="val.toString()" :value="val.toString()">
                                        {{ val }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
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
.accessory-section {
    margin-top: 3rem;
}

.section-title {
    font-size: 1.1rem;
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.accessories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
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
.enum-accessory {
    border-color: rgba(255, 255, 255, 0.1) !important;
    cursor: default !important;
}

.select-wrapper {
    position: relative;
    margin-top: 1rem;
    width: 100%;
}

.accessory-select {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-glass);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.9rem;
    outline: none;
    cursor: pointer;
    appearance: none;
    transition: all 0.2s ease;
}

.accessory-select:hover {
    border-color: var(--accent-primary);
    background: rgba(0, 0, 0, 0.4);
}

.accessory-select:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px rgba(var(--accent-primary-rgb), 0.2);
}

.accessory-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
}

.accessory-card.disabled .select-wrapper::after {
    opacity: 0.3;
}

.select-wrapper::after {
    content: '▼';
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    color: var(--text-secondary);
    pointer-events: none;
}
</style>
