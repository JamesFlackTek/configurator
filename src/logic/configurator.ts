import capabilitiesData from './capabilities.json';
import machineCatalogData from './machine_catalog.json';
import accessoriesCatalogData from './accessories_catalog.json';
import rulesData from './rules.json';
import blueLabelCapabilitiesData from './blue_label_capabilities.json';
import blueLabelRulesData from './blue_label_rules.json';

// --- Interfaces for JSON Data ---

export interface Capability {
    model_id: string;
    model_label: string;
    option_id: string;
    raw: string | number | boolean;
    allowed_values: (string | number | boolean)[];
}

export interface AccessoryRequirements {
    basket?: string[];
    min_weight?: string;
    max_weight?: string;
    chassis?: string[];
    options?: Record<string, string | number | boolean>;
}

export interface CatalogOption {
    id: string;
    display_name: string;
    type: 'enum' | 'boolean' | 'custom' | 'index';
    group: string;
    is_configurable: boolean;
    notes: string | null;
    requires?: AccessoryRequirements;
    price?: number;
    option_prices?: Record<string, number>;
}

export interface RuleCondition {
    option_id?: string;
    value?: string | number | boolean;
    values?: (string | number | boolean)[];
    model_id?: string;
}

export interface ModelMetadata {
    id: string;
    label: string;
    description: string;
    price?: number;
}

export interface RuleEffect {
    type: 'require' | 'exclude';
    option_id: string;
    value: string | number | boolean;
}

export interface Rule {
    rule_id: string;
    when: RuleCondition;
    effect: RuleEffect;
    reason: string;
}

// --- Configuration State ---

export interface Configuration {
    modelId: string | null;
    options: Record<string, string | number | boolean>; // optionId -> value
}

// --- Logic Class ---

export class ConfiguratorLogic {
    private capabilities: Capability[];
    private catalog: CatalogOption[];
    private machineCatalog: CatalogOption[];
    private accessoriesCatalog: CatalogOption[];
    private modelPrices: Record<string, Record<string, number>>;
    private modelMetadata: ModelMetadata[];
    private rules: Rule[];

    constructor() {
        this.capabilities = [
            ...capabilitiesData.capabilities,
            ...blueLabelCapabilitiesData.capabilities
        ] as Capability[];

        this.machineCatalog = machineCatalogData.options as CatalogOption[];
        this.modelMetadata = (machineCatalogData as any).models as ModelMetadata[];
        this.modelPrices = (machineCatalogData as any).model_prices || {};
        this.accessoriesCatalog = accessoriesCatalogData.accessories as CatalogOption[];

        this.catalog = [
            ...this.machineCatalog,
            ...this.accessoriesCatalog
        ];

        this.rules = [
            ...(rulesData.rules as unknown as Rule[]),
            ...(blueLabelRulesData.rules as unknown as Rule[])
        ];
    }

    // --- Model Management ---

    getModels(): ModelMetadata[] {
        return this.modelMetadata.map(model => ({
            ...model,
            price: this.getModelBasePrice(model.id)
        }));
    }


    public getModelBasePrice(id: string | null, variant?: string): number {
        if (!id) return 0;

        let targetVariant = variant;

        // If no variant provided, try to find a default one from capabilities
        if (!targetVariant) {
            const variantCap = this.capabilities.find(c => c.model_id === id && c.option_id === 'model_variant');
            if (variantCap && variantCap.allowed_values.length > 0) {
                targetVariant = variantCap.allowed_values[0] as string;
            }
        }

        // 1. Check for model+variant specific price from machine_catalog.json
        const pricesForModel = this.modelPrices[id];
        if (targetVariant && pricesForModel) {
            const price = pricesForModel[targetVariant];
            if (price !== undefined) return price;
        }

        // 2. Check if we have dynamic capability for base price
        const cap = this.capabilities.find(c => c.model_id === id && c.option_id === 'base_price');
        if (cap) return (cap.allowed_values[0] as number);

        // Fallback to hardcoded defaults if not in capabilities
        if (id === '330_100') return 12000;
        if (id === '515_200') return 15000;
        if (id.startsWith('1200')) return 25000;
        if (id.startsWith('1400')) return 32000;
        if (id.startsWith('2000')) return 45000;
        if (id.startsWith('2800')) return 65000;
        if (id === 'large_twin') return 80000;
        if (id === 'blue_label') return 85000;
        return 0;
    }

    public getConfigurationName(config: Configuration): string {
        if (!config.modelId) return 'Select Machine';

        const models = this.getModels();
        const model = models.find(m => m.id === config.modelId);
        if (!model) return 'Unknown FlackTek';

        let label = model.label;

        // Dynamic Weight Replacement
        if (config.modelId !== 'blue_label' && config.options['weight_options_standard']) {
            const weight = config.options['weight_options_standard'];
            label = label.replace(/XXX+/g, String(weight));
        }

        // Handle Variants
        const variant = config.options['model_variant'] as string || '';
        if (variant && variant !== 'Standard') {
            label += ` ${variant}`;
        }

        // Add VAC suffix
        if (config.options['vacuum'] === true && !variant.toUpperCase().includes('VAC')) {
            label += ' VAC';
        }

        return `FlackTek ${label}`;
    }

    public getMachineOptions(): CatalogOption[] {
        return this.machineCatalog;
    }

    // --- Option Management ---

    getOptionsByGroup(group: string): CatalogOption[] {
        return this.catalog.filter(opt => opt.group === group);
    }

    getAccessories(): CatalogOption[] {
        return this.accessoriesCatalog;
    }

    getOption(optionId: string): CatalogOption | undefined {
        return this.catalog.find(o => o.id === optionId);
    }

    getAllowedValues(modelId: string, optionId: string): (string | number | boolean)[] {
        // Find capability for this model and option
        // Note: Capabilities might have multiple entries for same model/option? 
        // Based on file, seems unique per model_id + option_id
        const cap = this.capabilities.find(c => c.model_id === modelId && c.option_id === optionId);
        if (!cap) return [];
        return cap.allowed_values;
    }

    // --- Configuration Actions ---

    createInitialConfig(modelId: string): Configuration {
        const config: Configuration = {
            modelId,
            options: {}
        };

        // Auto-select defaults
        // For each option available to this model, pick the first allowed value?
        // Or explicit defaults?
        // Let's pick first allowed value for required fields (non-boolean)
        // For boolean, default to false usually

        const catalogOpts = this.catalog;
        catalogOpts.forEach(opt => {
            const allowed = this.getAllowedValues(modelId, opt.id);
            if (allowed.length > 0) {
                if (opt.id === 'fap_standard') {
                    config.options[opt.id] = true;
                } else if (['fap_gold', 'fap_platinum'].includes(opt.id)) {
                    config.options[opt.id] = false;
                } else if (opt.id === 'fap_warranty_years') {
                    config.options[opt.id] = 1;
                } else if (opt.type === 'boolean') {
                    if (allowed.includes(false)) config.options[opt.id] = false;
                    else if (allowed.includes(true)) config.options[opt.id] = true;
                } else {
                    config.options[opt.id] = allowed[0]!;
                }
            }
        });

        return this.applyRules(config);
    }

    toggleOption(config: Configuration, optionId: string, value: string | number | boolean): Configuration {
        const option = this.getOption(optionId);
        const isSupport = option?.group === 'support';
        const isVacPump = option?.group === 'vacuum_pumps';

        // Allow support group (FAP tiers) to bypass availability check so they can be switched.
        if (!isSupport && !this.isOptionAvailable(config, optionId, value)) return config;

        const newOptions = { ...config.options };

        // Explicit mutual exclusion for support group (Standard, Gold, Platinum)
        if (isSupport && value === true) {
            this.getAccessories()
                .filter(acc => acc.group === 'support' && acc.id !== optionId && acc.type === 'boolean')
                .forEach(acc => {
                    newOptions[acc.id] = false;
                });
        }

        // Explicit mutual exclusion for vacuum pumps
        if (isVacPump && value === true) {
            this.getAccessories()
                .filter(acc => acc.group === 'vacuum_pumps' && acc.id !== optionId && acc.type === 'boolean')
                .forEach(acc => {
                    newOptions[acc.id] = false;
                });
        }

        newOptions[optionId] = value;

        const newConfig = {
            ...config,
            options: newOptions
        };

        return this.applyRules(newConfig);
    }

    // --- Rules Engine ---

    getTotalPrice(config: Configuration): number {
        let total = 0;

        // Base machine price
        const variant = config.options['model_variant'] as string || undefined;
        total += this.getModelBasePrice(config.modelId!, variant);

        // Option prices - use getOptionPrice for proper chassis-based pricing
        for (const [optionId, value] of Object.entries(config.options)) {
            const option = this.getOption(optionId);
            if (!option) continue;

            // Use getOptionPrice to handle chassis-based pricing and other special cases
            const itemPrice = this.getOptionPrice(optionId, value, config);

            if (option.type === 'boolean' && value === true) {
                total += itemPrice;
            } else if (option.type === 'enum' || option.type === 'index') {
                total += itemPrice;
            }
        }

        // Special logic for vacuum if it's not explicitly in the catalog with a price
        // (Removing the hardcoded 5000 if it's already covered by VAC variant or catalog price)
        if (config.options['vacuum'] === true && !this.getOption('vacuum')?.price && !config.options['model_variant']?.toString().includes('VAC')) {
            total += 5000;
        }

        return total;
    }

    public getOptionPrice(optionId: string, value?: string | number | boolean, config?: Configuration): number {
        const option = this.getOption(optionId);
        if (!option) return 0;

        let price = (option.price || 0);

        // Chassis-based pricing (for options like ul_cert)
        if (typeof price === 'object' && config) {
            let chassis = config.options['chassis'] as string;

            // For standard machines, determine chassis from model ID
            if (!chassis && config.modelId) {
                const modelId = config.modelId;
                if (modelId === '330_100' || modelId === '515_200') {
                    chassis = 'small';
                } else if (modelId === '1200_xxx' || modelId === '1400_xxxx' || modelId === '1200_xxx_twin') {
                    chassis = 'medium';
                } else if (modelId === '2000_xxxx' || modelId === '2800_1000' || modelId === '2800_xxxx' || modelId === 'large_twin') {
                    chassis = 'large';
                }
            }

            if (chassis && price[chassis] !== undefined) {
                price = price[chassis];
            } else {
                // Fallback to first available price if chassis not found
                price = Object.values(price)[0] as number || 0;
            }
        }

        // Value-based pricing for enums/indices
        if (option.option_prices && value !== undefined) {
            const valStr = String(value);
            if (option.option_prices[valStr] !== undefined) {
                price = option.option_prices[valStr];
            }
        }

        // Scaled FAP logic (requires config context)
        if (config && (optionId === 'fap_gold' || optionId === 'fap_platinum') && value === true) {
            const years = config.options['fap_warranty_years'] as number || 1;
            price *= years;
        }

        return price;
    }

    applyRules(config: Configuration): Configuration {
        let currentConfig = { ...config, options: { ...config.options } };

        // --- Custom logic for Vacuum-Variant integration ---
        // For non-Blue Label models, vacuum is part of the variant name (e.g., "Standard", "VAC", "Pro VAC")
        if (currentConfig.modelId && currentConfig.modelId !== 'blue_label') {
            const variant = (currentConfig.options['model_variant'] as string) || '';
            const shouldBeVac = variant.toUpperCase().includes('VAC');
            if (currentConfig.options['vacuum'] !== shouldBeVac) {
                currentConfig.options['vacuum'] = shouldBeVac;
            }
        }

        let changed = true;
        let iterations = 0;

        while (changed && iterations < 10) {
            changed = false;
            iterations++;

            // Pass 1: Catalog-level 'requires' (e.g. for accessories)
            for (const opt of this.catalog) {
                if (opt.requires && currentConfig.options[opt.id] === true) {
                    if (!this.isOptionAvailable(currentConfig, opt.id, true)) {
                        currentConfig.options[opt.id] = false;
                        changed = true;
                    }
                }
            }

            for (const rule of this.rules) {
                if (this.checkCondition(currentConfig, rule.when)) {
                    const effect = rule.effect;
                    const currentValue = currentConfig.options[effect.option_id];

                    if (effect.type === 'require') {
                        const isSatisfied = Array.isArray(effect.value)
                            ? effect.value.includes(currentValue as any)
                            : currentValue === effect.value;

                        if (!isSatisfied) {
                            currentConfig.options[effect.option_id] = Array.isArray(effect.value) ? effect.value[0] : effect.value;
                            changed = true;
                        }
                    } else if (effect.type === 'exclude') {
                        const isExcluded = Array.isArray(effect.value)
                            ? effect.value.includes(currentValue as any)
                            : currentValue === effect.value;

                        if (isExcluded) {
                            // If excluded value is selected, we need to switch it
                            if (typeof currentValue === 'boolean') {
                                // For boolean: flip (though boolean exclusion usually doesn't use arrays)
                                currentConfig.options[effect.option_id] = !currentValue;
                                changed = true;
                            } else {
                                // For enums/other: pick first allowed value that isn't excluded
                                const allowed = this.getAllowedValues(currentConfig.modelId!, effect.option_id);
                                const validAlt = allowed.find(v => this.isOptionAvailable(currentConfig, effect.option_id, v));
                                if (validAlt !== undefined) {
                                    currentConfig.options[effect.option_id] = validAlt;
                                } else {
                                    delete currentConfig.options[effect.option_id];
                                }
                                changed = true;
                            }
                        }
                    }
                }
            }
        }

        return currentConfig;
    }

    checkCondition(config: Configuration, condition: RuleCondition): boolean {
        // If model_id is specified, it must match
        if (condition.model_id) {
            if (Array.isArray(condition.model_id)) {
                if (!condition.model_id.includes(config.modelId as string)) return false;
            } else if (config.modelId !== condition.model_id) {
                return false;
            }
        }

        // If option_id/value are specified, they must match
        if (condition.option_id !== undefined && condition.value !== undefined) {
            const val = config.options[condition.option_id];
            if (Array.isArray(condition.value)) {
                return condition.value.includes(val as any);
            }
            return val === condition.value;
        }

        // If only model_id was provided (or nothing), and it passed, it's true
        return true;
    }

    validate(config: Configuration): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        for (const rule of this.rules) {
            if (rule.effect.type === 'require') {
                if (this.checkCondition(config, rule.when)) {
                    const currentValue = config.options[rule.effect.option_id];
                    const isSatisfied = Array.isArray(rule.effect.value)
                        ? rule.effect.value.includes(currentValue as any)
                        : currentValue === rule.effect.value;

                    if (!isSatisfied) {
                        errors.push(`Rule violation: ${rule.reason}`);
                    }
                }
            }
            if (rule.effect.type === 'exclude') {
                if (this.checkCondition(config, rule.when)) {
                    const currentValue = config.options[rule.effect.option_id];
                    const isExcluded = Array.isArray(rule.effect.value)
                        ? rule.effect.value.includes(currentValue as any)
                        : currentValue === rule.effect.value;

                    if (isExcluded) {
                        errors.push(`Rule violation: ${rule.reason}`);
                    }
                }
            }
        }
        return { valid: errors.length === 0, errors };
    }

    getConflictReasons(config: Configuration, optionId: string, value: string | number | boolean): string[] {
        const reasons: string[] = [];
        for (const rule of this.rules) {
            if (rule.effect.type === 'exclude' && rule.effect.option_id === optionId) {
                const isExcluded = Array.isArray(rule.effect.value)
                    ? rule.effect.value.includes(value as any)
                    : rule.effect.value === value;

                if (isExcluded && this.checkCondition(config, rule.when)) {
                    reasons.push(rule.reason);
                }
            }
        }
        return reasons;
    }

    isOptionAvailable(config: Configuration, optionId: string, value: string | number | boolean): boolean {
        // If it's a model-aware selection (not just boolean toggle)
        if (config.modelId) {
            const allowed = this.getAllowedValues(config.modelId, optionId);
            if (allowed.length > 0 && !allowed.includes(value)) return false;
        }

        // Check catalog-level requirements (e.g., for accessories)
        const option = this.getOption(optionId);
        if (option?.requires && value === true) {
            const req = option.requires;
            if (req.chassis && !req.chassis.includes(config.options['chassis'] as string)) return false;
            if (req.basket && !req.basket.includes(config.options['basket'] as string)) return false;
            if (req.min_weight && config.options['min_weight'] !== req.min_weight) return false;
            if (req.max_weight && config.options['max_weight'] !== req.max_weight) return false;

            if (req.options) {
                let anyMet = false;
                const entries = Object.entries(req.options);
                for (const [key, val] of entries) {
                    const currentVal = config.options[key];
                    if (Array.isArray(val)) {
                        if (val.includes(currentVal)) { anyMet = true; break; }
                    } else {
                        if (currentVal === val) { anyMet = true; break; }
                    }
                }
                if (!anyMet) return false;
            }
        }

        return this.getConflictReasons(config, optionId, value).length === 0;
    }

    generateProductCode(config: Configuration): string {
        if (!config.modelId) return '';

        const models = this.getModels();
        const modelIndex = models.findIndex(m => m.id === config.modelId);
        if (modelIndex === -1) return '';

        const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = 'P' + alphabet[modelIndex];

        this.machineCatalog.forEach(opt => {
            const allowed = this.getAllowedValues(config.modelId!, opt.id);
            const value = config.options[opt.id];

            if (value === undefined || value === null) {
                code += '.';
            } else {
                const valIndex = allowed.findIndex(v => v === value);
                if (valIndex === -1) {
                    code += '.';
                } else {
                    code += alphabet[valIndex] || '?';
                }
            }
        });

        return code;
    }

    generateOrderCode(config: Configuration): string {
        const productCode = this.generateProductCode(config);
        if (!productCode) return '';

        const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let accPart = '';

        this.accessoriesCatalog.forEach(opt => {
            const value = config.options[opt.id];
            if (opt.type === 'boolean') {
                accPart += value === true ? '1' : '0';
            } else {
                const allowed = this.getAllowedValues(config.modelId!, opt.id);
                const valIndex = allowed.findIndex(v => v === value);
                accPart += (valIndex === -1 ? '.' : alphabet[valIndex]);
            }
        });

        return `${productCode}-${accPart}`;
    }

    generateCode(config: Configuration): string {
        return this.generateOrderCode(config);
    }

    parseCode(code: string): Configuration | null {
        // Simple shim for now, might need more robust parsing if we strictly separate
        if (!code.startsWith('V2') && !code.startsWith('P')) return null;

        const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const models = this.getModels();

        const modelChar = code[1] === '2' ? code[2] : code[1];
        if (!modelChar) return null;
        const modelIndex = alphabet.indexOf(modelChar);
        if (modelIndex === -1 || !models[modelIndex]) return null;

        // This is a bit complex to parse mixed codes without more metadata
        // For now, let's keep generateCode/parseCode compatible with V2 if possible,
        // but the user wants "Product Code" and "Order Code".
        // I will stick to supporting V2 parsing for backward compatibility
        // and add a basic support for 'P' prefix.

        return null; // TODO: Implement robust parsing for P- codes if needed
    }



    getMachineImage(config: Configuration): string {
        const modelId = config.modelId;
        if (!modelId) return '';

        const isVac = config.options['vacuum'] === true;
        const variant = config.options['model_variant'] as string || '';

        // Small Models (330 / 515)
        if (modelId === '330_100' || modelId === '515_200') {
            const v = variant.toUpperCase();
            if (v.startsWith('L')) return '/images/Small 330-100 L.png';
            if (v.startsWith('SE')) return '/images/Small 330-100 SE.png';
            return '/images/Small 330-100 PRO.png';
        }

        // Mid-Range Single (1200 / 1400)
        if (modelId === '1200_xxx' || modelId === '1400_xxxx') {
            return isVac ? '/images/Medium Vac.png' : '/images/Medium.png';
        }

        // Mid-Range Twin / High Capacity (1200 Twin / 2000 / 2800)
        if (modelId === '1200_xxx_twin' || modelId === '2000_xxxx' || modelId === '2800_xxxx') {
            return isVac ? '/images/Medium Plus VAC.png' : '/images/Medium Plus.png';
        }

        // Large Twin
        if (modelId === 'large_twin') {
            return '/images/Large.png';
        }

        // Blue Label (Dynamic based on selected chassis)
        if (modelId === 'blue_label') {
            const chassis = config.options['chassis'] as string;
            if (chassis === 'Large') return '/images/Large.png';
            if (chassis === 'Medium +') return isVac ? '/images/Medium Plus VAC.png' : '/images/Medium Plus.png';
            // Default to Medium for any other chassis selection (e.g. Medium)
            return isVac ? '/images/Medium Vac.png' : '/images/Medium.png';
        }

        return '';
    }
}
