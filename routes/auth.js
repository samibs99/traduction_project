const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Utilisateur } = require('../models');
const secret = "votre_clé_secrète";

router.post('/register', async (req, res) => {
  const { nom, email, password, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await Utilisateur.create({ nom, email, password: hash, role });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: "Erreur", error: err });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await Utilisateur.findOne({ where: { email } });
  if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Mot de passe incorrect" });

  const token = jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: '1d' });
  res.json({ token });
});

module.exports = router;
