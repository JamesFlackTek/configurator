<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ConfiguratorLogic } from './logic/configurator';
import type { Configuration } from './logic/configurator';
import { machineData } from './logic/data';

const logic = new ConfiguratorLogic(machineData);
const config = ref<Configuration>({ 
  selectedOptionIds: new Set(),
  expectedMass: 100,
  maxMass: 100
});

// Helper to get options for a category
const getOptions = (catId: string) => machineData.options.filter(o => o.categoryId === catId);

// Helper to get selected ID for a category (for selects)
const getSelectedId = (catId: string) => {
  const options = getOptions(catId);
  return Array.from(config.value.selectedOptionIds).find(id => options.some(o => o.id === id)) || '';
};

onMounted(() => {
  // Select first option in exclusive categories by default (except weight/family which are derived)
  machineData.categories.forEach(cat => {
    if (cat.exclusive && cat.id !== 'weight' && cat.id !== 'family') {
      const firstOption = machineData.options.find(o => o.categoryId === cat.id);
      if (firstOption) {
        config.value = logic.toggleOption(config.value, firstOption.id);
      }
    }
  });
  // Initialize family
  handleMassChange();
});

const handleMassChange = () => {
  const familyId = logic.deriveFamily(config.value.expectedMass);
  if (familyId) {
    // Force select the family
    config.value = logic.toggleOption({ ...config.value, selectedOptionIds: new Set([...config.value.selectedOptionIds].filter(id => {
      const opt = machineData.options.find(o => o.id === id);
      return opt?.categoryId !== 'family';
    })) }, familyId);
  }
};

const handleToggle = (optionId: string) => {
  if (!isAvailable(optionId) && !isSelected(optionId)) return;
  config.value = logic.toggleOption(config.value, optionId);
};

const isSelected = (optionId: string) => config.value.selectedOptionIds.has(optionId);
const isAvailable = (optionId: string) => logic.isOptionAvailable(config.value, optionId);
const getTooltip = (optionId: string) => {
  const reasons = logic.getConflictReasons(config.value, optionId);
  return reasons.length > 0 ? reasons.join('\n') : null;
};

const selectedOptions = computed(() => {
  return Array.from(config.value.selectedOptionIds)
    .map(id => machineData.options.find(o => o.id === id))
    .filter(Boolean);
});

const totalPrice = computed(() => {
  return selectedOptions.value.reduce((sum, opt) => sum + (opt?.price || 0), 0);
});

const configCode = computed(() => logic.generateCode(config.value));
const validation = computed(() => logic.validate(config.value));
const warnings = computed(() => logic.getWarnings(config.value));

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

</script>

<template>
  <div class="container fade-in">
    <header>
      <h1>Mixing Machine Configurator</h1>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">Configure your industrial mixing solution based on material specs and safety requirements.</p>
    </header>

    <div class="configurator-grid">
      <main>
        <!-- Step 1: Material Specs -->
        <section class="category-section">
          <h2 class="category-title">Step 1: Application Requirements</h2>
          <div class="glass-card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            
            <div>
              <label class="config-code-label">Expected Material Mass (g)</label>
              <input 
                type="number" 
                class="custom-select" 
                v-model.number="config.expectedMass"
                @input="handleMassChange"
                min="0"
              />
            </div>

            <div>
              <label class="config-code-label">Maximum Material Weight (g)</label>
              <input 
                type="number" 
                class="custom-select" 
                v-model.number="config.maxMass"
                min="0"
              />
            </div>

            <div style="grid-column: span 2;">
              <label class="config-code-label">Largest Container Size</label>
              <select 
                class="custom-select" 
                :value="getSelectedId('container')" 
                @change="e => handleToggle((e.target as HTMLSelectElement).value)"
              >
                <option v-for="opt in getOptions('container')" :key="opt.id" :value="opt.id" :disabled="!isAvailable(opt.id)">
                  {{ opt.name }} {{ !isAvailable(opt.id) ? '(Incompatible)' : '' }}
                </option>
              </select>
            </div>

            <div style="grid-column: span 2;">
              <label class="config-code-label">Atmospheric Control</label>
              <div class="options-grid atmosphere-selection" style="grid-template-columns: 1fr 1fr;">
                 <div 
                  v-for="option in getOptions('vacuum')" 
                  :key="option.id"
                  class="glass-card option-card small-card"
                  :class="{ selected: isSelected(option.id), disabled: !isAvailable(option.id) && !isSelected(option.id) }"
                  :data-tooltip="getTooltip(option.id)"
                  @click="handleToggle(option.id)"
                >
                  <div class="option-name">{{ option.name }}</div>
                  <div class="option-price">{{ option.price === 0 ? 'Included' : `+ ${formatPrice(option.price)}` }}</div>
                </div>
              </div>
            </div>


          </div>
        </section>

        <!-- Step 2: Machine Family -->
        <section class="category-section">
          <h2 class="category-title">Step 2: Select Machine Family</h2>
          <div class="options-grid">
            <div 
              v-for="option in getOptions('family')" 
              :key="option.id"
              class="glass-card option-card"
              :class="{ 
                selected: isSelected(option.id),
                disabled: !isAvailable(option.id) && !isSelected(option.id)
              }"
              :data-tooltip="getTooltip(option.id)"
              @click="handleToggle(option.id)"
            >
              <div class="option-name">{{ option.name }}</div>
              <div class="option-desc">{{ option.description }}</div>
              <div class="option-price">{{ formatPrice(option.price) }}</div>
            </div>
          </div>
        </section>

        <!-- Step 3: Options -->
        <section class="category-section">
          <h2 class="category-title">Step 3: Features & Build Options</h2>
          <div class="options-grid">
            <div 
              v-for="option in getOptions('options').filter(o => isAvailable(o.id))" 
              :key="option.id"
              class="glass-card option-card"

              :class="{ 
                selected: isSelected(option.id),
                disabled: !isAvailable(option.id) && !isSelected(option.id)
              }"
              :data-tooltip="getTooltip(option.id)"
              @click="handleToggle(option.id)"
            >
              <div class="option-name">{{ option.name }}</div>
              <div v-if="option.description" class="option-desc">{{ option.description }}</div>
              <div class="option-price">{{ formatPrice(option.price) }}</div>
            </div>

          </div>
        </section>
      </main>


      <aside class="summary-stick">
        <div class="glass-card">
          <h3 class="summary-title">Config Summary</h3>
          <div class="summary-list">
            <div v-for="opt in selectedOptions" :key="opt?.id" class="summary-item">
              <span>{{ opt?.name }}</span>
              <span style="color: var(--text-secondary)">{{ opt?.price === 0 ? 'Included' : formatPrice(opt?.price || 0) }}</span>
            </div>
          </div>
          <div class="total-row">
            <span>Estimated Total</span>
            <span>{{ formatPrice(totalPrice) }}</span>
          </div>
          <div v-if="warnings.length > 0" class="warning-box">
             <div class="warning-title">Capacity Alerts:</div>
             <ul><li v-for="warn in warnings" :key="warn">{{ warn }}</li></ul>
          </div>
          <div v-if="!validation.valid" class="error-box">
             <div class="error-title">Constraints:</div>
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

.warning-box {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(255, 166, 0, 0.1);
  border-radius: 8px;
  border: 1px solid #ffa600;
}

.warning-title {
  color: #ffa600;
  font-weight: bold;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.warning-box ul {
  color: var(--text-primary);
  font-size: 0.85rem;
  margin-left: 1.2rem;
}

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
</style>
