const express = require('express');
const router = express.Router();
const { Utilisateur } = require('../models');

// GET /api/utilisateurs?role=traducteur
router.get('/', async (req, res) => {
  const role = req.query.role;
  const where = {};
  if (role) where.role = role;
  try {
    const users = await Utilisateur.findAll({ where, attributes: ['id', 'nom', 'email', 'role'] });
    res.json(users);
  } catch (e) {
    console.error('Erreur fetch utilisateurs', e);
    res.status(500).json({ error: 'Erreur récupération utilisateurs' });
  }
});

module.exports = router;
