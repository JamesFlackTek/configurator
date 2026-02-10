export interface Option {
    id: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    requires?: string[]; // IDs of options that must be selected
    excludes?: string[]; // IDs of options that cannot be selected
    maxCapacity?: number; // Maximum mixing capacity in grams
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
    expectedMass: number;
    maxMass: number;
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
            if (!this.isOptionAvailable(config, optionId)) {
                return config;
            }

            const category = this.data.categories.find(c => c.id === option.categoryId);
            if (category?.exclusive) {
                this.data.options
                    .filter(o => o.categoryId === option.categoryId)
                    .forEach(o => newSelected.delete(o.id));
            }

            newSelected.add(optionId);

            // --- Dynamic Logic for Robot Ready on Large Machines ---
            const family = this.getFamily(config);
            if (optionId === 'opt-robot' && family === 'f-large') {
                newSelected.add('opt-lid');
            }

            // 5. Handle requirements (auto-select)
            if (option.requires) {
                option.requires.forEach(reqId => {
                    if (!newSelected.has(reqId)) {
                        const reqOption = this.data.options.find(o => o.id === reqId);
                        if (reqOption) {
                            const reqCat = this.data.categories.find(c => c.id === reqOption.categoryId);
                            if (reqCat?.exclusive) {
                                this.data.options
                                    .filter(o => o.categoryId === reqOption.categoryId)
                                    .forEach(o => newSelected.delete(o.id));
                            }
                        }
                        const result = this.toggleOption({ ...config, selectedOptionIds: newSelected }, reqId);
                        result.selectedOptionIds.forEach(id => newSelected.add(id));
                    }
                });
            }
        }

        const pruned = this.pruneInvalid({ ...config, selectedOptionIds: newSelected });
        return { ...config, selectedOptionIds: pruned.selectedOptionIds };
    }


    private pruneInvalid(config: Configuration): Configuration {
        const selected = new Set(config.selectedOptionIds);
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
        return { ...config, selectedOptionIds: selected };
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

    getWarnings(config: Configuration): string[] {
        const warnings: string[] = [];
        const familyId = this.getFamily(config);
        const family = this.data.options.find(o => o.id === familyId);

        if (family && family.maxCapacity !== undefined) {
            if (config.maxMass > family.maxCapacity) {
                warnings.push(`Warning: The Maximum Material Weight (${config.maxMass}g) exceeds the mixing capacity of the ${family.name} machine family (${family.maxCapacity}g).`);
            }
        }

        return warnings;
    }

    private getFamily(config: Configuration): string | null {
        for (const id of config.selectedOptionIds) {
            const opt = this.data.options.find(o => o.id === id);
            if (opt?.categoryId === 'family') return id;
        }
        return this.deriveFamily(config.expectedMass);
    }

    deriveFamily(mass: number): string {
        if (mass < 250) return 'f-small';
        if (mass < 700) return 'f-medium';
        if (mass <= 1000) return 'f-medium-plus';
        return 'f-large';
    }

    generateCode(config: Configuration): string {
        const sortedIds = Array.from(config.selectedOptionIds).sort();
        const codeData = {
            ids: sortedIds,
            expected: config.expectedMass,
            max: config.maxMass
        };
        return btoa(JSON.stringify(codeData));
    }

    isOptionAvailable(config: Configuration, optionId: string): boolean {
        return this.getConflictReasons(config, optionId).length === 0;
    }

    getConflictReasons(config: Configuration, optionId: string): string[] {
        const reasons: string[] = [];
        const option = this.data.options.find(o => o.id === optionId);
        if (!option) return ["Option not found"];

        const chassisFamilyId = this.deriveFamily(config.expectedMass);

        // --- Upgraded Rotation Stage: Medium Chassis only ---
        if (optionId === 'opt-rot') {
            const isMediumChassis = chassisFamilyId === 'f-medium' || chassisFamilyId === 'f-medium-plus';
            if (!isMediumChassis) {
                reasons.push("Only available on Medium or Medium+ chassis configurations");
            }
        }

        // 1. Check if any selected option excludes this one
        for (const selectedId of config.selectedOptionIds) {
            const selectedOption = this.data.options.find(o => o.id === selectedId);
            if (selectedOption?.excludes?.includes(optionId)) {
                reasons.push(`${selectedOption.name} precludes this option`);
            }
        }

        // 2. Check if THIS option excludes already selected items
        if (option.excludes) {
            for (const exclId of option.excludes) {
                if (config.selectedOptionIds.has(exclId)) {
                    const selectedOption = this.data.options.find(o => o.id === exclId);
                    reasons.push(`Incompatible with selected ${selectedOption?.name || exclId}`);
                }
            }
        }

        // 3. Check requirements
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
