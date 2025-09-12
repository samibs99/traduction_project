const jwt = require("jsonwebtoken");

// Vérifie si le token JWT est valide
function verifierToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token manquant" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token invalide" });
    req.user = user; // { id, email, role }
    next();
  });
}

// Vérifie si l'utilisateur a le rôle requis
function verifierRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Accès interdit : rôle requis " + role });
    }
    next();
  };
}

module.exports = { verifierToken, verifierRole };
