<script setup lang="ts">
import {  } from 'vue';
import { type ConfiguratorLogic, type Configuration, type CatalogOption } from '../logic/configurator';
import ConfigurationSummary from './ConfigurationSummary.vue';

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
    specs: ['model_variant', 'voltage', 'basket', 'weight_options_standard', 'chassis'],
    certifications: ['ul_cert', 'ce_cert', 'c1d2'],
    advanced: ['adjustable_arm', 'robot_ready', 'automatic_lid', 'remote_safety', 'remote_operation', 'low_speed', 'high_power', 'temp_monitoring', 'echo_mode'],
    support: ['fap_standard', 'fap_gold', 'fap_platinum', 'fap_warranty_years'],
    vacuum_pumps: ['vacuum_pump_65', 'vacuum_pump_100', 'vacuum_pump_175'],
    accessories: ['medium_cart', 'mobile_stand_medium_plus', 'aux_box', 'label_printer']
};

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const getVariantDelta = (val: string | number | boolean) => {
    if (!props.currentModelId) return 0;
    const defaultPrice = props.logic.getModelBasePrice(props.currentModelId);
    const variantPrice = props.logic.getModelBasePrice(props.currentModelId, String(val));
    return variantPrice - defaultPrice;
};
</script>

<template>
    <div class="configurator-grid">
        <main>

            <!-- Step 1: Machine Family -->
            <section class="category-section">
                <h2 class="category-title">Step 1: Select Machine Family</h2>
                <div class="options-grid">
                    <div v-for="model in models" :key="model.id" class="glass-card option-card"
                        :class="{ selected: currentModelId === model.id }" @click="handleModelSelect(model.id)">
                        <div class="option-name">{{ model.label }}</div>
                        <div class="option-desc">{{ model.description }}</div>
                        <div class="option-price">{{ formatPrice(logic.getModelBasePrice(model.id)) }}</div>
                    </div>
                </div>
            </section>

            <!-- Step 2: Specs -->
            <section class="category-section" v-if="currentModelId">
                <h2 class="category-title">Step 2: Specifications</h2>
                <div class="glass-card Specs-Container"
                    style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">

                    <div v-for="optId in uiGroups.specs" :key="optId" style="grid-column: span 1;">
                        <template
                            v-if="logic.getOption(optId) && getAllowed(optId).length > 0 && (optId !== 'chassis' || getAllowed(optId).length > 1)">
                            <label class="config-code-label">{{ getOptionLabel(optId) }}</label>
                            <div class="options-grid spec-grid"
                                style="grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));">
                                <div v-for="val in getAllowed(optId)" :key="String(val)"
                                    class="glass-card option-card horizontal-layout small-card" :class="{
                                        selected: isSelected(optId, val),
                                        disabled: !isAvailable(optId, val)
                                    }" @click="handleOptionChange(optId, val)">
                                    <div class="option-info">
                                        <div class="option-name">{{ formatValue(logic.getOption(optId)!, val) }}</div>
                                        <div class="option-price-hint"
                                            v-if="optId === 'model_variant' && getVariantDelta(val) !== 0"
                                            style="white-space: nowrap;">
                                            {{ getVariantDelta(val) > 0 ? '+ ' : '− ' }}{{
                                            formatPrice(Math.abs(getVariantDelta(val))) }}
                                        </div>
                                        <div class="option-price-hint" v-else-if="logic.getOptionPrice(optId, val) > 0">
                                            +{{ formatPrice(logic.getOptionPrice(optId, val)) }}
                                        </div>
                                    </div>
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
                        <div v-if="logic.getOption(optId) && getAllowed(optId).includes(true)"
                            class="glass-card option-card horizontal-layout small-card"
                            :class="{ selected: isSelected(optId, true) }"
                            @click="handleOptionChange(optId, !configOptions[optId])">
                            <div class="option-info">
                                <div class="option-name">{{ getOptionLabel(optId) }}</div>
                                <div class="option-price-hint" v-if="logic.getOptionPrice(optId, true) > 0">
                                    +{{ formatPrice(logic.getOptionPrice(optId, true)) }}
                                </div>
                            </div>
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
                        <div v-if="logic.getOption(optId) && getAllowed(optId).includes(true)"
                            class="glass-card option-card horizontal-layout small-card" :class="{
                                selected: isSelected(optId, true),
                                disabled: !isAvailable(optId, true)
                            }" @click="isAvailable(optId, true) && handleOptionChange(optId, !configOptions[optId])">
                            <div class="option-info">
                                <div class="option-name">{{ getOptionLabel(optId) }}</div>
                                <div class="option-price-hint" v-if="logic.getOptionPrice(optId, true) > 0">
                                    +{{ formatPrice(logic.getOptionPrice(optId, true)) }}
                                </div>
                            </div>
                            <div class="custom-checkbox" :class="{ checked: isSelected(optId, true) }"></div>
                        </div>
                    </template>
                </div>
            </section>

            <!-- Support -->
            <section class="category-section" v-if="currentModelId">
                <h2 class="category-title">Support & Protection</h2>
                <div class="options-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
                    <template v-for="optId in uiGroups.support" :key="optId">
                        <div v-if="logic.getOption(optId) && (logic.getOption(optId)!.type === 'boolean' ? getAllowed(optId).includes(true) : getAllowed(optId).length > 0)"
                            class="glass-card option-card horizontal-layout small-card" 
                            :class="{ 
                                selected: logic.getOption(optId)!.type === 'boolean' ? !!configOptions[optId] : false,
                                disabled: !isAvailable(optId, logic.getOption(optId)!.type === 'boolean' ? true : (getAllowed(optId)[0] ?? ''))
                            }"
                            @click="logic.getOption(optId)!.type === 'boolean' ? handleOptionChange(optId, !configOptions[optId]) : null"
                        >
                            <div class="option-info">
                                <div class="option-name">{{ getOptionLabel(optId) }}</div>
                                <div class="option-price-hint" v-if="logic.getOption(optId)!.type === 'boolean' && logic.getOptionPrice(optId, true) > 0">
                                    +{{ formatPrice(logic.getOptionPrice(optId, true)) }}
                                </div>
                                <div v-if="logic.getOption(optId)!.type === 'enum' || logic.getOption(optId)!.type === 'index'" class="mt-2">
                                    <select 
                                        :value="configOptions[optId]" 
                                        @change="handleOptionChange(optId, ($event.target as HTMLSelectElement).value)"
                                        class="custom-select"
                                        style="margin-top: 0;"
                                    >
                                        <option v-for="val in getAllowed(optId)" :key="String(val)" :value="val">
                                            {{ val }} {{ optId === 'fap_warranty_years' ? (val === 1 ? 'Year' : 'Years') : '' }}
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div v-if="logic.getOption(optId)!.type === 'boolean'" class="custom-checkbox" :class="{ checked: isSelected(optId, true) }"></div>
                        </div>
                    </template>
                </div>
            </section>

            <!-- Vacuum Pumps -->
            <section class="category-section" v-if="currentModelId && configOptions['vacuum']">
                <h2 class="category-title">Vacuum Pumps</h2>
                <div class="options-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                    <template v-for="optId in uiGroups.vacuum_pumps" :key="optId">
                        <div v-if="logic.getOption(optId) && isAvailable(optId, true)"
                            class="glass-card option-card horizontal-layout small-card"
                            :class="{ selected: isSelected(optId, true) }"
                            @click="handleOptionChange(optId, !configOptions[optId])"
                        >
                            <div class="option-info">
                                <div class="option-name">{{ getOptionLabel(optId) }}</div>
                                <div class="option-price-hint" v-if="logic.getOptionPrice(optId, true) > 0">
                                    +{{ formatPrice(logic.getOptionPrice(optId, true)) }}
                                </div>
                            </div>
                            <div class="custom-checkbox" :class="{ checked: isSelected(optId, true) }"></div>
                        </div>
                    </template>
                </div>
            </section>

            <!-- Accessories -->
            <section class="category-section" v-if="currentModelId">
                <h2 class="category-title">Options & Accessories</h2>
                <div class="options-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                    <template v-for="optId in uiGroups.accessories" :key="optId">
                        <div v-if="logic.getOption(optId) && isAvailable(optId, true)"
                            class="glass-card option-card horizontal-layout small-card"
                            :class="{ selected: isSelected(optId, true) }"
                            @click="handleOptionChange(optId, !configOptions[optId])"
                        >
                            <div class="option-info">
                                <div class="option-name">{{ getOptionLabel(optId) }}</div>
                                <div class="option-price-hint" v-if="logic.getOptionPrice(optId, true) > 0">
                                    +{{ formatPrice(logic.getOptionPrice(optId, true)) }}
                                </div>
                            </div>
                            <div class="custom-checkbox" :class="{ checked: isSelected(optId, true) }"></div>
                        </div>
                    </template>
                </div>
            </section>

            <div class="step-nav-footer mt-4" v-if="currentModelId">
                <div style="flex-grow: 1;"></div>
                <button class="nav-btn next premium-btn" @click="emit('continue')">
                    Add to Cart
                    <span class="btn-arrow">→</span>
                </button>
            </div>

        </main>

        <aside class="summary-stick">
            <ConfigurationSummary v-if="currentModelId" :logic="logic"
                :config="{ modelId: currentModelId, options: configOptions }" />
        </aside>
    </div>
</template>

<style scoped>
.configurator-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 2rem;
}

main {
    flex: 1;
}

.summary-stick {
    position: sticky;
    top: 2rem;
}

.category-section {
    margin-bottom: 3rem;
}

.category-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: var(--text-primary);
}

.options-grid {
    display: grid;
    gap: 1rem;
}

.option-card {
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
}

.option-card.selected {
    border-color: var(--accent-primary);
    background: rgba(var(--accent-primary-rgb), 0.1);
}

.option-name {
    font-weight: 700;
    margin-bottom: 0.2rem;
}

.option-info {
    flex: 1;
}

.option-price-hint {
    font-family: 'JetBrains Mono', monospace;
    color: var(--accent-primary);
    font-size: 0.8rem;
    font-weight: 700;
}

.horizontal-layout {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.small-card {
    padding: 1rem;
}

.nav-btn {
    padding: 1rem 2rem;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.premium-btn {
    background: linear-gradient(135deg, var(--accent-primary) 0%, #2980b9 100%);
    color: white;
}

.premium-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(var(--accent-primary-rgb), 0.4);
}

.btn-arrow {
    margin-left: 0.5rem;
}

.mt-4 {
    margin-top: 2rem;
}

.step-nav-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
