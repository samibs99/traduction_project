console.log('Starting test...');
try {
  const app = require('./app.js');
  console.log('App loaded successfully');
  setTimeout(() => { console.log('Waiting...'); }, 100);
  setTimeout(() => { process.exit(0); }, 2000);
} catch (e) {
  console.error('Error:', e.message, e.stack);
  process.exit(1);
}
