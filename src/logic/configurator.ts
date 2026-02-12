import capabilitiesData from './capabilities.json';
import catalogData from './catalog.json';
import rulesData from './rules.json';

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
    option_id: string;
    value: string | number | boolean;
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
        this.capabilities = capabilitiesData.capabilities;
        this.catalog = catalogData.options as CatalogOption[];
        this.rules = rulesData.rules as unknown as Rule[];
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
                        if (currentValue !== effect.value) {
                            currentConfig.options[effect.option_id] = effect.value;
                            changed = true;
                        }
                    } else if (effect.type === 'exclude') {
                        if (currentValue === effect.value) {
                            // If excluded value is selected, we need to switch it
                            // For boolean: flip
                            // For enum: unset or pick default?
                            // We'll unset it for now
                            if (typeof effect.value === 'boolean') {
                                currentConfig.options[effect.option_id] = !effect.value;
                                changed = true;
                            } else {
                                delete currentConfig.options[effect.option_id];
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
        const val = config.options[condition.option_id];
        return val === condition.value;
    }

    validate(config: Configuration): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        for (const rule of this.rules) {
            if (rule.effect.type === 'require') {
                if (this.checkCondition(config, rule.when)) {
                    if (config.options[rule.effect.option_id] !== rule.effect.value) {
                        errors.push(`Rule violation: ${rule.reason}`);
                    }
                }
            }
            if (rule.effect.type === 'exclude') {
                if (this.checkCondition(config, rule.when)) {
                    if (config.options[rule.effect.option_id] === rule.effect.value) {
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
            if (rule.effect.type === 'exclude' && rule.effect.option_id === optionId && rule.effect.value === value) {
                if (this.checkCondition(config, rule.when)) {
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

        if (modelId === '330_100' || modelId === '515_200') {
            return 'https://flacktek.com/wp-content/uploads/2024/07/DAC-330-100-PRO_NoBGNoRef_V4_retouched-768x1024.png';
        }

        if (modelId.startsWith('1200') || modelId.startsWith('1400') || modelId.startsWith('2000') || modelId.startsWith('2800') || modelId === 'large_twin' || modelId === 'blue_label') {
            // For now using placeholders for vacuum/non-vacuum variants
            // In a real scenario, we'd have specific URLs
            if (isVac) {
                return '/images/medium-vac.png'; // Placeholder
            } else {
                return '/images/medium.png'; // Placeholder from previous data.ts
            }
        }

        // Large? The user said "large will just have the one pic for now"
        // But what is "large"? In capabilities.json we have "large_twin". 
        // We also had 'f-large' in old data.ts. 
        // Based on model IDs, "large_twin" is likely what "large" referred to, or maybe high-capacity ones.
        // User said: "1200 win and 2000 and 2800" (win -> twin?).

        // Let's refine based on user request:
        // "330 and 515 will default to the pro pic" -> Handle above.
        // "1200 and 1400 will have pics for both non-vac and vac" -> Handle above.
        // "same with 1200 win and 2000 and 2800" -> Handle above.
        // "large will just have the one pic for now" -> Maybe "large_twin"?

        if (modelId === 'large_twin') {
            return 'https://flacktek.com/wp-content/uploads/2024/07/big_NoBGNoRef_V6_retouched-1002x1024.png';
        }

        return '';
    }
}
