<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ConfiguratorLogic, type Configuration, type CatalogOption } from './logic/configurator';

const logic = new ConfiguratorLogic();

const currentModelId = ref<string | null>(null);
const configOptions = ref<Record<string, string | number | boolean>>({});

// Initialize models
const models = computed(() => logic.getModels());

// Helper to get allowed values for current model and option
const getAllowed = (optionId: string) => {
  if (!currentModelId.value) return [];
  return logic.getAllowedValues(currentModelId.value, optionId);
};

// Helper to check if option is available/valid
const isAvailable = (optionId: string, value: string | number | boolean) => {
  // If model not selected, nothing is available
  if (!currentModelId.value) return false;
  
  // Create temp config to test
  const tempConfig: Configuration = {
    modelId: currentModelId.value,
    options: { ...configOptions.value }
  };
  
  return logic.isOptionAvailable(tempConfig, optionId, value);
};

const handleModelSelect = (modelId: string) => {
  currentModelId.value = modelId;
  // Reset options to defaults for this model
  const initialConfig = logic.createInitialConfig(modelId);
  configOptions.value = initialConfig.options;
};

const handleOptionChange = (optionId: string, value: string | number | boolean) => {
  if (!currentModelId.value) return;
  
  const currentConfig: Configuration = {
    modelId: currentModelId.value,
    options: { ...configOptions.value }
  };
  
  // Toggle logic if same value selected? No, usually not for single-select enums.
  // valuable for booleans though.
  
  const newConfig = logic.toggleOption(currentConfig, optionId, value);
  configOptions.value = newConfig.options;
};

const isSelected = (optionId: string, value: string | number | boolean) => {
  return configOptions.value[optionId] === value;
};

// Formatting helpers
const formatValue = (opt: CatalogOption, val: string | number | boolean): string => {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (opt.id === 'voltage') {
      if (val == 120) return '120V (US)';
      if (val == 220) return '200-240V (Intl)';
      if (val === '208/240') return '208V/240V (US)';
      if (val === '208 3 phase') return '208V 3-Phase';
  }
  if (opt.id === 'vacuum') return val ? 'Vacuum' : 'Non-Vacuum';
  if (opt.id === 'c1d2') return 'C1D2 (HazLoc)';
  return String(val);
};

const getOptionLabel = (id: string) => {
    const opt = logic.getOption(id);
    return opt ? opt.display_name : id;
};

// Groups for UI rendering
const uiGroups = {
    specs: ['voltage', 'vacuum', 'basket', 'weight_options_standard', 'chassis'],
    certifications: ['ul_cert', 'ce_cert', 'c1d2'],
    advanced: ['adjustable_arm', 'robot_ready', 'automatic_lid', 'remote_safety', 'remote_operation', 'low_speed', 'high_power', 'temp_monitoring', 'echo_mode']
};

const machineImage = computed(() => { // Re-added machineImage
    if (!currentModelId.value) return '';
    return logic.getMachineImage({ modelId: currentModelId.value, options: configOptions.value });
});

const machineName = computed(() => {
    if (!currentModelId.value) return 'Select Machine';
    const model = models.value.find(m => m.id === currentModelId.value);
    if (!model) return 'Unknown Mixer';
    
    let modelLabel = model.label;
    
    // For non-Blue Label models, replace XXX/XXXX with weight if available
    if (currentModelId.value !== 'blue_label' && configOptions.value['weight_options_standard']) {
        const weight = configOptions.value['weight_options_standard'];
        modelLabel = modelLabel.replace(/XXX+/g, String(weight));
    }
    
    // Append VAC if vacuum is selected
    if (configOptions.value['vacuum'] === true) {
        modelLabel += ' VAC';
    }
    
    return `Mixer ${modelLabel}`;
});

const totalPrice = computed(() => {
    if (!currentModelId.value) return 0;
    const model = models.value.find(m => m.id === currentModelId.value);
    let total = model?.price || 0;
    
    // Add option prices
    if (configOptions.value['vacuum'] === true) total += 5000;
    
    return total;
});

const validation = computed(() => {
    if (!currentModelId.value) return { valid: true, errors: [] };
    return logic.validate({ modelId: currentModelId.value, options: configOptions.value });
});

const configCode = computed(() => {
    if (!currentModelId.value) return '';
    return logic.generateCode({ modelId: currentModelId.value, options: configOptions.value });
});

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

// Select first model on mount
onMounted(() => {
    if (models.value.length > 0) {
        handleModelSelect(models.value[0]!.id);
    }
});

</script>

<template>
  <div class="container fade-in">
    <header>
      <h1>Machine Configurator</h1>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">Configure your industrial mixing solution.</p>
    </header>

    <div class="configurator-grid">
      <main>
        <!-- Machine Preview -->
        <section class="category-section preview-section">
           <h2 class="machine-title-display">{{ machineName }}</h2>
          <div class="glass-card preview-card">
              <img v-if="machineImage" :src="machineImage" alt="Machine Preview" class="machine-preview-img" />
          </div>
        </section>

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
               
               <!-- Loop through defined spec options -->
               <div v-for="optId in uiGroups.specs" :key="optId" style="grid-column: span 1;">
                   <template v-if="logic.getOption(optId) && getAllowed(optId).length > 0 && (optId !== 'chassis' || getAllowed(optId).length > 1)">
                       <label class="config-code-label">{{ getOptionLabel(optId) }}</label>
                       <div class="options-grid spec-grid" style="grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));">
                           <div 
                                v-for="val in getAllowed(optId)" 
                                :key="String(val)"
                                class="glass-card option-card small-card"
                                :class="{ 
                                    selected: isSelected(optId, val),
                                    disabled: !isAvailable(optId, val)
                                }"
                                @click="handleOptionChange(optId, val)"
                           >
                               <div class="option-name">{{ formatValue(logic.getOption(optId)!, val) }}</div>
                           </div>
                       </div>
                   </template>
               </div>
           </div>
        </section>

        <!-- Certifications -->
        <section class="category-section" v-if="currentModelId">
            <h2 class="category-title">Certifications</h2>
            <div class="options-grid">
                <template v-for="optId in uiGroups.certifications" :key="optId">
                    <div 
                        v-if="logic.getOption(optId) && getAllowed(optId).includes(true)"
                        class="glass-card option-card small-card"
                        :class="{ selected: isSelected(optId, true) }"
                        @click="handleOptionChange(optId, !configOptions[optId])"
                    >
                         <div class="option-name">{{ getOptionLabel(optId) }}</div>
                         <div class="option-desc">{{ isSelected(optId, true) ? 'Selected' : 'Add' }}</div>
                    </div>
                </template>
            </div>
        </section>
        
         <!-- Advanced -->
        <section class="category-section" v-if="currentModelId">
            <h2 class="category-title">Advanced / Automation</h2>
            <div class="options-grid">
                <template v-for="optId in uiGroups.advanced" :key="optId">
                    <div 
                        v-if="logic.getOption(optId) && getAllowed(optId).includes(true)"
                        class="glass-card option-card small-card"
                        :class="{ selected: isSelected(optId, true) }"
                        @click="handleOptionChange(optId, !configOptions[optId])"
                    >
                         <div class="option-name">{{ getOptionLabel(optId) }}</div>
                    </div>
                </template>
            </div>
        </section>

      </main>

      <aside class="summary-stick">
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
  </div>
</template>

<style>
/* Reusing existing styles */
.custom-select {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-glass);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 1rem;
  margin-top: 0.5rem;
  outline: none;
  cursor: pointer;
}

.custom-select:focus {
  border-color: var(--accent-primary);
}

.small-card { padding: 1rem !important; }

.spec-grid { gap: 1rem !important; }

.error-box {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(248, 81, 73, 0.1);
  border-radius: 8px;
  border: 1px solid var(--danger);
}

.error-title {
  color: var(--danger);
  font-weight: bold;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.error-box ul {
  color: var(--text-primary);
  font-size: 0.85rem;
  margin-left: 1.2rem;
}

.summary-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.horizontal-card {
  transition: all 0.2s ease;
  cursor: pointer;
}

.horizontal-card:hover {
  border-color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.1);
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-glass);
  border-radius: 4px;
  position: relative;
  flex-shrink: 0;
}

.checkbox.checked {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.preview-section {
  margin-bottom: 2rem;
}

.preview-card {
  position: relative;
  padding: 0;
  overflow: hidden;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.machine-preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute; /* Add position absolute to place behind text */
  z-index: 0;
}

.preview-card:hover .machine-preview-img {
  transform: scale(1.05);
}

.machine-title-display {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.summary-title {
    margin-bottom: 1rem;
}

.total-price {
  background: linear-gradient(135deg, var(--accent-primary), #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
}

.config-code-box {
    margin-top: 1rem;
    padding: 0.5rem;
    background: rgba(0,0,0,0.3);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.8rem;
    word-break: break-all;
}

/* New/Updated Styles for Layout Issues */

.option-card {
    display: flex;
    flex-direction: column;
    justify-content: center; /* Center content vertically */
    align-items: center;     /* Center content horizontally */
    text-align: center;
    min-height: 80px;        /* Ensure consistent height */
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid var(--border-glass);
    background: rgba(255, 255, 255, 0.05);
}

.option-card:hover {
   background: rgba(255, 255, 255, 0.1);
   border-color: var(--accent-primary);
}

.option-card.selected {
   background: rgba(var(--accent-primary-rgb), 0.2);
   border-color: var(--accent-primary);
   box-shadow: 0 0 15px rgba(var(--accent-primary-rgb), 0.3);
}

.option-name {
    font-weight: 600;
    font-size: 0.95rem;
    line-height: 1.3;     /* Better line height for wrapping */
    word-wrap: break-word; /* Ensure wrapping */
    max-width: 100%;      /* Prevent overflow */
}

.option-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
    filter: grayscale(100%);
    background: rgba(0, 0, 0, 0.2); /* Darker background for disabled */
    border-color: transparent;
}

.option-desc {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}
</style>
