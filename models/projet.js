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
  });

  return Projet;
};