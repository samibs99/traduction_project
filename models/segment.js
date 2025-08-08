module.exports = (sequelize, DataTypes) => {
  const Segment = sequelize.define('Segment', {
    contenuSource: { type: DataTypes.TEXT, allowNull: false },
    contenuTraduit: DataTypes.TEXT,
    statut: {
      type: DataTypes.ENUM('en_attente', 'en_cours', 'termine'),
      defaultValue: 'en_attente'
    },
    contexte: {
      type: DataTypes.ENUM('general', 'juridique', 'technique', 'marketing'),
      defaultValue: 'general'
    }
  });

  Segment.associate = (models) => {
    Segment.belongsTo(models.Projet, { foreignKey: 'projetId' });
  };

  return Segment;
};
