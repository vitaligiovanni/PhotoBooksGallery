const canvas = require('canvas');
console.log('Canvas version:', canvas.version);
console.log('Node version:', process.version);
console.log('Node modules ABI:', process.versions.modules);
console.log('Worker threads test...');
const { Worker } = require('worker_threads');
console.log('Worker threads available:', !!Worker);
