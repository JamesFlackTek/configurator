import type { ConfiguratorData } from './configurator';

export const machineData: ConfiguratorData = {
    categories: [
        { id: 'weight', name: 'Material Mixing Weight', exclusive: true },
        { id: 'vacuum', name: 'Vacuum Mixing', exclusive: true },
        { id: 'container', name: 'Largest Container Size', exclusive: true },
        { id: 'family', name: 'Machine Family', exclusive: true },
        { id: 'options', name: 'Features & Options', exclusive: false },
    ],
    options: [
        // Vacuum
        { id: 'vac-no', name: 'Non-Vacuum', description: 'Atmospheric mixing.', price: 0, categoryId: 'vacuum' },
        { id: 'vac-yes', name: 'Vacuum', description: 'Advanced vacuum degassing.', price: 5000, categoryId: 'vacuum' },


        // Containers
        { id: 'c-515', name: 'Up to 515 mL', description: '', price: 0, categoryId: 'container' },
        { id: 'c-1200', name: '185 to 1200 mL', description: '', price: 500, categoryId: 'container' },
        { id: 'c-2800', name: '500 to 2800 mL', description: '', price: 1200, categoryId: 'container' },
        { id: 'c-35g', name: '1.25-3.5 gal', description: '', price: 3000, categoryId: 'container' },
        { id: 'c-5g', name: '1.25-5 gal', description: 'Not available with vacuum', price: 4500, categoryId: 'container', excludes: ['vac-yes'] },
        { id: 'c-other', name: 'Other', description: '', price: 0, categoryId: 'container' },

        // Families
        {
            id: 'f-small', name: 'Small',
            description: 'Up to 200g, Non-Vac, 515mL only',
            price: 12000, categoryId: 'family',
            maxCapacity: 200,
            excludes: ['vac-yes', 'c-1200', 'c-2800', 'c-35g', 'c-5g']
        },
        {
            id: 'f-medium', name: 'Medium',
            description: '100-700g, Up to 1200mL',
            price: 25000, categoryId: 'family',
            maxCapacity: 700,
            excludes: ['c-2800', 'c-35g', 'c-5g']
        },
        {
            id: 'f-medium-plus', name: 'Medium+',
            description: '500-1kg, 185-1200mL',
            price: 32000, categoryId: 'family',
            maxCapacity: 1000,
            excludes: ['c-515', 'c-35g', 'c-5g']
        },
        {
            id: 'f-large', name: 'Large',
            description: '5-10kg, Large Containers',
            price: 65000, categoryId: 'family',
            maxCapacity: 10000,
            excludes: ['c-515', 'c-1200', 'c-2800']
        },
        {
            id: 'f-blue', name: 'Blue Label',
            description: 'Premium family with advanced options.',
            price: 85000, categoryId: 'family',
            maxCapacity: 10000,
        },


        // Options
        { id: 'opt-lid', name: 'Automatic Lid', description: '', price: 4500, categoryId: 'options', requires: ['f-blue'], excludes: ['opt-c1d2', 'f-small'] },
        { id: 'opt-robot', name: 'Robot Ready', description: 'For Medium & Medium + Machines, this includes an interface for external safety interlocks and the removal of the lid. For Large Machines, this includes the automatic lid.', price: 7500, categoryId: 'options', requires: ['f-blue'], excludes: ['opt-c1d2', 'f-small'] },
        { id: 'opt-rot', name: 'Upgraded Rotation Stage', description: 'This is only avialable on the medium chassis, it includes using the shaft coupler of the medium series machines.', price: 3200, categoryId: 'options', requires: ['f-blue'], excludes: ['f-small'] },
        { id: 'opt-open', name: 'Larger Opening', description: '', price: 2100, categoryId: 'options', requires: ['f-blue'], excludes: ['f-small'] },
        { id: 'opt-twin', name: 'Twin Basket', description: '', price: 5000, categoryId: 'options', excludes: ['f-small'] },
        { id: 'opt-arm', name: 'Adjustable Arm', description: '', price: 2800, categoryId: 'options', excludes: ['f-small'] },
        { id: 'opt-power', name: 'High Power', description: '', price: 1500, categoryId: 'options', requires: ['f-blue'], excludes: ['opt-c1d2', 'f-small'] },
        { id: 'opt-nrtl', name: 'NRTL Certification', description: '', price: 1200, categoryId: 'options', excludes: ['opt-c1d2'] },
        { id: 'opt-ce', name: 'CE Mark', description: '', price: 1000, categoryId: 'options', excludes: ['opt-c1d2'] },
        { id: 'opt-c1d2', name: 'C1D2 Certification', description: 'Hazardous location safety.', price: 15000, categoryId: 'options', requires: ['f-blue'], excludes: ['f-small'] },

        // Small Family Specific
        { id: 'opt-l', name: 'L', description: 'Lightweight configuration for small machines.', price: -2500, categoryId: 'options', requires: ['f-small'] },
        { id: 'opt-se', name: 'SE', description: 'Special Edition features for small machines.', price: -1000, categoryId: 'options', requires: ['f-small'] },
        { id: 'opt-pro', name: 'Pro', description: 'Professional grade components for small machines.', price: 0, categoryId: 'options', requires: ['f-small'] },

    ]
};
