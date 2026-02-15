<script setup lang="ts">
import { computed } from 'vue';
import type { ConfiguratorLogic, Configuration } from '../logic/configurator';

interface CartItem {
  id: string;
  machineConfig: Configuration;
  quantity: number;
  accessories: Record<string, number>;
}

const props = defineProps<{
    cart: CartItem[];
    logic: ConfiguratorLogic;
}>();

const emit = defineEmits(['edit', 'remove', 'new-machine', 'update-quantity', 'update-option', 'manage-accessories']);

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const cartTotal = computed(() => {
    return props.cart.reduce((total, item) => {
        const machinePrice = props.logic.getTotalPrice(item.machineConfig);
        let accTotal = 0;
        for (const [accId, val] of Object.entries(item.accessories)) {
            const price = props.logic.getOptionPrice(accId, val, item.machineConfig);
            const multiplier = typeof val === 'number' ? val : 1;
            accTotal += price * multiplier;
        }
        return total + ((machinePrice + accTotal) * item.quantity);
    }, 0);
});

const getSelectedAccessories = (item: CartItem) => {
    return props.logic.getAccessories().filter(acc => {
        return item.accessories[acc.id] !== undefined;
    });
};

const getOptionQuantity = (item: CartItem, optionId: string) => {
    return item.accessories[optionId] || 0;
};

// SVG Icon Definitions
const ICONS = {
    power: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    support: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    sensors: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
    vacuum: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`,
    cart: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
    robot: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/><path d="M9 11V9a3 3 0 0 1 6 0v2"/></svg>`,
    industrial: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 20h5v-2a3 3 0 0 0-5.34-1.63M2 20h5v-2a3 3 0 0 1 5.34-1.63m-9-9.27c.56.01 1.05.3 1.36.74A3 3 0 1 0 8 11.27m5.34-1.63c.56.01 1.05.3 1.36.74A3 3 0 1 0 19 11.27"/><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
};

const getMachineSummary = (item: CartItem) => {
    const config = item.machineConfig;
    const options = config.options;
    const summary: { text: string; icon: keyof typeof ICONS }[] = [];

    // 1. Voltage
    if (options.voltage) summary.push({ text: `${options.voltage}V`, icon: 'power' });

    // 2. Vacuum & Pumps
    if (options.vacuum) {
        summary.push({ text: 'Vacuum System', icon: 'vacuum' });
    }

    // 3. Certifications & Compliance
    if (options.ul_cert) summary.push({ text: 'UL Certified', icon: 'shield' });
    if (options.c1d2) summary.push({ text: 'C1D2', icon: 'shield' });
    if (options.ce_cert) summary.push({ text: 'CE', icon: 'shield' });

    // 4. Support Plans
    if (options.fap_standard || options.fap_gold || options.fap_platinum) {
        const text = options.fap_gold ? 'FAP Gold' : options.fap_platinum ? 'FAP Platinum' : 'FAP Standard';
        summary.push({ text, icon: 'support' });
    }
    if (options.fap_warranty_years) summary.push({ text: `${options.fap_warranty_years}yr Warranty`, icon: 'calendar' });

    // 5. Carts / Stands & Mechanical
    if (options.medium_cart || options.mobile_stand_medium_plus) summary.push({ text: 'Industrial Stand', icon: 'cart' });
    if (options.automatic_lid) summary.push({ text: 'Auto Lid', icon: 'settings' });
    if (options.robot_ready) summary.push({ text: 'Robot Ready', icon: 'robot' });
    if (options.industrialized) summary.push({ text: 'Industrialized', icon: 'settings' });

    // 6. Interface & Sensors
    if (options.temp_monitoring || options.remote_operation || options.echo_mode || options.label_printer) {
        summary.push({ text: 'Advanced Sensors', icon: 'sensors' });
    }

    return summary;
};
</script>

<template>
    <div class="cart-view fade-in">
        <div class="cart-header">
            <h2 class="category-title">Your Cart</h2>
            <p class="step-desc">Review and manage your industrial mixing configurations.</p>
        </div>

        <div v-if="cart.length === 0" class="empty-cart-state glass-card">
            <div class="empty-cart-container fade-in">
            <div class="empty-cart-visual">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
            </div>
            <h3>Your cart is empty</h3>
            <p>Start by selecting a machine from our catalog to begin your custom configuration.</p>
            <button class="primary-btn browse-btn" @click="emit('new-machine')">Browse Catalog</button>
        </div>
        </div>

        <div v-else class="cart-content">
            <div class="cart-items-list">
                <TransitionGroup name="list">
                <div v-for="item in cart" :key="item.id" class="glass-card cart-item">
                    <div class="item-main">
                        <div class="item-details">
                            <h3 class="item-name">{{ logic.getConfigurationName(item.machineConfig) }}</h3>
                            <div class="item-code">Order Code: {{ logic.generateOrderCode(item.machineConfig) }}</div>
                                                        <!-- Machine Summary Details -->
                             <div class="machine-summary-tags mt-2">
                                 <span v-for="tag in getMachineSummary(item)" :key="tag.text" class="summary-tag">
                                     <span class="tag-icon" v-html="ICONS[tag.icon]"></span>
                                     <span class="tag-text">{{ tag.text }}</span>
                                 </span>
                             </div>

                             <!-- Machine Quantity Selector -->
                             <div class="machine-quantity-row mt-3">
                                 <span class="label">Quantity:</span>
                                 <div class="quantity-controls small">
                                     <button class="qty-btn" @click="emit('update-quantity', item.id, -1)">-</button>
                                     <span class="qty-value">{{ item.quantity }}</span>
                                     <button class="qty-btn" @click="emit('update-quantity', item.id, 1)">+</button>
                                 </div>
                             </div>
                        </div>
                        <div class="item-price-section">
                            <div class="item-price">{{ formatPrice(logic.getTotalPrice(item.machineConfig) * item.quantity) }}</div>
                            <div v-if="item.quantity > 1" class="unit-price-hint">
                                {{ formatPrice(logic.getTotalPrice(item.machineConfig)) }} each
                            </div>
                        </div>
                    </div>

                    <!-- Accessories Breakdown -->
                    <div class="item-accessories-breakdown" v-if="getSelectedAccessories(item).length > 0">
                        <div class="breakdown-header">Included Accessories</div>
                        <div v-for="acc in getSelectedAccessories(item)" :key="acc.id" class="accessory-line">
                            <span class="acc-name">{{ acc.display_name }}</span>
                            <div class="acc-actions">
                                <div class="quantity-controls x-small">
                                    <button class="qty-btn" @click="emit('update-option', item.id, acc.id, -1)">-</button>
                                    <span class="qty-value">{{ getOptionQuantity(item, acc.id) }}</span>
                                    <button class="qty-btn" @click="emit('update-option', item.id, acc.id, 1)">+</button>
                                </div>
                                <span class="acc-price">{{ formatPrice(logic.getOptionPrice(acc.id, item.accessories[acc.id], item.machineConfig) * getOptionQuantity(item, acc.id)) }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="item-actions">
                        <button class="action-btn accessories" @click="emit('manage-accessories', item.id)">Manage Accessories</button>
                        <button class="action-btn edit" @click="emit('edit', item.id)">Rebuild Machine</button>
                        <button class="action-btn remove" @click="emit('remove', item.id)">Remove</button>
                    </div>
                </div>
                </TransitionGroup>
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
    border-color: #ff4d4d;
    color: #ff4d4d;
}

.machine-quantity-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.unit-price-hint {
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-align: right;
}

.machine-summary-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
}

.summary-tag {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.03);
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.summary-tag:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--accent-primary);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.tag-icon {
    display: flex;
    align-items: center;
    color: var(--accent-primary);
    opacity: 0.9;
}

.mt-3 {
    margin-top: 0.75rem;
}

.item-accessories-breakdown {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 1rem;
    margin-top: 0.5rem;
}

.breakdown-header {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent-primary);
    margin-bottom: 0.75rem;
    font-weight: 700;
}

.accessory-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.accessory-line:last-child {
    border-bottom: none;
}

.acc-name {
    font-size: 0.9rem;
    color: var(--text-primary);
}

.acc-actions {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.acc-price {
    font-family: monospace;
    font-size: 0.9rem;
    color: var(--text-primary);
    min-width: 80px;
    text-align: right;
}

/* Shareable Quantity Controls */
.quantity-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(0,0,0,0.2);
    padding: 0.25rem;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.1);
}

.quantity-controls.small {
    padding: 0.15rem;
}

.quantity-controls.x-small {
    padding: 0.1rem;
    gap: 0.4rem;
}

.qty-btn {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: none;
    background: rgba(255,255,255,0.1);
    color: white;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    line-height: 1;
}

.quantity-controls.x-small .qty-btn {
    width: 20px;
    height: 20px;
    font-size: 0.8rem;
}

.qty-btn:hover {
    background: var(--accent-primary);
    color: black;
}

.qty-value {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 1rem;
}

.quantity-controls.x-small .qty-value {
    font-size: 0.85rem;
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
    padding: 6rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    grid-column: 1 / -1;
}

.empty-cart-visual {
    width: 120px;
    height: 120px;
    background: rgba(88, 166, 255, 0.05);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
    border: 1px solid rgba(88, 166, 255, 0.1);
    box-shadow: 0 0 30px rgba(88, 166, 255, 0.05);
}

.empty-icon {
    width: 50px;
    height: 50px;
    color: var(--accent-primary);
    opacity: 0.8;
}

.browse-btn {
    max-width: 240px;
}

/* List Animations */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-move {
  transition: transform 0.5s ease;
}

@media (max-width: 800px) {
    .cart-content {
        grid-template-columns: 1fr;
    }
}
</style>
