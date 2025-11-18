module.exports = (sequelize, DataTypes) => {
  const Traduction = sequelize.define('Traduction', {
    texte_source: { type: DataTypes.TEXT, allowNull: true },
    texte_traduit: { type: DataTypes.TEXT, allowNull: true },
    statut: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
    source: { type: DataTypes.STRING, allowNull: true },
    evaluation_bleu: { type: DataTypes.FLOAT, allowNull: true },
    commentaire: { type: DataTypes.TEXT, allowNull: true }
  });

  Traduction.associate = (models) => {
    Traduction.belongsTo(models.Segment, { foreignKey: 'segmentId', onDelete: 'CASCADE' });
    Traduction.belongsTo(models.Projet, { foreignKey: 'projetId', onDelete: 'CASCADE' });
    Traduction.belongsTo(models.Utilisateur, { foreignKey: 'traducteurId', as: 'Traducteur' });
  };

  return Traduction;
};
