'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Projets', 'traducteurId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Utilisateurs', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Projets', 'traducteurId');
  }
};
