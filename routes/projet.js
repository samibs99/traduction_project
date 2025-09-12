// routes/projet.js
const express = require('express');
const router = express.Router();
const { Projet, Segment } = require('../models');
const { verifierToken, verifierRole } = require('../middlewares/auth');
const { classifierContexte } = require('../services/classifier');
const { segmenterTexte } = require('../services/segmenter');

// 📊 Dashboard Chef – progression des projets
router.get('/dashboard/chef', verifierToken, verifierRole('chef_projet'), async (req, res) => {
  try {
    const projets = await Projet.findAll({
      include: [{ model: Segment }]
    });

    const result = projets.map(p => {
      const total = p.Segments.length;
      const finis = p.Segments.filter(s => s.statut === "termine").length;
      const progression = total > 0 ? Math.round((finis / total) * 100) : 0;

      return {
        id: p.id,
        titre: p.titre,
        statut: p.statut,
        progression,
        totalSegments: total
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Erreur dashboard chef:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

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

    // 🔥 Segmentation automatique via IA Python
    const segments = await segmenterTexte(description) || [];

    // 💾 Enregistrement des segments
    await Promise.all(
      segments.map(async (contenu) => {
        const contexte = await classifierContexte(contenu);
        return Segment.create({
          contenuSource: contenu,
          contexte,
          statut: 'en_attente', // ✅ cohérent avec ton modèle
          projetId: projet.id
        });
      })
    );

    // Retourne projet avec ses segments
    const projetComplet = await Projet.findByPk(projet.id, {
      include: [{ model: Segment }]
    });

    res.json({
      message: "Projet et segments créés avec succès ✅",
      projet: projetComplet,
      nombreDeSegments: segments.length
    });
  } catch (err) {
    console.error("Erreur création projet :", err);
    res.status(400).json({ message: 'Erreur', error: err.message });
  }
});

// 📄 Lister tous les projets
router.get('/', verifierToken, async (req, res) => {
  const projets = await Projet.findAll();
  res.json(projets);
});

// 📄 Lire un projet (avec ses segments)
router.get('/:id', verifierToken, async (req, res) => {
  const projet = await Projet.findByPk(req.params.id, {
    include: [{ model: Segment }]
  });
  if (!projet) return res.status(404).json({ message: "Introuvable" });
  res.json(projet);
});

// 📄 Lister les segments d’un projet
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

// 📝 Modifier un projet
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
  res.json({ message: "Supprimé ✅" });
});

module.exports = router;
