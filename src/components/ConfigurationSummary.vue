<script setup lang="ts">
import { computed } from 'vue';
import type { ConfiguratorLogic, Configuration, CatalogOption } from '../logic/configurator';

const props = defineProps<{
    logic: ConfiguratorLogic;
    config: Configuration;
    title?: string;
}>();

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const formatValue = (val: any): string => {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
};

const machineName = computed(() => {
    const model = props.logic.getModels().find(m => m.id === props.config.modelId);
    let label = model?.label || 'Machine';
    
    // Add VAC suffix if vacuum is enabled (user liked this)
    if (props.config.options['vacuum'] === true && !label.includes('VAC')) {
        label += ' VAC';
    }
    
    return `FlackTek ${label}`;
});

const machineImage = computed(() => {
    return props.logic.getMachineImage(props.config);
});

const totalPrice = computed(() => {
    return props.logic.getTotalPrice(props.config);
});

const productCode = computed(() => {
    return props.logic.generateProductCode(props.config);
});

const orderCode = computed(() => {
    return props.logic.generateOrderCode(props.config);
});

const getDisplayPrice = (item: CatalogOption) => {
    let price = item.price || 0;
    if ((item.id === 'fap_gold' || item.id === 'fap_platinum') && props.config.options[item.id] === true) {
        const years = props.config.options['fap_warranty_years'] as number || 1;
        price *= years;
    }
    return price;
};

// Split options into Machine Mods (from machine catalog) and Accessories (from accessories catalog)
const machineMods = computed(() => {
    return props.logic.getMachineOptions().filter(opt => {
        const val = props.config.options[opt.id];
        return val !== undefined && (val !== false || opt.type !== 'boolean') && opt.id !== 'model_variant';
    });
});

const selectedAccessories = computed(() => {
    return props.logic.getAccessories().filter(acc => {
        const val = props.config.options[acc.id];
        // Don't show the duration enum directly as a top-level accessory, 
        // it's handled via getDisplayPrice for the plan itself.
        return (val === true || (acc.type === 'enum' && val !== undefined)) && acc.id !== 'fap_warranty_years';
    });
});
</script>

<template>
    <div class="summary-container">
        <!-- Machine Identity Preview -->
        <div class="glass-card identity-card" style="margin-bottom: 1rem; padding: 1rem;">
             <h3 class="machine-title-display" style="font-size: 1.1rem; margin-bottom: 0.5rem;">{{ machineName }}</h3>
             <div class="sidebar-preview">
                <img v-if="machineImage" :src="machineImage" alt="Machine Preview" class="machine-preview-img-small" />
             </div>
        </div>

        <div class="glass-card">
            <h3 class="summary-title">{{ title || 'Order Summary' }}</h3>
            
            <div class="summary-list">
                <!-- Machine Module -->
                <div class="summary-group">
                    <div class="summary-row primary">
                        <span class="summary-label main-item">{{ machineName }}</span>
                        <span class="summary-price">{{ formatPrice(logic.getModelBasePrice(config.modelId)) }}</span>
                    </div>
                    
                    <!-- Machine Options (Modifications) -->
                    <div class="summary-sub-items">
                        <div v-for="opt in machineMods" :key="opt.id" class="summary-row sub-item">
                            <span class="summary-label indented">{{ opt.display_name }}: {{ formatValue(config.options[opt.id]) }}</span>
                            <span class="summary-price" v-if="opt.price">{{ formatPrice(opt.price) }}</span>
                            <span class="summary-price" v-else>$0</span>
                        </div>
                    </div>
                </div>

                <!-- Accessories Module -->
                <div v-if="selectedAccessories.length > 0" class="summary-group" style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                    <div class="summary-row secondary">
                        <span class="summary-label main-item" style="color: var(--text-secondary); font-size: 0.9rem;">Accessories</span>
                    </div>
                    <div class="summary-sub-items">
                        <div v-for="acc in selectedAccessories" :key="acc.id" class="summary-row sub-item">
                            <span class="summary-label indented">{{ acc.display_name }}{{ acc.type === 'enum' ? ': ' + formatValue(config.options[acc.id]) : '' }}</span>
                            <span class="summary-price">{{ formatPrice(getDisplayPrice(acc)) }}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="codes-section">
                <div class="code-item">
                    <span class="code-label">Product Code:</span>
                    <span class="code-value">{{ productCode }}</span>
                </div>
                <div class="code-item">
                    <span class="code-label">Order Code:</span>
                    <span class="code-value">{{ orderCode }}</span>
                </div>
            </div>

            <div class="total-row">
                <span>Total Amount</span>
                <span class="total-price">{{ formatPrice(totalPrice) }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.summary-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.machine-title-display {
    color: var(--text-primary);
    font-weight: 700;
}

.sidebar-preview {
    width: 100%;
    aspect-ratio: 3/4;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.machine-preview-img-small {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
}

.summary-title {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
}

.summary-list {
    display: flex;
    flex-direction: column;
}

.summary-group {
    margin-bottom: 0.5rem;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.25rem;
}

.summary-row.primary {
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.summary-row.secondary {
    font-weight: 600;
    margin-bottom: 0.52rem;
}

.main-item {
    font-size: 1rem;
}

.summary-sub-items {
    padding-left: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.summary-row.sub-item {
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.indented {
    padding-left: 0.5rem;
}

.summary-price {
    font-family: 'JetBrains Mono', 'Monaco', monospace;
    font-size: 0.85rem;
}

.total-row {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 2px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
}

.total-price {
    font-size: 1.5rem;
    color: var(--accent-primary);
}

.codes-section {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.code-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.code-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent-primary);
    font-weight: 600;
}

.code-value {
    font-family: 'JetBrains Mono', 'Monaco', monospace;
    font-size: 0.8rem;
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    word-break: break-all;
}
</style>
