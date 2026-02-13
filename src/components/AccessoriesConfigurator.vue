<script setup lang="ts">
import { computed } from 'vue';
import { type ConfiguratorLogic, type Configuration } from '../logic/configurator';
import ConfigurationSummary from './ConfigurationSummary.vue';

const props = defineProps<{
    logic: ConfiguratorLogic;
    currentModelId: string;
    configOptions: Record<string, string | number | boolean>;
}>();

const emit = defineEmits(['optionChange', 'back']);

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const formatValue = (val: any): string => {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
};

const groupedAccessories = computed(() => {
    const all = props.logic.getAccessories();
    const groups: Record<string, any[]> = {};
    
    all.forEach(opt => {
        let visible = false;
        if (opt.type === 'boolean') {
            visible = isAvailable(opt.id, true) || isAvailable(opt.id, false);
        } else {
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
    <div class="configurator-grid fade-in">
        <main>
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
                                <div class="price-tag" v-if="opt.price !== undefined">{{ formatPrice(opt.price) }}</div>
                                <div class="option-desc" v-if="opt.notes">{{ opt.notes }}</div>
                            </div>
                            <div class="custom-checkbox" :class="{ checked: isSelected(opt.id, true) }"></div>
                        </div>

                        <!-- Enum Accessories (Dropdowns) -->
                        <div 
                            v-else-if="opt.type === 'enum' || opt.type === 'index'"
                            class="glass-card option-card accessory-card dropdown-card"
                            :class="{ disabled: !isEnumAvailable(opt.id) }"
                        >
                            <div class="accessory-info">
                                <div class="option-name">{{ opt.display_name }}</div>
                                <div class="option-desc" v-if="opt.notes">{{ opt.notes }}</div>
                                <div class="dropdown-wrapper">
                                    <select 
                                        :value="configOptions[opt.id]" 
                                        @change="handleEnumChange(opt.id, $event)"
                                        class="accessory-select"
                                        :disabled="!isEnumAvailable(opt.id)"
                                    >
                                        <option v-for="val in logic.getAllowedValues(currentModelId, opt.id)" :key="String(val)" :value="val">
                                            {{ val }} {{ opt.id === 'fap_warranty_years' ? (val === 1 ? 'Year' : 'Years') : '' }}
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>

            <div class="actions-footer">
                <button class="nav-btn back" @click="emit('back')">
                    ← Back to Machine Config
                </button>
                <div class="summary-total-hint">
                    Total: <span class="accent">{{ formatPrice(logic.getTotalPrice({ modelId: currentModelId, options: configOptions })) }}</span>
                </div>
            </div>
        </main>

        <aside class="summary-stick">
            <ConfigurationSummary 
                :logic="logic" 
                :config="{ modelId: currentModelId, options: configOptions }" 
            />
        </aside>
    </div>
</template>

<style scoped>
.configurator-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 2rem;
    align-items: start;
}

.category-title {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.step-desc {
    color: var(--text-secondary);
    margin-bottom: 2rem;
    font-size: 1.1rem;
}

.accessory-section {
    margin-top: 3rem;
}

.section-title {
    font-size: 1.2rem;
    color: var(--text-primary);
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.accessories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
}

.accessory-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    height: 100%;
}

.accessory-card:hover:not(.disabled) {
    transform: translateY(-4px);
    background: rgba(255,255,255,0.08);
}

.accessory-info {
    flex: 1;
}

.price-tag {
    font-family: 'JetBrains Mono', 'Monaco', monospace;
    color: var(--accent-primary);
    font-weight: 700;
    margin-bottom: 0.25rem;
}

.dropdown-card {
    cursor: default;
}

.dropdown-wrapper {
    margin-top: 1rem;
}

.accessory-select {
    width: 100%;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    color: white;
    padding: 0.5rem;
    outline: none;
    cursor: pointer;
}

.summary-stick {
    position: sticky;
    top: 2rem;
}

.actions-footer {
    margin-top: 4rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-btn {
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.nav-btn.back {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text-primary);
}

.nav-btn.back:hover {
    background: rgba(255,255,255,0.1);
}

.summary-total-hint {
    font-size: 1.2rem;
    font-weight: 700;
}

.accent {
    color: var(--accent-primary);
}

.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(0.5);
}

@media (max-width: 1024px) {
    .configurator-grid {
        grid-template-columns: 1fr;
    }
    .summary-stick {
        position: static;
        margin-top: 2rem;
    }
}
</style>
