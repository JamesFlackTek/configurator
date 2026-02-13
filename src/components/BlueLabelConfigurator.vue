<script setup lang="ts">
import { computed } from 'vue';
import { type ConfiguratorLogic, type Configuration, type CatalogOption } from '../logic/configurator';

const props = defineProps<{
    logic: ConfiguratorLogic;
    models: any[];
    currentModelId: string;
    configOptions: Record<string, string | number | boolean>;
}>();

const emit = defineEmits(['optionChange', 'reset', 'resetOptions', 'continue']);

const handleOptionChange = (optionId: string, value: string | number | boolean) => {
  emit('optionChange', { optionId, value });
};

// Formatting helpers
const formatValue = (opt: CatalogOption, val: string | number | boolean): string => {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (opt.id === 'voltage') {
      if (val == 120) return '120V (US)';
      if (val == 220) return '200-240V (Intl)';
      if (val === '208/240') return '208/240V (US)';
      if (val === '208 3 phase') return '208V 3-Phase';
  }
  if (opt.id === 'vacuum') return val ? 'Vacuum' : 'Non-Vacuum';
  return String(val);
};

const getOptionLabel = (id: string) => {
    const opt = props.logic.getOption(id);
    return opt ? opt.display_name : id;
};

const machineImage = computed(() => {
    return props.logic.getMachineImage({ modelId: props.currentModelId, options: props.configOptions });
});

const machineName = computed(() => {
    const model = props.models.find(m => m.id === props.currentModelId);
    let label = model?.label || 'Blue Label';
    if (props.configOptions['vacuum'] === true) label += ' VAC';
    return `Mixer ${label}`;
});

const totalPrice = computed(() => {
    const model = props.models.find(m => m.id === props.currentModelId);
    let total = model?.price || 0;
    if (props.configOptions['vacuum'] === true) total += 5000;
    return total;
});

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const configCode = computed(() => {
    return props.logic.generateCode({ modelId: props.currentModelId, options: props.configOptions });
});

const getAllowed = (optionId: string) => {
  return props.logic.getAllowedValues(props.currentModelId, optionId);
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

</script>

<template>
    <div class="configurator-grid">
      <main>


        <!-- Single Screen Configuration -->
        <div class="single-screen-config">
            <div class="header-with-action">
                <h2 class="category-title">Blue Label Specification</h2>
                <button class="reset-link-btn" @click="emit('resetOptions')">
                    <span class="reset-icon">↺</span>
                    Reset to Defaults
                </button>
            </div>
            <p class="step-desc">Configure all machine aspects on a single screen. Your selections will dynamically update the machine identity and accessories eligibility.</p>

            <!-- Row 1: Chassis & Vacuum -->
            <div class="config-grid-section">
                <div class="spec-col">
                    <label class="config-code-label">Chassis Style</label>
                    <div class="options-grid vertical-stack">
                        <div 
                            v-for="val in getAllowed('chassis')" 
                            :key="String(val)"
                            class="glass-card option-card horizontal-layout"
                            :class="{ 
                                selected: isSelected('chassis', val),
                                disabled: !isAvailable('chassis', val)
                            }"
                            @click="handleOptionChange('chassis', val)"
                        >
                            <div class="option-name">{{ val }}</div>
                            <div class="custom-checkbox" :class="{ checked: isSelected('chassis', val) }"></div>
                        </div>
                    </div>
                </div>

                <div class="spec-col">
                    <label class="config-code-label">Vacuum System</label>
                    <div class="options-grid vertical-stack">
                        <div 
                            v-for="val in [true, false]" 
                            :key="String(val)"
                            class="glass-card option-card horizontal-layout"
                            :class="{ selected: isSelected('vacuum', val) }"
                            @click="handleOptionChange('vacuum', val)"
                        >
                            <div class="option-name">{{ val ? 'Vacuum' : 'Non-Vacuum' }}</div>
                            <div class="custom-checkbox" :class="{ checked: isSelected('vacuum', val) }"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Row 2: Voltage & Basket -->
            <div class="config-grid-section mt-4">
                <div class="spec-col">
                    <label class="config-code-label">Voltage Selection</label>
                    <div class="options-grid vertical-stack">
                        <div 
                            v-for="val in getAllowed('voltage')" 
                            :key="String(val)"
                            class="glass-card option-card horizontal-layout"
                            :class="{ 
                                selected: isSelected('voltage', val),
                                disabled: !isAvailable('voltage', val)
                            }"
                            @click="handleOptionChange('voltage', val)"
                        >
                            <div class="option-name">{{ formatValue(props.logic.getOption('voltage')!, val) }}</div>
                            <div class="custom-checkbox" :class="{ checked: isSelected('voltage', val) }"></div>
                        </div>
                    </div>
                </div>

                <div class="spec-col">
                    <label class="config-code-label">Basket Size</label>
                    <div class="options-grid checkbox-grid">
                        <div 
                            v-for="val in getAllowed('basket')" 
                            :key="String(val)"
                            class="glass-card option-card horizontal-layout small-card"
                            :class="{ 
                                selected: isSelected('basket', val),
                                disabled: !isAvailable('basket', val)
                            }"
                            @click="isAvailable('basket', val) && handleOptionChange('basket', val)"
                        >
                            <div class="option-name">
                                <template v-if="val === 'Other'">Custom</template>
                                <template v-else-if="Number(val) < 100">{{ val }}kg</template>
                                <template v-else>{{ val }}g</template>
                            </div>
                            <div class="custom-checkbox" :class="{ checked: isSelected('basket', val) }"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Row 3: Advanced Options & Certs -->
            <div class="config-grid-section mt-4">
                <div class="spec-col">
                    <label class="config-code-label">Certifications</label>
                    <div class="options-grid checkbox-grid">
                        <div 
                            v-for="optId in ['ul_cert', 'ce_cert', 'c1d2']" 
                            :key="optId"
                            class="glass-card option-card horizontal-layout"
                            :class="{ 
                                selected: isSelected(optId, true),
                                disabled: !isAvailable(optId, true)
                            }"
                            @click="isAvailable(optId, true) && handleOptionChange(optId, !configOptions[optId])"
                        >
                             <div class="option-name">{{ getOptionLabel(optId) }}</div>
                             <div class="custom-checkbox" :class="{ checked: isSelected(optId, true) }"></div>
                        </div>
                    </div>
                </div>

                <div class="spec-col">
                    <label class="config-code-label">Automation</label>
                    <div class="options-grid checkbox-grid">
                        <div 
                            v-for="optId in ['temp_monitoring', 'robot_ready', 'automatic_lid']" 
                            :key="optId"
                            class="glass-card option-card horizontal-layout"
                            :class="{ 
                                selected: isSelected(optId, true),
                                disabled: !isAvailable(optId, true)
                            }"
                            @click="isAvailable(optId, true) && handleOptionChange(optId, !configOptions[optId])"
                        >
                             <div class="option-name">{{ getOptionLabel(optId) }}</div>
                             <div class="custom-checkbox" :class="{ checked: isSelected(optId, true) }"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="step-nav-footer">
                <button class="nav-btn prev" @click="emit('reset')">← Back to Standard Machines</button>
                <div style="flex-grow: 1;"></div>
                <button class="nav-btn next premium-btn" @click="emit('continue')">
                    Continue to Accessories
                    <span class="btn-arrow">→</span>
                </button>
            </div>
        </div>
      </main>

      <aside class="summary-stick">
        <!-- Machine Identity Preview -->
        <div class="glass-card identity-card" style="margin-bottom: 1rem; padding: 1rem;">
             <h3 class="machine-title-display" style="font-size: 1.1rem; margin-bottom: 0.5rem;">{{ machineName }}</h3>
             <div class="sidebar-preview">
                <img v-if="machineImage" :src="machineImage" alt="Machine Preview" class="machine-preview-img-small" />
             </div>
        </div>

        <div class="glass-card">
           <h3 class="summary-title">Blue Label Summary</h3>
           <div class="summary-list">
               <div v-for="(val, key) in configOptions" :key="key" class="summary-item">
                   <template v-if="val !== undefined && val !== false && key !== 'model_variant'">
                       <span style="display: block; margin-bottom: 0.25rem;">{{ getOptionLabel(key) }}: {{ formatValue(logic.getOption(key)!, val) }}</span>
                   </template>
               </div>
           </div>
           
           <div class="total-row">
            <span>Premium Total</span>
            <span class="total-price">{{ formatPrice(totalPrice) }}</span>
          </div>
          
           <div class="config-code-box">
            <div class="config-code-label">PROD CODE</div>
            <div class="config-code">{{ configCode }}</div>
          </div>
        </div>
      </aside>
    </div>
</template>

<style scoped>
.step-indicator {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 2rem;
}

.step-dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    border: 1px solid var(--border-glass);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: var(--text-secondary);
    transition: all 0.3s ease;
}

.step-dot.active {
    background: rgba(var(--accent-primary-rgb), 0.2);
    border-color: var(--accent-primary);
    color: var(--text-primary);
}

.step-dot.current {
    box-shadow: 0 0 15px var(--accent-primary);
    transform: scale(1.2);
}

.step-desc {
    color: var(--text-secondary);
    margin: 0.5rem 0 2rem 0;
    max-width: 600px;
    line-height: 1.5;
}

.step-nav-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border-glass);
}

.nav-btn {
    padding: 0.85rem 1.75rem;
    border-radius: 8px;
    border: 1px solid var(--border-glass);
    background: rgba(255,255,255,0.05);
    color: var(--text-primary);
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
    background: rgba(255,255,255,0.1);
    border-color: var(--accent-primary);
    transform: translateY(-1px);
}

.nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.premium-btn {
    background: linear-gradient(135deg, var(--accent-primary), #6366f1);
    border: none;
    box-shadow: 0 4px 15px rgba(var(--accent-primary-rgb), 0.3);
}

.btn-arrow {
    margin-left: 0.5rem;
}

.large-options {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
}

.primary-selection {
    padding: 2rem !important;
    position: relative;
    overflow: hidden;
}

.selection-indicator {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--accent-primary);
    opacity: 0;
    transition: opacity 0.2s ease;
}

.option-card.selected .selection-indicator {
    opacity: 1;
}

.specs-mini-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
}

.vertical-stack {
    grid-template-columns: 1fr;
    gap: 1rem;
}

.horizontal-layout {
    flex-direction: row !important;
    justify-content: space-between !important;
    padding: 1.25rem !important;
    min-height: auto !important;
}

.selection-status {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent-primary);
    font-weight: bold;
}

.final-options-grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 3rem;
}

.checkbox-grid {
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.checkbox-card {
    flex-direction: row !important;
    justify-content: flex-start !important;
    padding: 1rem !important;
    min-height: auto !important;
    gap: 1rem;
}

.custom-checkbox {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-glass);
    border-radius: 4px;
    transition: all 0.2s ease;
}

.custom-checkbox.checked {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    box-shadow: 0 0 8px var(--accent-primary);
}

.config-grid-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
}

.mt-4 { margin-top: 2rem; }

.header-with-action {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 0.5rem;
}

.reset-link-btn {
    background: none;
    border: none;
    color: var(--accent-primary);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 4px;
    transition: background 0.2s;
}

.reset-link-btn:hover {
    background: rgba(var(--accent-primary-rgb), 0.1);
}

.reset-icon {
    font-size: 1.1rem;
}

.horizontal-scroll {
    display: flex;
    overflow-x: auto;
    gap: 0.75rem;
    padding-bottom: 0.5rem;
}

.horizontal-scroll::-webkit-scrollbar {
    height: 4px;
}

.horizontal-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
}

.sidebar-preview {
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    overflow: hidden;
}

.machine-preview-img-small {
    max-height: 100%;
    max-width: 100%;
    object-fit: contain;
}

/* Animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
