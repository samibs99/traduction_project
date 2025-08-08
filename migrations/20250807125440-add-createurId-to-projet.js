'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Projets', 'createurId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Utilisateurs', // correspond à la table réelle (sensible à la casse !)
        key: 'id'
      },
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Projets', 'createurId');
  }
};
