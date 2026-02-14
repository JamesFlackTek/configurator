
import { ConfiguratorLogic } from './src/logic/configurator.js';

const logic = new ConfiguratorLogic();
const config = logic.createInitialConfig('330_100');
const initialOrderCode = logic.generateOrderCode(config);
console.log('Initial Order Code:', initialOrderCode);

// Add an accessory
const configWithAcc = { ...config, options: { ...config.options, medium_cart: true } };
const afterAccOrderCode = logic.generateOrderCode(configWithAcc);
console.log('Order Code after adding accessory:', afterAccOrderCode);

if (initialOrderCode === afterAccOrderCode) {
    console.log('SUCCESS: Order code is stable (decoupled from accessories).');
} else {
    console.log('FAILURE: Order code changed after adding accessory.');
    process.exit(1);
}
