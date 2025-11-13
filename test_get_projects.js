const axios = require('axios');

(async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/projets');
    console.log('GET /projets SUCCESS - count:', res.data.length);
  } catch (e) {
    console.error('GET /projets ERROR:', e.code, e.message);
  }
})();
