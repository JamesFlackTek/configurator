import { describe, it, expect, beforeEach } from 'vitest';
import { ConfiguratorLogic } from '../configurator';

describe('ConfiguratorLogic Blue Label Rules', () => {
    let configurator: ConfiguratorLogic;

    beforeEach(() => {
        configurator = new ConfiguratorLogic();
    });

    it('should correctly initialize a blue_label configuration', () => {
        const config = configurator.createInitialConfig('blue_label');
        expect(config.modelId).toBe('blue_label');
        expect(config.options).toBeDefined();
    });

    it('should return correct model metadata from JSON catalog', () => {
        const models = configurator.getModels();
        const blueLabel = models.find(m => m.id === 'blue_label');
        expect(blueLabel).toBeDefined();
        expect(blueLabel?.label).toBe('Blue Label');
        expect(blueLabel?.description).toBe('Premium advanced configurations.');

        const model330 = models.find(m => m.id === '330_100');
        expect(model330?.description).toBe('Compact mixing for small batches.');
    });

    it('should allow 1200 basket with 1200 Twin arm on Medium + chassis', () => {
        let config = configurator.createInitialConfig('blue_label');

        // Setup state that is valid for 1200 Twin arm and 1200 basket
        config = configurator.toggleOption(config, 'chassis', 'Medium +');
        config = configurator.toggleOption(config, 'arm_option', '1200 Twin');
        config = configurator.toggleOption(config, 'basket', '1200');

        expect(config.options['arm_option']).toBe('1200 Twin');
        expect(config.options['basket']).toBe('1200');

        const validation = configurator.validate(config);
        expect(validation.valid).toBe(true);
    });

    describe('Basket exclusion for 1200 Twin arm', () => {
        it('should NOT allow 1400, 2000, or 2800 baskets when 1200 Twin arm is selected', () => {
            let config = configurator.createInitialConfig('blue_label');
            config = configurator.toggleOption(config, 'chassis', 'Medium +');
            config = configurator.toggleOption(config, 'arm_option', '1200 Twin');

            // Check 1400
            const reasons1400 = configurator.getConflictReasons(config, 'basket', '1400');
            expect(reasons1400).toContain("The 1200 Twin arm is not compatible with 1400, 2000, or 2800 baskets on the Blue Label machine.");

            // Check 2000
            const reasons2000 = configurator.getConflictReasons(config, 'basket', '2000');
            expect(reasons2000).toContain("The 1200 Twin arm is not compatible with 1400, 2000, or 2800 baskets on the Blue Label machine.");

            // Check 2800
            const reasons2800 = configurator.getConflictReasons(config, 'basket', '2800');
            expect(reasons2800).toContain("The 1200 Twin arm is not compatible with 1400, 2000, or 2800 baskets on the Blue Label machine.");
        });

        it('should allow 1200 basket when 1200 Twin arm is selected', () => {
            let config = configurator.createInitialConfig('blue_label');
            config = configurator.toggleOption(config, 'chassis', 'Medium +');
            config = configurator.toggleOption(config, 'arm_option', '1200 Twin');

            const reasons1200 = configurator.getConflictReasons(config, 'basket', '1200');
            expect(reasons1200).toHaveLength(0);
        });
    });
});
