const { Projet, sequelize } = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    const p = await Projet.create({ nomProjet: 'debug-test', texte: 'hello from debug' });
    console.log('Created', p.toJSON());
    process.exit(0);
  } catch (e) {
    console.error('ERROR creating projet:', e);
    if (e.original) console.error('Original DB error:', e.original);
    process.exit(1);
  }
})();
