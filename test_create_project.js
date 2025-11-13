const axios = require('axios');

(async () => {
  try {
    console.log('Calling POST http://localhost:3000/api/projets...');
    const res = await axios.post('http://localhost:3000/api/projets', {
      nomProjet: 'GracefulTest',
      texte: 'This should create with segmentation service running on port 8001.'
    }, { timeout: 10000 });
    console.log('SUCCESS:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('ERROR:', e.response?.status || e.code, e.response?.data || e.message);
  }
})();
