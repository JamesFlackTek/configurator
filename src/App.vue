<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ConfiguratorLogic } from './logic/configurator';
import type { Configuration, Option, Category } from './logic/configurator';
import { machineData } from './logic/data';

const logic = new ConfiguratorLogic(machineData);
const config = ref<Configuration>({ 
  selectedOptionIds: new Set()
});

// Helper to get options for a category
const getOptions = (catId: string) => machineData.options.filter((o: Option) => o.categoryId === catId);

onMounted(() => {
  // Select first option in exclusive categories by default
  machineData.categories.forEach((cat: Category) => {
    if (cat.exclusive) {
      const firstOption = machineData.options.find((o: Option) => o.categoryId === cat.id);
      if (firstOption) {
        config.value = logic.toggleOption(config.value, firstOption.id);
      }
    }
  });
});

const handleToggle = (optionId: string) => {
  const option = machineData.options.find((o: Option) => o.id === optionId);
  const category = machineData.categories.find((c: Category) => c.id === option?.categoryId);
  
  if (!category?.exclusive && !isAvailable(optionId) && !isSelected(optionId)) return;
  
  config.value = logic.toggleOption(config.value, optionId);
};

const isSelected = (optionId: string) => config.value.selectedOptionIds.has(optionId);
const isAvailable = (optionId: string) => logic.isOptionAvailable(config.value, optionId);

const showAsDisabled = (optionId: string) => {
  const option = machineData.options.find((o: Option) => o.id === optionId);
  const category = machineData.categories.find((c: Category) => c.id === option?.categoryId);
  if (category?.id === 'family') return false;
  return !isAvailable(optionId) && !isSelected(optionId);
};

const getTooltip = (optionId: string) => {
  const reasons = logic.getConflictReasons(config.value, optionId);
  return reasons.length > 0 ? reasons.join('\n') : null;
};

const selectedOptions = computed(() => {
  return Array.from(config.value.selectedOptionIds)
    .map(id => machineData.options.find((o: Option) => o.id === id))
    .filter((o): o is Option => !!o);
});

const machineImage = computed(() => {
  // Find the first selected option that has an imageUrl
  // We check tiers first for Small, then families
  const ids = Array.from(config.value.selectedOptionIds);
  const options = ids.map(id => machineData.options.find(o => o.id === id)).filter(o => !!o);
  
  // Prioritize Tiers (for Small) then Families
  const tierImage = options.find(o => o.categoryId === 'tier' && o.imageUrl)?.imageUrl;
  if (tierImage) return tierImage;
  
  const familyImage = options.find(o => o.categoryId === 'family' && o.imageUrl)?.imageUrl;
  if (familyImage) return familyImage;

  return '/images/small-pro.png'; // Default fallback
});

const machineName = computed(() => {
  const ids = config.value.selectedOptionIds;
  
  // Basket component
  const basketOpt = selectedOptions.value.find(o => o.categoryId === 'container');
  const basket = basketOpt ? basketOpt.name.split(' ')[0] : '???';
  
  // Mass component
  const massOpt = selectedOptions.value.find(o => o.categoryId === 'mass');
  const mass = massOpt ? massOpt.name.split('-')[0] : '???';
  
  // Tier component
  const tierOpt = selectedOptions.value.find(o => o.categoryId === 'tier');
  const tier = (ids.has('f-small') && tierOpt) ? tierOpt.name : '';
  
  // Vacuum component
  const vacuum = ids.has('vac-yes') ? 'Vac' : '';
  
  // Voltage component
  const voltageOpt = selectedOptions.value.find(o => o.categoryId === 'voltage');
  let voltage = '';
  if (voltageOpt) {
    if (voltageOpt.id === 'v-120') voltage = '120V';
    if (voltageOpt.id === 'v-240') voltage = '220V';
    if (voltageOpt.id === 'v-208-3ph') voltage = '208V';
  }

  // Combine components, filtering out empty strings and joining with spaces
  const parts = [`${basket}-${mass}`, tier, vacuum, voltage].filter(p => p !== '');
  
  // Only return name if we have the core components (basket and mass)
  if (basket === '???' || mass === '???') return 'Select Specifications...';
  
  return parts.join(' ');
});

const totalPrice = computed(() => {
  return selectedOptions.value.reduce((sum, opt) => sum + (opt?.price || 0), 0);
});

const configCode = computed(() => logic.generateCode(config.value));
const validation = computed(() => logic.validate(config.value));

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

</script>

<template>
  <div class="container fade-in">
    <header>
      <h1>Machine Configurator</h1>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">Configure your industrial mixing solution in 2 simple steps.</p>
    </header>

    <div class="configurator-grid">
      <main>
        <!-- Machine Preview -->
        <section class="category-section preview-section">
          <div class="glass-card preview-card" style="flex-direction: column; padding-bottom: 2rem;">
            <div class="preview-overlay" v-if="isSelected('f-blue')">
              <span class="badge advanced-badge">Advanced Mode Active</span>
            </div>
            <img :src="machineImage" alt="Machine Preview" class="machine-preview-img" style="flex: 1;" />
            <div class="machine-name-display">
              {{ machineName }}
            </div>
          </div>
        </section>

        <!-- Step 1: Machine Family -->
        <section class="category-section">
          <h2 class="category-title">Step 1: Select Machine Family</h2>
          <div class="options-grid">
            <div 
              v-for="option in getOptions('family')" 
              :key="option.id"
              class="glass-card option-card"
              :class="{ 
                selected: isSelected(option.id),
                disabled: showAsDisabled(option.id)
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

        <!-- Step 2: Machine Specifications -->
        <section class="category-section">
          <h2 class="category-title">Step 2: Machine Specifications</h2>
          <div class="glass-card Specs-Container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            
            <!-- Voltage -->
            <div style="grid-column: span 2;">
              <label class="config-code-label">Voltage Selection</label>
              <div class="options-grid spec-grid" style="grid-template-columns: 1fr 1fr 1fr;">
                 <div 
                  v-for="option in getOptions('voltage').filter(o => isAvailable(o.id))" 
                  :key="option.id"
                  class="glass-card option-card small-card"
                  :class="{ selected: isSelected(option.id) }"
                  @click="handleToggle(option.id)"
                >
                  <div class="option-name">{{ option.name }}</div>
                  <div class="option-desc" style="font-size: 0.75rem; color: var(--text-secondary);">{{ option.description }}</div>
                </div>
              </div>
            </div>

            <!-- Atmosphere (Skip for Small) -->
            <div v-if="!isSelected('f-small')" style="grid-column: span 1;">
              <label class="config-code-label">Atmospheric Control</label>
              <div class="options-grid spec-grid" style="grid-template-columns: 1fr 1fr;">
                 <div 
                  v-for="option in getOptions('vacuum').filter(o => isAvailable(o.id))" 
                  :key="option.id"
                  class="glass-card option-card small-card"
                  :class="{ selected: isSelected(option.id) }"
                  @click="handleToggle(option.id)"
                >
                  <div class="option-name">{{ option.name }}</div>
                  <div class="option-price">{{ option.price === 0 ? 'Included' : `+ ${formatPrice(option.price)}` }}</div>
                </div>
              </div>
            </div>

            <!-- Basket Size -->
            <div :style="{ gridColumn: isSelected('f-small') ? 'span 2' : 'span 1' }">
              <label class="config-code-label">Basket Size Selection</label>
              <div class="options-grid spec-grid" style="grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));">
                 <div 
                  v-for="option in getOptions('container').filter(o => isAvailable(o.id))" 
                  :key="option.id"
                  class="glass-card option-card small-card"
                  :class="{ selected: isSelected(option.id) }"
                  @click="handleToggle(option.id)"
                >
                  <div class="option-name">{{ option.name }}</div>
                  <div class="option-price" v-if="option.price > 0" style="font-size: 0.7rem; margin-top: 2px;">+ {{ formatPrice(option.price) }}</div>
                </div>
              </div>
            </div>

            <!-- Mix Mass -->
            <div style="grid-column: span 2;">
              <label class="config-code-label">Mix Mass Selection</label>
              <div class="options-grid spec-grid" style="grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));">
                 <div 
                  v-for="option in getOptions('mass').filter(o => isAvailable(o.id))" 
                  :key="option.id"
                  class="glass-card option-card small-card"
                  :class="{ selected: isSelected(option.id) }"
                  @click="handleToggle(option.id)"
                >
                  <div class="option-name">{{ option.name }}</div>
                </div>
              </div>
            </div>

            <!-- Model Tier (Small Only) -->
            <div v-if="isSelected('f-small')" style="grid-column: span 2;">
              <label class="config-code-label">Model Tier</label>
              <div class="options-grid spec-grid" style="grid-template-columns: 1fr 1fr 1fr;">
                 <div 
                  v-for="option in getOptions('tier').filter(o => isAvailable(o.id))" 
                  :key="option.id"
                  class="glass-card option-card small-card"
                  :class="{ selected: isSelected(option.id) }"
                  @click="handleToggle(option.id)"
                >
                  <div class="option-name">{{ option.name }}</div>
                  <div class="option-desc" style="font-size: 0.75rem; color: var(--text-secondary);">{{ option.description }}</div>
                  <div class="option-price" v-if="option.price !== 0">{{ option.price > 0 ? '+' : '-' }} {{ formatPrice(Math.abs(option.price)) }}</div>
                </div>
              </div>
            </div>

            <!-- Optional Certifications -->
            <div style="grid-column: span 2;">
              <label class="config-code-label">Optional Certifications</label>
              <div class="options-grid spec-grid" style="grid-template-columns: 1fr 1fr;">
                 <div 
                  v-for="option in getOptions('cert').filter(o => isAvailable(o.id))" 
                  :key="option.id"
                  class="glass-card option-card small-card"
                  :class="{ selected: isSelected(option.id) }"
                  @click="handleToggle(option.id)"
                >
                  <div class="option-name">{{ option.name }}</div>
                  <div class="option-desc" style="font-size: 0.75rem; color: var(--text-secondary);">{{ option.description }}</div>
                  <div class="option-price" v-if="option.price > 0">+ {{ formatPrice(option.price) }}</div>
                </div>
              </div>
            </div>

            <!-- Advanced Configuration (Blue Label Only) -->
            <template v-if="isSelected('f-blue')">
              <div style="grid-column: span 2;">
                <label class="config-code-label">Advanced: Chassis</label>
                <div class="options-grid spec-grid" style="grid-template-columns: 1fr 1fr;">
                   <div 
                    v-for="option in getOptions('chassis').filter(o => isAvailable(o.id))" 
                    :key="option.id"
                    class="glass-card option-card small-card"
                    :class="{ selected: isSelected(option.id) }"
                    @click="handleToggle(option.id)"
                  >
                    <div class="option-name">{{ option.name }}</div>
                    <div class="option-desc" style="font-size: 0.75rem; color: var(--text-secondary);">{{ option.description }}</div>
                    <div class="option-price" v-if="option.price > 0">+ {{ formatPrice(option.price) }}</div>
                  </div>
                </div>
              </div>

              <div style="grid-column: span 2;">
                <label class="config-code-label">Advanced: Arm Configuration</label>
                <div class="options-grid spec-grid" style="grid-template-columns: 1fr 1fr;">
                   <div 
                    v-for="option in getOptions('arm').filter(o => isAvailable(o.id))" 
                    :key="option.id"
                    class="glass-card option-card small-card"
                    :class="{ selected: isSelected(option.id) }"
                    @click="handleToggle(option.id)"
                  >
                    <div class="option-name">{{ option.name }}</div>
                    <div class="option-desc" style="font-size: 0.75rem; color: var(--text-secondary);">{{ option.description }}</div>
                    <div class="option-price" v-if="option.price > 0">+ {{ formatPrice(option.price) }}</div>
                  </div>
                </div>
              </div>
            </template>

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
            <span class="total-price">{{ formatPrice(totalPrice) }}</span>
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
  height: 400px;
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
}

.preview-card:hover .machine-preview-img {
  transform: scale(1.05);
}

.preview-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
}

.badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.advanced-badge {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: black;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
}

.machine-name-display {
  margin-top: 1.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.05);
}

.total-price {
  background: linear-gradient(135deg, var(--accent-primary), #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
}
</style>
