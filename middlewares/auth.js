const jwt = require("jsonwebtoken");

const secret = "votre_clé_secrète"; // ⚠️ à sécuriser

const verifierToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "Token requis" });

  try {
    const decoded = jwt.verify(token.split(' ')[1], secret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalide" });
  }
};

const verifierRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ message: "Accès refusé" });
    next();
  };
};

module.exports = { verifierToken, verifierRole };
