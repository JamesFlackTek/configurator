import type { ConfiguratorData } from './configurator';

export const machineData: ConfiguratorData = {
    categories: [
        { id: 'family', name: 'Step 1: Select Machine Family', exclusive: true },
        { id: 'voltage', name: 'Step 2: Voltage Selection', exclusive: true },
        { id: 'vacuum', name: 'Step 3: Atmospheric Control', exclusive: true },
        { id: 'container', name: 'Step 4: Basket Size', exclusive: true },
        { id: 'mass', name: 'Step 5: Mix Mass', exclusive: true },
        { id: 'tier', name: 'Model Tier', exclusive: true },
        { id: 'chassis', name: 'Advanced: Chassis', exclusive: true },
        { id: 'arm', name: 'Advanced: Arm Configuration', exclusive: true },
        { id: 'cert', name: 'Optional Certifications', exclusive: false },
    ],
    options: [
        // Families
        {
            id: 'f-small', name: 'Small',
            description: 'Compact mixing for small batches.',
            price: 12000, categoryId: 'family',
            imageUrl: 'https://flacktek.com/wp-content/uploads/2024/07/DAC-330-100-PRO_NoBGNoRef_V4_retouched-768x1024.png',
            excludes: [
                'vac-yes', 'v-208-3ph',
                'c-1200', 'c-1400', 'c-2000', 'c-2800', 'c-25g', 'c-35g',
                'm-200-400', 'm-300-600', 'm-600-800', 'm-up-1100',
                'ch-standard', 'ch-heavy', 'arm-single', 'arm-dual'
            ]
        },
        {
            id: 'f-medium', name: 'Medium',
            description: 'Versatile mid-range performance.',
            price: 25000, categoryId: 'family',
            imageUrl: '/images/medium.png',
            excludes: [
                'v-208-3ph',
                'c-515', 'c-330', 'c-2800', 'c-25g', 'c-35g',
                'm-100-150', 'm-200-250',
                'opt-l', 'opt-se', 'opt-pro',
                'ch-standard', 'ch-heavy', 'arm-single', 'arm-dual'
            ]
        },
        {
            id: 'f-medium-plus', name: 'Medium+',
            description: 'Extended capacity mid-range.',
            price: 32000, categoryId: 'family',
            imageUrl: '/images/medium.png',
            excludes: [
                'v-208-3ph', 'c-515', 'c-330', 'm-100-150', 'm-200-250',
                'opt-l', 'opt-se', 'opt-pro',
                'ch-standard', 'ch-heavy', 'arm-single', 'arm-dual'
            ]
        },
        {
            id: 'f-large', name: 'Large',
            description: 'High-volume industrial mixing.',
            price: 65000, categoryId: 'family',
            imageUrl: 'https://flacktek.com/wp-content/uploads/2024/07/big_NoBGNoRef_V6_retouched-1002x1024.png', // Placeholder
            excludes: [
                'v-120', 'v-240', 'c-515', 'c-330', 'c-1200', 'c-1400', 'c-2000', 'c-2800',
                'opt-l', 'opt-se', 'opt-pro',
                'ch-standard', 'ch-heavy', 'arm-single', 'arm-dual'
            ]
        },
        {
            id: 'f-blue', name: 'Blue Label',
            description: 'Premium advanced configurations.',
            price: 85000, categoryId: 'family',
            imageUrl: '/images/medium.png', // Placeholder
            excludes: [
                'v-120', 'v-240', 'c-515', 'c-330', 'c-1200', 'c-1400', 'c-2000', 'c-2800',
                'opt-l', 'opt-se', 'opt-pro'
            ]
        },

        // Model Tier (Small only)
        { id: 'opt-pro', name: 'Pro', description: 'Standard professional build.', price: 0, categoryId: 'tier', imageUrl: 'https://flacktek.com/wp-content/uploads/2024/07/DAC-330-100-PRO_NoBGNoRef_V4_retouched-768x1024.png' },
        { id: 'opt-se', name: 'SE', description: 'Special Edition with premium finish.', price: -1500, categoryId: 'tier', imageUrl: '/images/small-se.png' },
        { id: 'opt-l', name: 'L', description: 'Lightweight engineering build.', price: -2500, categoryId: 'tier', imageUrl: '/images/small-l.png' },

        // Voltage
        { id: 'v-120', name: '120V', description: 'Standard US outlet.', price: 0, categoryId: 'voltage' },
        { id: 'v-240', name: '200-240V', description: 'High voltage single phase.', price: 0, categoryId: 'voltage' },
        { id: 'v-208-3ph', name: '208V 3-phase', description: 'Industrial 3-phase power.', price: 0, categoryId: 'voltage' },

        // Vacuum
        { id: 'vac-no', name: 'Non-Vacuum', description: 'Atmospheric mixing.', price: 0, categoryId: 'vacuum' },
        { id: 'vac-yes', name: 'Vacuum', description: 'Advanced vacuum degassing.', price: 5000, categoryId: 'vacuum' },

        // Basket Size
        { id: 'c-330', name: '330 Basket', description: '', price: 0, categoryId: 'container' },
        { id: 'c-515', name: '515 Basket', description: '', price: 200, categoryId: 'container' },
        { id: 'c-1200', name: '1200 Basket', description: '', price: 0, categoryId: 'container' },
        { id: 'c-1400', name: '1400 Basket', description: '', price: 700, categoryId: 'container' },
        { id: 'c-2000', name: '2000 Basket', description: '', price: 1200, categoryId: 'container' },
        { id: 'c-2800', name: '2800 Basket', description: '', price: 1200, categoryId: 'container' },
        { id: 'c-25g', name: '2.5 gal', description: '', price: 3000, categoryId: 'container' },
        { id: 'c-35g', name: '3.5 gal', description: '', price: 4500, categoryId: 'container' },

        // Mix Mass
        { id: 'm-100-150', name: '100-150g', description: 'Mixing mass range.', price: 0, categoryId: 'mass' },
        { id: 'm-200-250', name: '200-250g', description: 'Mixing mass range.', price: 0, categoryId: 'mass' },
        { id: 'm-200-400', name: '200-400g', description: 'Mixing mass range.', price: 0, categoryId: 'mass' },
        { id: 'm-300-600', name: '300-600g', description: 'Mixing mass range.', price: 0, categoryId: 'mass' },
        { id: 'm-600-800', name: '600-800g', description: 'Mixing mass range.', price: 0, categoryId: 'mass' },
        { id: 'm-up-1100', name: 'Up to 1100g', description: 'Mixing mass range.', price: 0, categoryId: 'mass' },

        // Advanced Mode (Blue Label)
        { id: 'ch-standard', name: 'Standard Chassis', description: 'Optimized alloy frame.', price: 0, categoryId: 'chassis' },
        { id: 'ch-heavy', name: 'Heavy-Duty Chassis', description: 'Reinforced steel frame.', price: 5000, categoryId: 'chassis' },
        { id: 'arm-single', name: 'Single-Axis Arm', description: 'Precision orbital rotation.', price: 0, categoryId: 'arm' },
        { id: 'arm-dual', name: 'Dual-Axis Arm', description: 'Simultaneous contra-rotation.', price: 8000, categoryId: 'arm' },

        // Optional Certifications
        { id: 'opt-nrtl', name: 'NRTL Certification', description: 'Nationally Recognized Testing Laboratory certification.', price: 2500, categoryId: 'cert' },
    ]
};
