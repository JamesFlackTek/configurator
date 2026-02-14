<script setup lang="ts">
import { computed } from 'vue';
import { type ConfiguratorLogic, type Configuration } from '../logic/configurator';
import ConfigurationSummary from './ConfigurationSummary.vue';

const props = defineProps<{
    logic: ConfiguratorLogic;
    currentModelId: string;
    machineConfig?: Configuration; // New prop for scoped management
    configOptions: Record<string, string | number | boolean>;
}>();

const emit = defineEmits(['optionChange', 'back', 'complete']);

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const groupedAccessories = computed(() => {
    const all = props.logic.getAccessories();
    const groups: Record<string, any[]> = {};
    
    all.forEach(opt => {
        let available = false;
        if (opt.type === 'boolean') {
            available = isAvailable(opt.id, true);
        } else {
            const allowed = props.logic.getAllowedValues(props.currentModelId, opt.id);
            available = allowed.some(val => isAvailable(opt.id, val));
        }

        if (available) {
            const groupName = opt.group.charAt(0).toUpperCase() + opt.group.slice(1);
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(opt);
        }
    });
    
    return groups;
});

const getQuantity = (optionId: string) => {
    const val = props.configOptions[optionId];
    if (typeof val === 'number') return val;
    if (val === true) return 1;
    return 0;
};

const updateQuantity = (optionId: string, delta: number) => {
    const current = getQuantity(optionId);
    const next = Math.max(0, current + delta);
    emit('optionChange', { optionId, value: next === 0 ? false : next });
};

const isEnumAvailable = (optionId: string) => {
    if (optionId === 'fap_warranty_years' && props.configOptions['fap_standard'] === true) return false;
    
    const allowed = props.logic.getAllowedValues(props.currentModelId, optionId);
    return allowed.some(val => isAvailable(optionId, val));
};


const isAvailable = (optionId: string, value: string | number | boolean) => {
  // If we have a machineConfig (from cart context), use it for compatibility checks
  // Otherwise, use a default fallback (if we were still using the old flow, which we aren't)
  const baseConfig = props.machineConfig || {
    modelId: props.currentModelId,
    options: {}
  };

  return props.logic.isOptionAvailable(baseConfig, optionId, value);
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
                            class="glass-card option-card accessory-card quantity-card"
                            :class="{ selected: getQuantity(opt.id) > 0 }"
                        >
                            <div class="option-info">
                                <div class="option-name">{{ opt.display_name }}</div>
                                <div class="option-price-hint" v-if="opt.price !== undefined">
                                    +{{ formatPrice(opt.price) }}
                                </div>
                                <div class="option-details mt-1" v-if="(opt as any).fts_pn || (opt as any).accessory_mass">
                                    <span v-if="(opt as any).fts_pn" class="badge">FTS: {{ (opt as any).fts_pn }}</span>
                                    <span v-if="(opt as any).accessory_mass && (opt as any).accessory_mass !== '0'" class="badge">Mass: {{ (opt as any).accessory_mass }}g</span>
                                </div>
                                <div class="option-desc" v-if="opt.notes">{{ opt.notes }}</div>
                            </div>
                            
                            <div class="quantity-controls">
                                <button class="qty-btn" @click.stop="updateQuantity(opt.id, -1)">-</button>
                                <span class="qty-value">{{ getQuantity(opt.id) }}</span>
                                <button class="qty-btn" @click.stop="updateQuantity(opt.id, 1)">+</button>
                            </div>
                        </div>

                        <!-- Enum Accessories (Dropdowns) -->
                        <div 
                            v-else-if="opt.type === 'enum' || opt.type === 'index'"
                            class="glass-card option-card accessory-card dropdown-card"
                            :class="{ disabled: !isEnumAvailable(opt.id) }"
                        >
                            <div class="option-info">
                                <div class="option-name">{{ opt.display_name }}</div>
                                <div class="option-desc" v-if="opt.notes">{{ opt.notes }}</div>
                                <div class="option-details mt-1" v-if="(opt as any).fts_pn || (opt as any).accessory_mass">
                                    <span v-if="(opt as any).fts_pn" class="badge">FTS: {{ (opt as any).fts_pn }}</span>
                                    <span v-if="(opt as any).accessory_mass && (opt as any).accessory_mass !== '0'" class="badge">Mass: {{ (opt as any).accessory_mass }}g</span>
                                </div>
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
                    ← {{ machineConfig ? 'Return to Cart' : 'Back to Machine Config' }}
                </button>
                <div class="summary-total-hint">
                    <button class="primary-btn add-to-cart-btn" @click="emit('complete')">
                        {{ machineConfig ? 'Return to Cart' : 'Next: Add to Cart' }} →
                    </button>
                </div>
            </div>
        </main>

        <aside class="summary-stick">
            <ConfigurationSummary 
                v-if="machineConfig"
                :logic="logic" 
                :config="machineConfig"
                :accessories="configOptions"
            />
            <ConfigurationSummary 
                v-else
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
    background-clip: text;
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

.option-info {
    flex: 1;
}

.option-price-hint {
    font-family: 'JetBrains Mono', 'Monaco', monospace;
    color: var(--accent-primary);
    font-weight: 700;
    margin-bottom: 0.25rem;
    font-size: 0.85rem;
}

.dropdown-card {
    cursor: default;
}
.option-details {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: var(--text-secondary);
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

.quantity-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(0,0,0,0.2);
    padding: 0.4rem;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
}

.qty-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: rgba(255,255,255,0.1);
    color: white;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    line-height: 1;
}

.qty-btn:hover {
    background: var(--accent-primary);
    color: black;
}

.qty-value {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 1.1rem;
    min-width: 1.5rem;
    text-align: center;
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

.primary-btn {
    background: var(--accent-primary);
    color: #000;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s;
}

.primary-btn:hover {
    transform: translateY(-2px);
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
