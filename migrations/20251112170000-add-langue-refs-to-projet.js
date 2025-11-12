'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Projets', 'langueSourceId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Langues', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Projets', 'langueCibleId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Langues', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Projets', 'langueSourceId');
    await queryInterface.removeColumn('Projets', 'langueCibleId');
  }
};
