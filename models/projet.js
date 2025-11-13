// Modèle Projet
module.exports = (sequelize, DataTypes) => {
  const Projet = sequelize.define('Projet', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nomProjet: {
      type: DataTypes.STRING,
      allowNull: false
    },
    texte: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isFinished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    rapport: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Liste des segments stockée directement en JSON
    segments: {
      type: DataTypes.JSON,
      defaultValue: []
    }
    ,
    traducteurId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  });

  Projet.associate = (models) => {
    // assigned traducteur
    Projet.belongsTo(models.Utilisateur, { foreignKey: 'traducteurId', as: 'Traducteur' });
    // createur (chef de projet)
    Projet.belongsTo(models.Utilisateur, { foreignKey: 'createurId', as: 'Createur' });
    // segments relation is declared on Segment side
  };

  return Projet;
};