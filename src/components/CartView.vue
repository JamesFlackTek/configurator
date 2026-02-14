<script setup lang="ts">
import { computed } from 'vue';
import type { ConfiguratorLogic, Configuration } from '../logic/configurator';

interface CartItem {
  id: string;
  config: Configuration;
}

const props = defineProps<{
    cart: CartItem[];
    logic: ConfiguratorLogic;
}>();

const emit = defineEmits(['edit', 'remove', 'new-machine']);

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const cartTotal = computed(() => {
    return props.cart.reduce((total, item) => total + props.logic.getTotalPrice(item.config), 0);
});

const getItemName = (config: Configuration) => {
    return props.logic.getConfigurationName(config);
};

const getItemPrice = (config: Configuration) => {
    return props.logic.getTotalPrice(config);
};
</script>

<template>
    <div class="cart-view fade-in">
        <div class="cart-header">
            <h2 class="category-title">Your Cart</h2>
            <p class="step-desc">Review and manage your industrial mixing configurations.</p>
        </div>

        <div v-if="cart.length === 0" class="empty-cart-state glass-card">
            <div class="empty-icon">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Start by selecting a machine from the catalog.</p>
            <button class="primary-btn" @click="emit('new-machine')">Browse Catalog</button>
        </div>

        <div v-else class="cart-content">
            <div class="cart-items-list">
                <div v-for="item in cart" :key="item.id" class="glass-card cart-item">
                    <div class="item-main">
                        <div class="item-details">
                            <h3 class="item-name">{{ getItemName(item.config) }}</h3>
                            <div class="item-code">Order Code: {{ logic.generateOrderCode(item.config) }}</div>
                            <div class="item-summary-preview">
                                {{ Object.keys(item.config.options).length }} options configured
                            </div>
                        </div>
                        <div class="item-price-section">
                            <div class="item-price">{{ formatPrice(getItemPrice(item.config)) }}</div>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="action-btn edit" @click="emit('edit', item.id)">Edit</button>
                        <button class="action-btn remove" @click="emit('remove', item.id)">Remove</button>
                    </div>
                </div>
            </div>

            <aside class="cart-summary-sidebar">
                <div class="glass-card cart-total-card">
                    <h3>Cart Summary</h3>
                    <div class="summary-row">
                        <span>Items ({{ cart.length }})</span>
                        <span>{{ formatPrice(cartTotal) }}</span>
                    </div>
                    <div class="summary-row total">
                        <span>Grand Total</span>
                        <span class="total-amount">{{ formatPrice(cartTotal) }}</span>
                    </div>
                    <button class="primary-btn checkout-btn">Proceed to Quote Request</button>
                    <button class="secondary-btn add-more-btn" @click="emit('new-machine')">
                        + Add Another Machine
                    </button>
                </div>
            </aside>
        </div>
    </div>
</template>

<style scoped>
.cart-view {
    max-width: 1000px;
    margin: 0 auto;
}

.cart-header {
    margin-bottom: 2rem;
}

.cart-content {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 2rem;
}

.cart-items-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.cart-item {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.item-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.item-name {
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
    color: var(--text-primary);
}

.item-code {
    font-family: monospace;
    font-size: 0.8rem;
    color: var(--accent-primary);
    background: rgba(88, 166, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
    margin-bottom: 0.5rem;
}

.item-summary-preview {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.item-price {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
}

.item-actions {
    display: flex;
    gap: 1rem;
    border-top: 1px solid var(--border-glass);
    padding-top: 1rem;
}

.action-btn {
    background: none;
    border: 1px solid var(--border-glass);
    color: var(--text-primary);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
}

.action-btn:hover {
    background: var(--bg-secondary);
}

.action-btn.remove:hover {
    border-color: var(--danger);
    color: var(--danger);
}

.cart-total-card {
    position: sticky;
    top: 6rem;
    padding: 1.5rem;
}

.cart-total-card h3 {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
    font-size: 0.95rem;
}

.summary-row.total {
    border-top: 2px solid var(--border-glass);
    margin-top: 1rem;
    padding-top: 1rem;
    font-weight: 700;
    font-size: 1.2rem;
}

.total-amount {
    color: var(--accent-primary);
}

.primary-btn {
    width: 100%;
    background: var(--accent-primary);
    color: #000;
    border: none;
    padding: 1rem;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 1rem;
    transition: transform 0.2s;
}

.primary-btn:hover {
    transform: translateY(-2px);
}

.secondary-btn {
    width: 100%;
    background: none;
    border: 1px solid var(--accent-primary);
    color: var(--accent-primary);
    padding: 0.8rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 1rem;
    transition: all 0.2s;
}

.secondary-btn:hover {
    background: rgba(88, 166, 255, 0.1);
}

.empty-cart-state {
    text-align: center;
    padding: 4rem 2rem;
}

.empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
}

@media (max-width: 800px) {
    .cart-content {
        grid-template-columns: 1fr;
    }
}
</style>
