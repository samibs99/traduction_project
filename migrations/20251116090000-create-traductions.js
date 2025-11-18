'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Traductions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      segmentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Segments', key: 'id' },
        onDelete: 'CASCADE'
      },
      projetId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Projets', key: 'id' },
        onDelete: 'CASCADE'
      },
      traducteurId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Utilisateurs', key: 'id' }
      },
      texte_source: { type: Sequelize.TEXT, allowNull: true },
      texte_traduit: { type: Sequelize.TEXT, allowNull: true },
      statut: { type: Sequelize.STRING, allowNull: false, defaultValue: 'draft' },
      source: { type: Sequelize.STRING, allowNull: true },
      score: { type: Sequelize.INTEGER, allowNull: true },
      commentaire: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Traductions');
  }
};
