module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Traductions', 'score');
    await queryInterface.addColumn('Traductions', 'evaluation_bleu', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Traductions', 'score', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.removeColumn('Traductions', 'evaluation_bleu');
  },
};