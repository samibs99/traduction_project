module.exports = (sequelize, DataTypes) => {
  const Projet = sequelize.define('Projet', {
    titre: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    statut: {
      type: DataTypes.ENUM('ouvert', 'en_cours', 'termine'),
      defaultValue: 'ouvert'
    },
    dateDebut: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    dateFin: DataTypes.DATE
  });

  Projet.associate = (models) => {
    Projet.belongsTo(models.Langue, { as: 'langueSource', foreignKey: 'langueSourceId' });
    Projet.belongsTo(models.Langue, { as: 'langueCible', foreignKey: 'langueCibleId' });
    Projet.belongsTo(models.Utilisateur, { as: 'createur', foreignKey: 'createurId' });
    Projet.hasMany(models.Segment, { foreignKey: 'projetId' });
  };

  return Projet;
};
