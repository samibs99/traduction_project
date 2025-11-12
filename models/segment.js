// Modèle Segment
module.exports = (sequelize, DataTypes) => {
  const Segment = sequelize.define('Segment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    projetId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    classementnum: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    terminé: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  });

  Segment.associate = (models) => {
    Segment.belongsTo(models.Projet, {
      foreignKey: 'projetId',
      onDelete: 'CASCADE'
    });
  };

  return Segment;
};