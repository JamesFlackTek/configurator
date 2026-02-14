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

const getMachineSummary = (item: CartItem) => {
    const config = item.machineConfig;
    const options = config.options;
    const summary: string[] = [];

    // 1. Voltage
    if (options.voltage) summary.push(`${options.voltage}V`);

    // 2. Vacuum & Pumps
    if (options.vacuum) {
        const pump = props.logic.getMachineOptions().find(opt => 
            opt.group === 'vacuum_pumps' && options[opt.id] === true
        );
        if (pump) {
            const match = pump.display_name.match(/(\d+\s*L\/min)/);
            summary.push(`Vacuum (${match ? match[0] : pump.display_name})`);
        } else {
            summary.push('Vacuum Ready');
        }
    }

    // 3. Certifications & Compliance
    if (options.ul_cert) summary.push('UL Certified');
    if (options.c1d2) summary.push('C1D2');
    if (options.ce_cert) summary.push('CE');

    // 4. Support Plans
    if (options.fap_standard) summary.push('FAP Standard');
    if (options.fap_gold) summary.push('FAP Gold');
    if (options.fap_platinum) summary.push('FAP Platinum');
    if (options.fap_warranty_years) summary.push(`${options.fap_warranty_years}yr Warranty`);

    // 5. Carts / Stands & Mechanical
    if (options.medium_cart) summary.push('Medium Cart');
    if (options.mobile_stand_medium_plus) summary.push('Medium+ Cart');
    if (options.aux_box) summary.push('Aux Box');
    if (options.automatic_lid) summary.push('Auto Lid');
    if (options.robot_ready) summary.push('Robot Ready');
    if (options.industrialized) summary.push('Industrialized');
    if (options.adjustable_arm) summary.push('Adjustable Arm');

    // 6. Interface & Sensors
    if (options.temp_monitoring) summary.push('Temp Monitoring');
    if (options.remote_operation) summary.push('Remote Operation');
    if (options.echo_mode) summary.push('Echo Mode');
    if (options.label_printer) summary.push('Label Printer');

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
                            <h3 class="item-name">{{ logic.getConfigurationName(item.machineConfig) }}</h3>
                            <div class="item-code">Order Code: {{ logic.generateOrderCode(item.machineConfig) }}</div>
                                                        <!-- Machine Summary Details -->
                             <div class="machine-summary-tags mt-2">
                                 <span v-for="tag in getMachineSummary(item)" :key="tag" class="summary-tag">
                                     {{ tag }}
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
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 8px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
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
