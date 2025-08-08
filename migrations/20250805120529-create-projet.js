'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Projets', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      titre: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT
      },
      statut: {
        type: Sequelize.STRING
      },
      dateDebut: {
        type: Sequelize.DATE
      },
      dateFin: {
        type: Sequelize.DATE
      },
      langueSourceId: {
        type: Sequelize.INTEGER
      },
      langueCibleId: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Projets');
  }
};