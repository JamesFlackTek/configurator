import capabilitiesData from './capabilities.json';
import catalogData from './catalog.json';
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

export interface CatalogOption {
    id: string;
    display_name: string;
    type: 'enum' | 'boolean' | 'custom';
    group: string;
    is_configurable: boolean;
    notes: string | null;
    description?: string; // Add description support even if not in JSON schema explicitly yet
    price?: number; // Add price support
}

export interface RuleCondition {
    option_id?: string;
    value?: string | number | boolean;
    model_id?: string;
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
    private rules: Rule[];

    constructor() {
        this.capabilities = [
            ...capabilitiesData.capabilities,
            ...blueLabelCapabilitiesData.capabilities
        ] as Capability[];
        this.catalog = catalogData.options as CatalogOption[];
        this.rules = [
            ...(rulesData.rules as unknown as Rule[]),
            ...(blueLabelRulesData.rules as unknown as Rule[])
        ];
    }

    // --- Model Management ---

    getModels(): { id: string; label: string; description?: string; price?: number }[] {
        const models = new Map<string, string>();
        for (const cap of this.capabilities) {
            if (!models.has(cap.model_id)) {
                models.set(cap.model_id, cap.model_label);
            }
        }
        // Metadata for models which isn't in capabilities.json - we might need a mapping or just hardcode for now
        // Or cleaner: check if 'catalog.json' has model definitions? No.
        // I will add some hardcoded metadata for display purposes for now, or derive from existing knowlege
        return Array.from(models.entries()).map(([id, label]) => ({
            id,
            label,
            description: this.getModelDescription(id),
            price: this.getModelBasePrice(id)
        }));
    }

    private getModelDescription(id: string): string {
        if (id === '330_100') return 'Compact mixing for small batches.';
        if (id === '515_200') return 'Compact mixing for medium batches.';
        if (id.startsWith('1200')) return 'Versatile mid-range performance.';
        if (id.startsWith('1400')) return 'Extended capacity mid-range.';
        if (id.startsWith('2000')) return 'High-volume industrial mixing.';
        if (id === 'large_twin') return 'High-volume twin mixing.';
        if (id === 'blue_label') return 'Premium advanced configurations.';
        return '';
    }

    private getModelBasePrice(id: string): number {
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

    // --- Option Management ---

    getOptionsByGroup(group: string): CatalogOption[] {
        return this.catalog.filter(opt => opt.group === group);
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
                // If it's a boolean, default to false if allowed, else true?
                if (opt.type === 'boolean') {
                    if (allowed.includes(false)) config.options[opt.id] = false;
                    else if (allowed.includes(true)) config.options[opt.id] = true;
                } else {
                    // Enum/Custom: Pick first
                    config.options[opt.id] = allowed[0]!;
                }
            }
        });

        return this.applyRules(config);
    }

    toggleOption(config: Configuration, optionId: string, value: string | number | boolean): Configuration {
        // Create new config state
        const newConfig: Configuration = {
            modelId: config.modelId,
            options: { ...config.options }
        };

        // For boolean toggle logic (if UI sends toggle request without explicit value)
        // If value passed is determined by UI, use it.
        // But if UI sends "toggle this option", we need to know current state.
        // WE assume caller sends the DESIRED value.

        newConfig.options[optionId] = value;
        return this.applyRules(newConfig);
    }

    // --- Rules Engine ---

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
        // Check if `value` is in allowed_values for current model
        if (config.modelId) {
            const allowed = this.getAllowedValues(config.modelId, optionId);
            if (!allowed.includes(value)) return false;
        }

        return this.getConflictReasons(config, optionId, value).length === 0;
    }

    generateCode(config: Configuration): string {
        if (!config.modelId) return '';
        const parts = [config.modelId];
        const keys = Object.keys(config.options).sort();
        keys.forEach(k => {
            parts.push(`${k}:${config.options[k]}`);
        });
        return btoa(parts.join('|'));
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
