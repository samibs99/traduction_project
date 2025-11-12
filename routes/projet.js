const express = require("express");
const router = express.Router();

const axios = require("axios");
const db = require("../models"); // Assure-toi d’avoir index.js pour centraliser l’export des modèles
const { Projet, Segment, sequelize } = db;

// GET projets
router.get("/", async (req, res) => {
    const projets = await Projet.findAll({ order: [["createdAt", "DESC"]] });
    res.json(projets);
});

// POST projet
// POST création de projet + segmentation automatique
router.post("/", async (req, res) => {
    const { nomProjet, texte } = req.body;
    if (!nomProjet) return res.status(400).json({ error: "Nom du projet requis." });

    const t = await sequelize.transaction();
    try {
        // Crée d'abord le projet (pour obtenir un id)
        const projet = await Projet.create({ nomProjet, texte }, { transaction: t });

        // Si on a du texte, appeler le service de segmentation Python (FastAPI)
        let segmentsArray = [];
        if (texte && texte.trim()) {
            const PY_URL = process.env.PY_URL || "http://127.0.0.1:8000";
            const resp = await axios.post(`${PY_URL}/segmenter`, { texte });
            // le microservice peut renvoyer directement un tableau ou { segments: [...] }
            segmentsArray = Array.isArray(resp.data) ? resp.data : (resp.data.segments || resp.data.result || []);

            // Insérer les segments numérotés
            const toCreate = segmentsArray.map((contenu, idx) => ({
                projetId: projet.id,
                text: contenu,
                classementnum: idx + 1
            }));
            if (toCreate.length > 0) {
                await Segment.bulkCreate(toCreate, { transaction: t });
            }

            // Stocker aussi le tableau des segments dans la colonne JSON du projet
            await projet.update({ segments: segmentsArray }, { transaction: t });
        }

        await t.commit();

        // Recharger les segments insérés pour la réponse
        const insertedSegments = await Segment.findAll({ where: { projetId: projet.id }, order: [["classementnum", "ASC"]] });
        res.json({ projet, segments: insertedSegments });
    } catch (e) {
        await t.rollback();
        console.error("Erreur création projet + segmentation:", e);
        res.status(500).json({ error: "Erreur lors de la création du projet ou de la segmentation.", details: e.message || e.toString() });
    }
});

// GET un projet + ses segments
router.get("/:id", async (req, res) => {
    const projet = await Projet.findByPk(req.params.id, { include: { model: Segment } });
    if (!projet) return res.status(404).json({ error: "Projet non trouvé" });
    res.json(projet);
});

// POST segments pour un projet
router.post("/:id/segments", async (req, res) => {
    const { segments } = req.body; // tableau [{contenu,...}]
    const projet = await Projet.findByPk(req.params.id);
    if (!projet) return res.status(404).json({ error: "Projet non trouvé" });
    // Supprime les segments existants
    await Segment.destroy({ where: { projetId: projet.id } });
    // Ajoute chaque segment
    const segs = [];
    for (const s of segments) {
        segs.push(await Segment.create({ ...s, projetId: projet.id }));
    }
    res.json(segs);
});

// GET segments d’un projet
router.get("/:id/segments", async (req, res) => {
    const segs = await Segment.findAll({
        where: { projetId: req.params.id },
        order: [["id", "ASC"]],
    });
    res.json(segs);
});

// PUT segment
router.put("/:id/segments/:segmentId", async (req, res) => {
    const seg = await Segment.findByPk(req.params.segmentId);
    if (!seg) return res.status(404).json({ error: "Segment non trouvé" });
    await seg.update(req.body);
    res.json(seg);
});

// DELETE segment
router.delete("/:id/segments/:segmentId", async (req, res) => {
    const seg = await Segment.findByPk(req.params.segmentId);
    if (!seg) return res.status(404).json({ error: "Segment non trouvé" });
    await seg.destroy();
    res.json({ ok: true });
});

module.exports = router;