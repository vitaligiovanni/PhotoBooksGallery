const canvas = require('canvas');
console.log('=== CANVAS INFO ===');
console.log('Canvas version:', canvas.version);
console.log('Node version:', process.version);
console.log('Node ABI:', process.versions.modules);
console.log('Platform:', process.platform);
console.log('Arch:', process.arch);

// Test Worker Threads
const { Worker, isMainThread } = require('worker_threads');
console.log('\n=== WORKER THREADS ===');
console.log('Is main thread:', isMainThread);
console.log('Worker available:', !!Worker);

// Test canvas loading
try {
  const { createCanvas } = canvas;
  const testCanvas = createCanvas(100, 100);
  console.log('\n=== CANVAS TEST ===');
  console.log('✅ Canvas creates successfully');
  console.log('Canvas size:', testCanvas.width, 'x', testCanvas.height);
} catch (error) {
  console.error('❌ Canvas test failed:', error.message);
}
