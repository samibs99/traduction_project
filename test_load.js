try {
  require('./routes/projet.js');
  console.log('Routes projet loaded OK');
} catch (e) {
  console.error('Error loading routes/projet.js:', e.message);
}
