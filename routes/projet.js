const express = require("express");
const router = express.Router();

const axios = require("axios");
const db = require("../models"); // Assure-toi d’avoir index.js pour centraliser l’export des modèles
const { Projet, Segment, Utilisateur, sequelize } = db;

// GET projets
router.get("/", async (req, res) => {
    const projets = await Projet.findAll({
        order: [["createdAt", "DESC"]],
        include: [{ model: Utilisateur, attributes: ['id','nom','email'], as: 'Traducteur' }]
    });
    res.json(projets);
});

// Helper: try segmentation on multiple endpoints (configurable)
async function trySegmenterCall(texte) {
    const configured = process.env.PY_URL ? [process.env.PY_URL] : [];
    // fallback candidates
    const candidates = [...configured, "http://127.0.0.1:8001", "http://127.0.0.1:8000"];
    let lastErr = null;
    for (const base of candidates) {
        try {
            const resp = await axios.post(`${base.replace(/\/$/, '')}/segmenter`, { texte }, { timeout: 7000 });
            const segmentsArray = Array.isArray(resp.data) ? resp.data : (resp.data.segments || resp.data.result || []);
            return { segments: segmentsArray, usedUrl: base };
        } catch (err) {
            lastErr = err;
            console.warn(`Segmenter call failed for ${base}:`, err.message);
            // try next candidate
        }
    }
    // If all fail, throw the last error
    throw lastErr;
}

// POST projet
// POST création de projet + segmentation automatique
router.post("/", async (req, res) => {
    const { nomProjet, texte, traducteurId } = req.body;
    if (!nomProjet) return res.status(400).json({ error: "Nom du projet requis." });

    const t = await sequelize.transaction();
    try {
        // Crée d'abord le projet (pour obtenir un id)
    const projet = await Projet.create({ nomProjet, texte, traducteurId: traducteurId || null }, { transaction: t });

        // Si on a du texte, appeler le service de segmentation Python (FastAPI)
        let segmentsArray = [];
        let segmentationWarning = null;
        if (texte && texte.trim()) {
            try {
                const result = await trySegmenterCall(texte);
                segmentsArray = result.segments || [];

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
            } catch (segErr) {
                // Segmentation échouée (service indisponible, timeout, etc.)
                console.warn("Segmentation échouée, tentative de fallback (split naïf):", segErr && segErr.message ? segErr.message : segErr);
                segmentationWarning = `Segmentation indisponible: ${segErr && segErr.message ? segErr.message : 'Service inaccessible'} (fallback utilisé)`;
                // Fallback: simple split par phrases et création des segments localement
                try {
                    segmentsArray = texte.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
                    const toCreateFast = segmentsArray.map((contenu, idx) => ({
                        projetId: projet.id,
                        text: typeof contenu === 'string' ? contenu : String(contenu),
                        classementnum: idx + 1
                    }));
                    if (toCreateFast.length > 0) {
                        await Segment.bulkCreate(toCreateFast, { transaction: t });
                    }
                    // Mettre à jour la colonne JSON segments
                    await projet.update({ segments: segmentsArray }, { transaction: t });
                } catch (fbErr) {
                    console.error('Erreur lors du fallback de segmentation:', fbErr);
                    // laisser segmentationWarning défini et continuer (projet créé sans segments)
                }
            }
        }

        // si un traducteur a été fourni, on peut mettre à jour à nouveau (déjà passé lors de create)
        if (traducteurId) {
            await projet.update({ traducteurId }, { transaction: t });
        }

        await t.commit();

        // Recharger les segments insérés pour la réponse
        const insertedSegments = await Segment.findAll({ where: { projetId: projet.id }, order: [["classementnum", "ASC"]] });
        res.json({ projet, segments: insertedSegments, segmentationWarning });
    } catch (e) {
        await t.rollback();
        console.error("Erreur création projet:", e);
        res.status(500).json({ error: "Erreur lors de la création du projet.", details: e.message || e.toString() });
    }
});

// GET un projet + ses segments
router.get("/:id", async (req, res) => {
    const projet = await Projet.findByPk(req.params.id, { include: [{ model: Segment }, { model: Utilisateur, as: 'Traducteur', attributes: ['id','nom','email'] }] });
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

// POST resegment: re-segment a project (if segmentation failed initially)
router.post("/:id/resegment", async (req, res) => {
    const projet = await Projet.findByPk(req.params.id);
    if (!projet) return res.status(404).json({ error: "Projet non trouvé" });
    if (!projet.texte) return res.status(400).json({ error: "Projet n'a pas de texte" });

    const t = await sequelize.transaction();
    try {
        // Supprimer les anciens segments
        await Segment.destroy({ where: { projetId: projet.id }, transaction: t });

        // Segmenter le texte
        let segmentsArray = [];
        try {
            const result = await trySegmenterCall(projet.texte);
            segmentsArray = result.segments || [];
        } catch (segErr) {
            console.warn("Segmentation échouée lors du resegment:", segErr && segErr.message ? segErr.message : segErr);
            // Fallback: simple split by sentences
            segmentsArray = projet.texte.split(/[.!?]+/).filter(s => s.trim());
        }

        // Créer les segments
        const toCreate = segmentsArray.map((contenu, idx) => ({
            projetId: projet.id,
            text: typeof contenu === 'string' ? contenu.trim() : contenu,
            classementnum: idx + 1
        }));
        
        if (toCreate.length > 0) {
            await Segment.bulkCreate(toCreate, { transaction: t });
        }

        await projet.update({ segments: segmentsArray }, { transaction: t });
        await t.commit();

        const insertedSegments = await Segment.findAll({ where: { projetId: projet.id }, order: [["classementnum", "ASC"]] });
        res.json({ projet, segments: insertedSegments, message: `Projet resegmenté: ${insertedSegments.length} segments créés` });
    } catch (e) {
        await t.rollback();
        console.error("Erreur resegment:", e);
        res.status(500).json({ error: "Erreur resegmentation", details: e.message });
    }
});

// PATCH projet: update projet fields (texte, nomProjet, traducteurId)
router.patch("/:id", async (req, res) => {
    const { texte, nomProjet, traducteurId } = req.body;
    const projet = await Projet.findByPk(req.params.id);
    console.log(`[route] PATCH /api/projets/${req.params.id} called`);
    if (!projet) return res.status(404).json({ error: "Projet non trouvé" });
    try {
        const updates = {};
        if (texte !== undefined) updates.texte = texte;
        if (nomProjet !== undefined) updates.nomProjet = nomProjet;
        if (traducteurId !== undefined) updates.traducteurId = traducteurId;
        await projet.update(updates);
        res.json(projet);
    } catch (e) {
        console.error('Erreur update projet:', e);
        res.status(500).json({ error: 'Impossible de mettre à jour le projet', details: e.message });
    }
});

// DELETE projet: delete project and its segments
router.delete("/:id", async (req, res) => {
    const projet = await Projet.findByPk(req.params.id);
    console.log(`[route] DELETE /api/projets/${req.params.id} called`);
    if (!projet) return res.status(404).json({ error: "Projet non trouvé" });
    const t = await sequelize.transaction();
    try {
        // supprimer les segments associés
        await Segment.destroy({ where: { projetId: projet.id }, transaction: t });
        await projet.destroy({ transaction: t });
        await t.commit();
        res.json({ ok: true });
    } catch (e) {
        await t.rollback();
        console.error('Erreur suppression projet:', e);
        res.status(500).json({ error: 'Impossible de supprimer le projet', details: e.message });
    }
});

module.exports = router;