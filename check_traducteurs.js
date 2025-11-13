const { Utilisateur, sequelize } = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    const trads = await Utilisateur.findAll({ where: { role: 'traducteur' }, attributes: ['id','nom','email','role'] });
    console.log('Found traducteurs:', trads.map(t => t.toJSON()));
  } catch (e) {
    console.error('Error querying users:', e);
  } finally {
    await sequelize.close();
  }
})();
