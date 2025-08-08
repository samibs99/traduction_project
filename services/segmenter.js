const { spawn } = require('child_process');

function segmenterTexte(text) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', ['utils/segmenter.py']);
    let data = '';
    let error = '';

    python.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    python.stderr.on('data', (chunk) => {
      error += chunk.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) return reject(error);
      try {
        const segments = JSON.parse(data);
        resolve(segments);
      } catch (err) {
        reject("Erreur parsing JSON depuis Python");
      }
    });

    python.stdin.write(text);
    python.stdin.end();
  });
}

module.exports = { segmenterTexte };
