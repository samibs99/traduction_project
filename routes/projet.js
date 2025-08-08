const express = require('express');
const router = express.Router();
const { Projet, Segment } = require('../models'); // 👈 Ajout de Segment
const { verifierToken, verifierRole } = require('../middlewares/auth');
const { classifierContexte } = require('../services/classifier'); // 👈 IA contextuelle
const { segmenterTexte } = require('../services/segmenter'); // 👈 Ajout segmentation IA

// ➕ Créer un projet (chef de projet uniquement)
router.post('/', verifierToken, verifierRole('chef_projet'), async (req, res) => {
  try {
    const { titre, description, dateDebut, dateFin, langueSourceId, langueCibleId } = req.body;

    // Création du projet
    const projet = await Projet.create({
      titre,
      description,
      statut: 'ouvert',
      dateDebut,
      dateFin,
      langueSourceId,
      langueCibleId,
      createurId: req.user.id
    });

    // 🔥 Segmentation automatique via Python
    const segments = await segmenterTexte(description); // 👈 segmentation du texte

    // 💾 Enregistrement des segments dans la base
await Promise.all(
  segments.map(async (contenu) => {
    const contexte = await classifierContexte(contenu); // 🔥 classification IA
    return Segment.create({
      contenuSource: contenu,
      contexte, // 👈 nouveau champ
      projetId: projet.id
    });
  })
);


    res.json({
      message: "Projet et segments créés avec succès",
      projet,
      nombreDeSegments: segments.length
    });
  } catch (err) {
    console.error("Erreur création projet :", err);
    res.status(400).json({ message: 'Erreur', error: err.message });
  }
});

// 📄 Lister tous les projets (chef ou traducteur)
router.get('/', verifierToken, async (req, res) => {
  const projets = await Projet.findAll();
  res.json(projets);
});

// 📄 Lire un projet
router.get('/:id', verifierToken, async (req, res) => {
  const projet = await Projet.findByPk(req.params.id);
  if (!projet) return res.status(404).json({ message: "Introuvable" });
  res.json(projet);
});

// 📄 ✅ Lister tous les segments liés à un projet
router.get('/:id/segments', verifierToken, async (req, res) => {
  try {
    const segments = await Segment.findAll({
      where: { projetId: req.params.id }
    });

    res.json(segments);
  } catch (err) {
    console.error("Erreur récupération segments :", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// 📝 Modifier un projet (chef de projet uniquement)
router.put('/:id', verifierToken, verifierRole('chef_projet'), async (req, res) => {
  const projet = await Projet.findByPk(req.params.id);
  if (!projet) return res.status(404).json({ message: "Introuvable" });

  await projet.update(req.body);
  res.json(projet);
});

// ❌ Supprimer un projet
router.delete('/:id', verifierToken, verifierRole('chef_projet'), async (req, res) => {
  const projet = await Projet.findByPk(req.params.id);
  if (!projet) return res.status(404).json({ message: "Introuvable" });

  await projet.destroy();
  res.json({ message: "Supprimé" });
});

module.exports = router;
