<script setup lang="ts">
import { computed } from 'vue';
import { type ConfiguratorLogic, type Configuration, type CatalogOption } from '../logic/configurator';

const props = defineProps<{
    logic: ConfiguratorLogic;
    models: any[];
    currentModelId: string | null;
    configOptions: Record<string, string | number | boolean>;
}>();

const emit = defineEmits(['modelSelect', 'optionChange', 'continue']);

// Helper to get allowed values for current model and option
const getAllowed = (optionId: string) => {
  if (!props.currentModelId) return [];
  return props.logic.getAllowedValues(props.currentModelId, optionId);
};

// Helper to check if option is available/valid
const isAvailable = (optionId: string, value: string | number | boolean) => {
  if (!props.currentModelId) return false;
  
  const tempConfig: Configuration = {
    modelId: props.currentModelId,
    options: { ...props.configOptions }
  };
  
  return props.logic.isOptionAvailable(tempConfig, optionId, value);
};

const handleModelSelect = (modelId: string) => {
  emit('modelSelect', modelId);
};

const handleOptionChange = (optionId: string, value: string | number | boolean) => {
  emit('optionChange', { optionId, value });
};

const isSelected = (optionId: string, value: string | number | boolean) => {
  return props.configOptions[optionId] === value;
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
  if (opt.id === 'c1d2') return 'C1D2 (HazLoc)';
  return String(val);
};

const getOptionLabel = (id: string) => {
    const opt = props.logic.getOption(id);
    return opt ? opt.display_name : id;
};

// Groups for UI rendering
const uiGroups = {
    specs: ['model_variant', 'voltage', 'basket', 'weight_options_standard', 'chassis'], // Removed vacuum
    certifications: ['ul_cert', 'ce_cert', 'c1d2'],
    advanced: ['adjustable_arm', 'robot_ready', 'automatic_lid', 'remote_safety', 'remote_operation', 'low_speed', 'high_power', 'temp_monitoring', 'echo_mode']
};

const machineImage = computed(() => {
    if (!props.currentModelId) return '';
    return props.logic.getMachineImage({ modelId: props.currentModelId, options: props.configOptions });
});

const machineName = computed(() => {
    if (!props.currentModelId) return 'Select Machine';
    const model = props.models.find(m => m.id === props.currentModelId);
    if (!model) return 'Unknown FlackTek';
    
    let modelLabel = model.label;
    
    if (props.currentModelId !== 'blue_label' && props.configOptions['weight_options_standard']) {
        const weight = props.configOptions['weight_options_standard'];
        modelLabel = modelLabel.replace(/XXX+/g, String(weight));
    }
    
    const variant = props.configOptions['model_variant'] as string || '';
    if (variant && variant !== 'Standard') {
        modelLabel += ` ${variant}`;
    }
    
    // Naming fix: only append VAC if not already in variant name
    if (props.configOptions['vacuum'] === true && !variant.toUpperCase().includes('VAC')) {
        modelLabel += ' VAC';
    }
    
    return `FlackTek ${modelLabel}`;
});

const totalPrice = computed(() => {
    if (!props.currentModelId) return 0;
    const model = props.models.find(m => m.id === props.currentModelId);
    let total = model?.price || 0;
    
    if (props.configOptions['vacuum'] === true) {
        total += 5000;
    }
    
    return total;
});

const validation = computed(() => {
    if (!props.currentModelId) return { valid: true, errors: [] };
    return props.logic.validate({ modelId: props.currentModelId, options: props.configOptions });
});

const configCode = computed(() => {
    if (!props.currentModelId) return '';
    return props.logic.generateCode({ modelId: props.currentModelId, options: props.configOptions });
});

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};
</script>

<template>
    <div class="configurator-grid">
      <main>

        <!-- Step 1: Machine Family -->
        <section class="category-section">
          <h2 class="category-title">Step 1: Select Machine Family</h2>
          <div class="options-grid">
            <div 
              v-for="model in models" 
              :key="model.id"
              class="glass-card option-card"
              :class="{ selected: currentModelId === model.id }"
              @click="handleModelSelect(model.id)"
            >
              <div class="option-name">{{ model.label }}</div>
              <div class="option-desc">{{ model.description }}</div>
              <div class="option-price">{{ formatPrice(model.price || 0) }}</div>
            </div>
          </div>
        </section>

        <!-- Step 2: Specs -->
        <section class="category-section" v-if="currentModelId">
           <h2 class="category-title">Step 2: Specifications</h2>
           <div class="glass-card Specs-Container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
               
               <div v-for="optId in uiGroups.specs" :key="optId" style="grid-column: span 1;">
                   <template v-if="logic.getOption(optId) && getAllowed(optId).length > 0 && (optId !== 'chassis' || getAllowed(optId).length > 1)">
                       <label class="config-code-label">{{ getOptionLabel(optId) }}</label>
                       <div class="options-grid spec-grid" style="grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));">
                           <div 
                                v-for="val in getAllowed(optId)" 
                                :key="String(val)"
                                class="glass-card option-card horizontal-layout small-card"
                                :class="{ 
                                    selected: isSelected(optId, val),
                                    disabled: !isAvailable(optId, val)
                                }"
                                @click="handleOptionChange(optId, val)"
                           >
                               <div class="option-name">{{ formatValue(logic.getOption(optId)!, val) }}</div>
                                <div class="custom-checkbox" :class="{ checked: isSelected(optId, val) }"></div>
                           </div>
                       </div>
                   </template>
               </div>
           </div>
        </section>

        <!-- Certifications -->
        <section class="category-section" v-if="currentModelId">
            <h2 class="category-title">Certifications</h2>
            <div class="options-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                <template v-for="optId in uiGroups.certifications" :key="optId">
                    <div 
                        v-if="logic.getOption(optId) && getAllowed(optId).includes(true)"
                        class="glass-card option-card horizontal-layout small-card"
                        :class="{ selected: isSelected(optId, true) }"
                        @click="handleOptionChange(optId, !configOptions[optId])"
                    >
                         <div class="option-name">{{ getOptionLabel(optId) }}</div>
                         <div class="custom-checkbox" :class="{ checked: isSelected(optId, true) }"></div>
                    </div>
                </template>
            </div>
        </section>
        
         <!-- Advanced -->
        <section class="category-section" v-if="currentModelId">
            <h2 class="category-title">Advanced / Automation</h2>
            <div class="options-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                <template v-for="optId in uiGroups.advanced" :key="optId">
                    <div 
                        v-if="logic.getOption(optId) && getAllowed(optId).includes(true)"
                        class="glass-card option-card horizontal-layout small-card"
                        :class="{ 
                            selected: isSelected(optId, true),
                            disabled: !isAvailable(optId, true)
                        }"
                        @click="isAvailable(optId, true) && handleOptionChange(optId, !configOptions[optId])"
                    >
                         <div class="option-name">{{ getOptionLabel(optId) }}</div>
                         <div class="custom-checkbox" :class="{ checked: isSelected(optId, true) }"></div>
                    </div>
                </template>
            </div>
        </section>

        <div class="step-nav-footer mt-4" v-if="currentModelId">
            <div style="flex-grow: 1;"></div>
            <button class="nav-btn next premium-btn" @click="emit('continue')">
                Continue to Accessories
                <span class="btn-arrow">→</span>
            </button>
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
           <h3 class="summary-title">Config Summary</h3>
           <div class="summary-list">
               <div v-for="(val, key) in configOptions" :key="key" class="summary-item">
                   <template v-if="val !== undefined && val !== false && key !== 'model_variant'">
                       <span style="display: block; margin-bottom: 0.25rem;">{{ getOptionLabel(key) }}: {{ formatValue(logic.getOption(key)!, val) }}</span>
                   </template>
               </div>
           </div>
           
           <div class="total-row">
            <span>Estimated Total</span>
            <span class="total-price">{{ formatPrice(totalPrice) }}</span>
          </div>
          
           <div v-if="!validation.valid" class="error-box">
             <div class="error-title">Issues:</div>
             <ul><li v-for="err in validation.errors" :key="err">{{ err }}</li></ul>
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
.configurator-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 3rem;
    align-items: flex-start;
}

.summary-stick {
    position: sticky;
    top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.sidebar-preview {
    height: 180px; /* Further increased for portrait aspect ratio */
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    overflow: hidden;
}

.machine-preview-img-small {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.horizontal-layout {
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: center !important;
    text-align: left !important;
    padding: 1.25rem !important;
    min-height: auto !important;
    gap: 1rem;
}

.custom-checkbox {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-glass);
    border-radius: 4px;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.custom-checkbox.checked {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    box-shadow: 0 0 8px var(--accent-primary);
}

.options-grid {
    display: grid;
    gap: 1.5rem;
}

.spec-grid {
    display: flex;
    flex-direction: column;
}
</style>
