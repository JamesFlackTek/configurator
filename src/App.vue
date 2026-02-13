<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ConfiguratorLogic, type Configuration } from './logic/configurator';
import StandardConfigurator from './components/StandardConfigurator.vue';
import BlueLabelConfigurator from './components/BlueLabelConfigurator.vue';
import AccessoriesConfigurator from './components/AccessoriesConfigurator.vue';

const logic = new ConfiguratorLogic();

const currentModelId = ref<string | null>(null);
const currentView = ref<'machine' | 'accessories'>('machine');
const configOptions = ref<Record<string, string | number | boolean>>({});

// Initialize models
const models = computed(() => logic.getModels());

const handleModelSelect = (modelId: string) => {
  currentModelId.value = modelId;
  currentView.value = 'machine';
  // Reset options to defaults for this model
  const initialConfig = logic.createInitialConfig(modelId);
  configOptions.value = initialConfig.options;
};

const handleOptionChange = (data: { optionId: string; value: string | number | boolean }) => {
  if (!currentModelId.value) return;
  
  const currentConfig: Configuration = {
      modelId: currentModelId.value,
      options: { ...configOptions.value }
  };
  
  const newConfig = logic.toggleOption(currentConfig, data.optionId, data.value);
  configOptions.value = newConfig.options;
};

const handleReset = () => {
    currentModelId.value = null;
    currentView.value = 'machine';
    configOptions.value = {};
};

const handleResetOptions = () => {
    if (!currentModelId.value) return;
    const initialConfig = logic.createInitialConfig(currentModelId.value);
    configOptions.value = initialConfig.options;
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

    <template v-if="currentModelId === 'blue_label'">
        <BlueLabelConfigurator 
            v-if="currentView === 'machine'"
            :logic="logic"
            :models="models"
            :current-model-id="currentModelId"
            :config-options="configOptions"
            @option-change="handleOptionChange"
            @reset="handleReset"
            @reset-options="handleResetOptions"
            @continue="currentView = 'accessories'"
        />
        <AccessoriesConfigurator
            v-else
            :logic="logic"
            :current-model-id="currentModelId"
            :config-options="configOptions"
            @option-change="handleOptionChange"
            @back="currentView = 'machine'"
        />
    </template>
    <template v-else>
        <StandardConfigurator 
            v-if="currentView === 'machine'"
            :logic="logic"
            :models="models"
            :current-model-id="currentModelId"
            :config-options="configOptions"
            @model-select="handleModelSelect"
            @option-change="handleOptionChange"
            @continue="currentView = 'accessories'"
        />
        <AccessoriesConfigurator
            v-else
            :logic="logic"
            :current-model-id="currentModelId!"
            :config-options="configOptions"
            @option-change="handleOptionChange"
            @back="currentView = 'machine'"
        />
    </template>
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
