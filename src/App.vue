<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ConfiguratorLogic, type Configuration } from './logic/configurator';
import StandardConfigurator from './components/StandardConfigurator.vue';
import BlueLabelConfigurator from './components/BlueLabelConfigurator.vue';
import AccessoriesConfigurator from './components/AccessoriesConfigurator.vue';
import CartView from './components/CartView.vue';

const logic = new ConfiguratorLogic();

interface CartItem {
  id: string;
  machineConfig: Configuration;
  quantity: number;
  accessories: Record<string, number>;
}

const currentModelId = ref<string | null>(null);
const currentView = ref<'catalog' | 'machine' | 'accessories' | 'cart'>('catalog');
const configOptions = ref<Record<string, string | number | boolean>>({});
const cart = ref<CartItem[]>([]);
const editingItemId = ref<string | null>(null);
const activeCartItemId = ref<string | null>(null);


// Initialize models
const models = computed(() => logic.getModels());

const handleModelSelect = (modelId: string) => {
  currentModelId.value = modelId;
  currentView.value = 'machine';
  // Reset options to defaults for this model
  const initialConfig = logic.createInitialConfig(modelId);
  configOptions.value = initialConfig.options;
  editingItemId.value = null;
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
    currentView.value = 'catalog';
    configOptions.value = {};
};

const handleResetOptions = () => {
    if (!currentModelId.value) return;
    const initialConfig = logic.createInitialConfig(currentModelId.value);
    configOptions.value = initialConfig.options;
};

// Persistence
const saveCart = () => {
    localStorage.setItem('flacktek_cart', JSON.stringify(cart.value));
};

const handleAddToCart = () => {
  if (!currentModelId.value) return;

  const machineConfig: Configuration = {
    modelId: currentModelId.value,
    options: { ...configOptions.value }
  };

  if (editingItemId.value) {
    const index = cart.value.findIndex(item => item.id === editingItemId.value);
    if (index !== -1) {
      cart.value[index]!.machineConfig = machineConfig;
    }
    editingItemId.value = null;
  } else {
    // Check for identical configuration to merge
    const existingIndex = cart.value.findIndex(item => {
        return item.machineConfig.modelId === machineConfig.modelId && 
               JSON.stringify(item.machineConfig.options) === JSON.stringify(machineConfig.options);
    });

    if (existingIndex !== -1) {
        cart.value[existingIndex]!.quantity += 1;
    } else {
        cart.value.push({
          id: crypto.randomUUID(),
          machineConfig,
          quantity: 1,
          accessories: {}
        });
    }
  }

  saveCart();
  currentView.value = 'cart';
};

const handleManageAccessories = (itemId: string) => {
    const item = cart.value.find(i => i.id === itemId);
    if (item) {
        activeCartItemId.value = itemId;
        currentModelId.value = item.machineConfig.modelId;
        configOptions.value = { ...item.accessories };
        currentView.value = 'accessories';
    }
};

const handleUpdateAccessories = (data: { optionId: string, value: any }) => {
    if (activeCartItemId.value) {
        const item = cart.value.find(i => i.id === activeCartItemId.value);
        if (item) {
            if (data.value === false || data.value === 0) {
                delete item.accessories[data.optionId];
            } else {
                item.accessories[data.optionId] = data.value;
            }
            configOptions.value = { ...item.accessories };
            saveCart();
        }
    }
};

const handleCompleteAccessories = () => {
    activeCartItemId.value = null;
    currentView.value = 'cart';
};

const handleRemoveFromCart = (itemId: string) => {
  cart.value = cart.value.filter(item => item.id !== itemId);
  saveCart();
};

const handleUpdateCartQuantity = (itemId: string, delta: number) => {
    const item = cart.value.find(i => i.id === itemId);
    if (item) {
        item.quantity = Math.max(0, item.quantity + delta);
        if (item.quantity === 0) {
            handleRemoveFromCart(itemId);
        } else {
            saveCart();
        }
    }
};

const handleUpdateCartOption = (itemId: string, optionId: string, delta: number) => {
    const item = cart.value.find(i => i.id === itemId);
    if (item) {
        const val = item.accessories[optionId];
        let currentQty = 0;
        if (typeof val === 'number') currentQty = val;
        else if (val === true) currentQty = 1;
        
        const nextQty = Math.max(0, currentQty + delta);
        if (nextQty === 0) {
            delete item.accessories[optionId];
        } else {
            item.accessories[optionId] = nextQty;
        }
        saveCart();
    }
};

const handleEditCartItem = (itemId: string) => {
  const item = cart.value.find(i => i.id === itemId);
  if (item) {
    currentModelId.value = item.machineConfig.modelId;
    configOptions.value = { ...item.machineConfig.options };
    editingItemId.value = itemId;
    currentView.value = 'machine';
  }
};

const handleNewMachine = () => {
  currentModelId.value = null;
  configOptions.value = {};
  editingItemId.value = null;
  currentView.value = 'catalog';
};

const totalItems = computed(() => {
    return cart.value.reduce((sum, item) => sum + item.quantity, 0);
});

const activeCartItem = computed(() => {
    if (!activeCartItemId.value) return null;
    return cart.value.find(i => i.id === activeCartItemId.value) || null;
});

onMounted(() => {
    const saved = localStorage.getItem('flacktek_cart');
    if (saved) {
        try {
            cart.value = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load cart', e);
        }
    }
});
</script>

<template>
  <div class="container fade-in">
    <header class="app-nav">
      <div class="nav-content">
        <div class="logo">
          <h1>FlackTek Configurator</h1>
        </div>
        <nav class="nav-links">
          <button @click="currentView = 'catalog'" :class="{ active: currentView === 'catalog' }">Catalog</button>
          <button @click="currentView = 'cart'" :class="{ active: currentView === 'cart' }">
            Cart 
            <span v-if="totalItems > 0" class="cart-badge">{{ totalItems }}</span>
          </button>
        </nav>
      </div>
    </header>

    <div class="view-container">
      <template v-if="currentView === 'catalog'">
        <div class="catalog-view fade-in">
          <h2 class="category-title">Select a Machine</h2>
          <p class="step-desc">Choose the base model to start your configuration.</p>
          <div class="options-grid">
            <div 
              v-for="model in models" 
              :key="model.id" 
              class="glass-card option-card horizontal-card"
              @click="handleModelSelect(model.id)"
            >
              <div class="option-info">
                <div class="option-name">{{ model.label }}</div>
                <div class="option-desc">{{ model.description }}</div>
                <div class="option-price">Starting at {{ new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(model.price || 0) }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="currentView === 'cart'">
        <CartView 
          :cart="cart" 
          :logic="logic" 
          @edit="handleEditCartItem" 
          @remove="handleRemoveFromCart"
          @update-quantity="handleUpdateCartQuantity"
          @update-option="handleUpdateCartOption"
          @manage-accessories="handleManageAccessories"
          @new-machine="handleNewMachine"
        />
      </template>

      <template v-else-if="currentModelId === 'blue_label'">
          <BlueLabelConfigurator 
              v-if="currentView === 'machine'"
              :logic="logic"
              :models="models"
              :current-model-id="currentModelId"
              :config-options="configOptions"
              @option-change="handleOptionChange"
              @reset="handleReset"
              @reset-options="handleResetOptions"
              @continue="handleAddToCart"
          />
          <AccessoriesConfigurator
              v-else-if="currentView === 'accessories' && currentModelId"
              :logic="logic"
              :current-model-id="currentModelId"
              :machine-config="activeCartItem?.machineConfig"
              :config-options="configOptions"
              @option-change="handleUpdateAccessories"
              @back="handleCompleteAccessories"
              @complete="handleCompleteAccessories"
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
              @continue="handleAddToCart"
          />
          <AccessoriesConfigurator
              v-else-if="currentView === 'accessories' && currentModelId"
              :logic="logic"
              :current-model-id="currentModelId!"
              :machine-config="activeCartItem?.machineConfig"
              :config-options="configOptions"
              @option-change="handleUpdateAccessories"
              @back="handleCompleteAccessories"
              @complete="handleCompleteAccessories"
          />
      </template>
    </div>
  </div>
</template>

<style>
/* App Navigation Styles */
.app-nav {
  border-bottom: 1px solid var(--border-glass);
  background: rgba(10, 12, 16, 0.8);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 1rem 0;
  margin-bottom: 2rem;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo h1 {
  font-size: 1.25rem;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-links button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0;
  transition: color 0.2s;
  position: relative;
}

.nav-links button:hover, .nav-links button.active {
  color: var(--text-primary);
}

.nav-links button.active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--accent-primary);
}

.cart-badge {
  background: var(--accent-primary);
  color: #000;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 4px;
  vertical-align: middle;
}

.view-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem 4rem;
}

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
