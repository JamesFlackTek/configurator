export interface Option {
    id: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    requires?: string[]; // IDs of options that must be selected
    excludes?: string[]; // IDs of options that cannot be selected
    maxCapacity?: number; // Maximum mixing capacity in grams
    imageUrl?: string; // Optional image URL for visual updates
}

export interface Category {
    id: string;
    name: string;
    exclusive: boolean; // If true, only one option can be selected
}

export interface ConfiguratorData {
    categories: Category[];
    options: Option[];
}

export interface Configuration {
    selectedOptionIds: Set<string>;
}

export class ConfiguratorLogic {
    private data: ConfiguratorData;

    constructor(data: ConfiguratorData) {
        this.data = data;
    }


    toggleOption(config: Configuration, optionId: string): Configuration {
        const newSelected = new Set(config.selectedOptionIds);
        const option = this.data.options.find(o => o.id === optionId);
        if (!option) return config;

        if (newSelected.has(optionId)) {
            newSelected.delete(optionId);
        } else {
            const category = this.data.categories.find(c => c.id === option.categoryId);

            if (!category?.exclusive && !this.isOptionAvailable(config, optionId)) {
                return config;
            }

            if (category?.exclusive) {
                this.data.options
                    .filter(o => o.categoryId === option.categoryId)
                    .forEach(o => newSelected.delete(o.id));
            }

            newSelected.add(optionId);

            // Handle requirements (auto-select)
            if (option.requires) {
                option.requires.forEach(reqId => {
                    const reqOption = this.data.options.find(o => o.id === reqId);
                    if (reqOption) {
                        const result = this.toggleOption({ selectedOptionIds: newSelected }, reqId);
                        result.selectedOptionIds.forEach(id => newSelected.add(id));
                    }
                });
            }
        }

        // Prune once
        const pruned = this.pruneInvalid(newSelected).selectedOptionIds;

        // Auto-select defaults for empty exclusive categories
        this.data.categories.forEach(cat => {
            if (cat.exclusive) {
                const optionsInCat = this.data.options.filter(o => o.categoryId === cat.id);
                const isSomethingSelected = optionsInCat.some(o => pruned.has(o.id));

                if (!isSomethingSelected) {
                    // Find first available option and select it
                    const firstAvailable = optionsInCat.find(o => {
                        // Check if this option would be pruned immediately
                        const testSet = new Set(pruned);
                        testSet.add(o.id);
                        const testPruned = this.pruneInvalid(testSet).selectedOptionIds;
                        return testPruned.has(o.id);
                    });
                    if (firstAvailable) {
                        pruned.add(firstAvailable.id);
                    }
                }
            }
        });

        return { selectedOptionIds: pruned };
    }


    private pruneInvalid(selected: Set<string>): Configuration {
        let changed = true;
        while (changed) {
            changed = false;
            for (const id of selected) {
                const opt = this.data.options.find(o => o.id === id);
                if (!opt) continue;

                if (opt.requires) {
                    const missing = opt.requires.some(reqId => !selected.has(reqId));
                    if (missing) {
                        selected.delete(id);
                        changed = true;
                        break;
                    }
                }

                for (const otherId of selected) {
                    if (id === otherId) continue;
                    const other = this.data.options.find(o => o.id === otherId);
                    if (other?.excludes?.includes(id)) {
                        selected.delete(id);
                        changed = true;
                        break;
                    }
                }
                if (changed) break;
            }
        }
        return { selectedOptionIds: selected };
    }

    validate(config: Configuration): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        config.selectedOptionIds.forEach(id => {
            const option = this.data.options.find(o => o.id === id);
            if (option?.requires) {
                option.requires.forEach(reqId => {
                    if (!config.selectedOptionIds.has(reqId)) {
                        const reqOption = this.data.options.find(o => o.id === reqId);
                        errors.push(`${option.name} requires ${reqOption?.name || reqId}`);
                    }
                });
            }
        });
        return { valid: errors.length === 0, errors };
    }

    getWarnings(_config: Configuration): string[] {
        return [];
    }

    generateCode(config: Configuration): string {
        const sortedIds = Array.from(config.selectedOptionIds).sort();
        return btoa(sortedIds.join('|'));
    }

    isOptionAvailable(config: Configuration, optionId: string): boolean {
        return this.getConflictReasons(config, optionId).length === 0;
    }

    getConflictReasons(config: Configuration, optionId: string): string[] {
        const reasons: string[] = [];
        const option = this.data.options.find(o => o.id === optionId);
        if (!option) return ["Option not found"];

        for (const selectedId of config.selectedOptionIds) {
            const selectedOption = this.data.options.find(o => o.id === selectedId);
            if (selectedOption?.excludes?.includes(optionId)) {
                reasons.push(`${selectedOption.name} precludes this option`);
            }
        }

        if (option.excludes) {
            for (const exclId of option.excludes) {
                if (config.selectedOptionIds.has(exclId)) {
                    const selectedOption = this.data.options.find(o => o.id === exclId);
                    reasons.push(`Incompatible with selected ${selectedOption?.name || exclId}`);
                }
            }
        }

        if (option.requires) {
            for (const reqId of option.requires) {
                if (!config.selectedOptionIds.has(reqId)) {
                    if (!this.isOptionAvailable(config, reqId)) {
                        const reqOption = this.data.options.find(o => o.id === reqId);
                        reasons.push(`Requires ${reqOption?.name || reqId} (which is currently unavailable)`);
                    }
                }
            }
        }

        return reasons;
    }


}
