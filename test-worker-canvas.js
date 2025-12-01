const { Worker, isMainThread, parentPort } = require('worker_threads');
const path = require('path');

if (isMainThread) {
  console.log('=== MAIN THREAD ===');
  console.log('Starting worker thread test...');
  
  const worker = new Worker(__filename);
  
  worker.on('message', (msg) => {
    console.log('✅ Message from worker:', msg);
  });
  
  worker.on('error', (err) => {
    console.error('❌ Worker error:', err.message);
    console.error('Stack:', err.stack);
  });
  
  worker.on('exit', (code) => {
    console.log('Worker exited with code:', code);
    if (code !== 0) {
      console.error('❌ Worker failed');
      process.exit(1);
    } else {
      console.log('✅ Worker test PASSED');
      process.exit(0);
    }
  });
  
} else {
  console.log('\n=== WORKER THREAD ===');
  
  try {
    console.log('Loading canvas in worker thread...');
    const canvas = require('canvas');
    console.log('Canvas version in worker:', canvas.version);
    
    console.log('Creating canvas in worker...');
    const { createCanvas } = canvas;
    const testCanvas = createCanvas(50, 50);
    console.log('Canvas created:', testCanvas.width, 'x', testCanvas.height);
    
    parentPort.postMessage({
      success: true,
      canvasVersion: canvas.version,
      canvasSize: `${testCanvas.width}x${testCanvas.height}`
    });
    
  } catch (error) {
    console.error('❌ Error in worker:', error.message);
    console.error('Error code:', error.code);
    console.error('Stack:', error.stack);
    
    parentPort.postMessage({
      success: false,
      error: error.message,
      code: error.code
    });
  }
}
