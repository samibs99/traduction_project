'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // add createurId if not exists
    await queryInterface.addColumn('Projets', 'createurId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Utilisateurs', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Projets', 'createurId');
  }
};
