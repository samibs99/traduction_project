const { sequelize } = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');
    await sequelize.close();
  } catch (e) {
    console.error('✗ Database connection failed:', e.message);
  }
})();
