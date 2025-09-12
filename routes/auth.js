const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Utilisateur } = require('../models');
const secret = process.env.JWT_SECRET || "votre_clé_secrète";

// REGISTER
router.post('/register', async (req, res) => {
  const { nom, email, password, confirmPassword, role } = req.body;

  // Champs obligatoires
  if (!nom || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: "Tous les champs sont requis" });
  }

  // Validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Email invalide" });
  }

  // Validation mot de passe
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      message: "Le mot de passe doit contenir au moins 8 caractères, une lettre, un chiffre et un symbole" 
    });
  }

  // Vérifier correspondance des mots de passe
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Les mots de passe ne correspondent pas" });
  }

  // Vérification rôle (par défaut traducteur)
  const rolesAutorises = ["chef_projet", "traducteur"];
  const userRole = rolesAutorises.includes(role) ? role : "traducteur";

  try {
    const hash = await bcrypt.hash(password, 12);

    const user = await Utilisateur.create({ 
      nom, 
      email, 
      password: hash, 
      role: userRole 
    });

    res.json({ message: "Utilisateur créé avec succès ✅", user });
  } catch (err) {
    console.error("Erreur création utilisateur :", err);
    res.status(400).json({ message: "Erreur lors de la création du compte", error: err.message });
  }
});


// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Vérif utilisateur
  const user = await Utilisateur.findOne({ where: { email } });
  if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

  // Vérif mot de passe
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Mot de passe incorrect" });

  // JWT contient aussi le rôle
  const token = jwt.sign(
    { id: user.id, role: user.role }, 
    secret, 
    { expiresIn: '1d' }
  );

  res.json({ 
    message: "Connexion réussie ✅", 
    token, 
    role: user.role // 👈 rôle renvoyé au front
  });
});

module.exports = router;
