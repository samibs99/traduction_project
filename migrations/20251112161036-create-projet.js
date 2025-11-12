'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Projets', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nomProjet: {
        type: Sequelize.STRING,
        allowNull: false
      },
      texte: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isFinished: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      rapport: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      segments: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Projets');
  }
};