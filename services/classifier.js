const { spawn } = require('child_process');

function classifierContexte(text) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', ['utils/classifier.py']);
    let data = '', error = '';

    python.stdout.on('data', (chunk) => data += chunk.toString());
    python.stderr.on('data', (chunk) => error += chunk.toString());

    python.on('close', (code) => {
      if (code !== 0) return reject(error);
      try {
        const json = JSON.parse(data);
        resolve(json.contexte);
      } catch (e) {
        reject("Erreur parsing JSON classification");
      }
    });

    python.stdin.write(text);
    python.stdin.end();
  });
}

module.exports = { classifierContexte };
