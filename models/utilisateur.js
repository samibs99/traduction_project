module.exports = (sequelize, DataTypes) => {
  const Utilisateur = sequelize.define('Utilisateur', {
    nom: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM('chef_projet', 'traducteur'),
      allowNull: false,
      defaultValue: 'traducteur' // par défaut traducteur
    }
  });
  return Utilisateur;
};
