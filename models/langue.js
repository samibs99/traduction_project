module.exports = (sequelize, DataTypes) => {
  const Langue = sequelize.define('Langue', {
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    nom: { type: DataTypes.STRING, allowNull: false }
  });

  Langue.associate = (models) => {
    Langue.hasMany(models.Projet, { foreignKey: 'langueSourceId', as: 'projetsSource' });
    Langue.hasMany(models.Projet, { foreignKey: 'langueCibleId', as: 'projetsCible' });
  };

  return Langue;
};
