'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Segments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      projetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Projets',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      classementnum: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      terminé: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Segments');
  }
};