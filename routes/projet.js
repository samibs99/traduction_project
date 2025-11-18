const express = require("express");
const router = express.Router();

const axios = require("axios");
const db = require("../models"); // Assure-toi d’avoir index.js pour centraliser l’export des modèles
const { Projet, Segment, Utilisateur, sequelize } = db;
const Traduction = db.Traduction;

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
    const candidates = [
        process.env.SEGMENTER_URL,
        process.env.SEGMENTER_URL_FALLBACK,
        "http://127.0.0.1:8001",
        "http://127.0.0.1:8000"
    ].filter(Boolean);
    let lastErr = null;
    for (const base of candidates) {
        try {
            const url = `${base.replace(/\/$/, '')}/segmenter`;
            const resp = await axios.post(url, { texte }, { timeout: 7000 });
            const data = resp.data;
            const segmentsArray = Array.isArray(data) ? data : (data.segments || data.result || []);
            if (Array.isArray(segmentsArray)) {
                return { segments: segmentsArray, usedUrl: base };
            }
        } catch (err) {
            lastErr = err;
            console.warn(`Segmenter call failed for ${base}:`, err.message);
        }
    }
    throw lastErr || new Error('No segmenter endpoint succeeded');
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
    } finally {
        if (t && t.finished !== 'commit') {
            console.warn('Transaction was not committed (create projet). Ensuring rollback.');
            try { await t.rollback(); } catch (rollbackErr) { console.error('Error during transaction rollback:', rollbackErr); }
        }
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
        if (req.body.isFinished !== undefined) updates.isFinished = req.body.isFinished;
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

// POST bulk traductions for a project
router.post('/:id/traductions', async (req, res) => {
    const projet = await Projet.findByPk(req.params.id);
    if (!projet) return res.status(404).json({ error: 'Projet non trouvé' });
    const { traductions } = req.body; // array
    if (!Array.isArray(traductions)) return res.status(400).json({ error: 'Payload invalid: traductions attendu' });
    const results = [];
    const skipped = [];
    try {
        console.log(`[route] POST /api/projets/${req.params.id}/traductions payload count:`, traductions.length);

        // preload existing segments for quick matching (no outer transaction)
        const existingSegments = await Segment.findAll({ where: { projetId: projet.id } });

        for (const payload of traductions) {
            try {
                // Use a transaction per item so a failure doesn't abort others
                await sequelize.transaction(async (t) => {
                    // Resolve or create segment (within item transaction)
                    let segmentId = payload.segmentId || null;

                    if (!segmentId) {
                        // try by classementnum from preloaded segments
                        if (payload.classementnum) {
                            const found = existingSegments.find(s => Number(s.classementnum) === Number(payload.classementnum));
                            if (found) segmentId = found.id;
                        }

                        // try by exact text match
                        if (!segmentId && payload.texte_source) {
                            let seg = await Segment.findOne({ where: { projetId: projet.id, text: payload.texte_source }, transaction: t });
                            if (!seg) {
                                // try trimmed equality against preloaded segments
                                const found = existingSegments.find(s => (s.text || '').trim() === (payload.texte_source || '').trim());
                                if (found) seg = found;
                            }
                            if (seg) segmentId = seg.id;
                        }

                        // create new segment if still not found
                        if (!segmentId) {
                            const maxClassement = await Segment.max('classementnum', { where: { projetId: projet.id } });
                            const useClassement = (Number.isFinite(maxClassement) ? (maxClassement + 1) : 1);
                            const createdSeg = await Segment.create({
                                projetId: projet.id,
                                text: payload.texte_source || `Segment ${useClassement}`,
                                classementnum: useClassement
                            }, { transaction: t });
                            segmentId = createdSeg.id;
                            // keep existingSegments in sync for subsequent iterations
                            existingSegments.push(createdSeg);
                        }
                    }

                    if (!segmentId || !payload.traducteurId) {
                        // validation error for this item; throw to rollback this item transaction
                        throw Object.assign(new Error('Missing required fields: segmentId or traducteurId'), { code: 'VALIDATION', payload });
                    }

                    // Upsert traduction within item transaction
                    let existingTr = await Traduction.findOne({ where: { segmentId, traducteurId: payload.traducteurId || null, projetId: projet.id }, transaction: t });

                    if (existingTr) {
                        await existingTr.update({
                            texte_source: payload.texte_source !== undefined ? payload.texte_source : existingTr.texte_source,
                            texte_traduit: payload.texte_traduit !== undefined ? payload.texte_traduit : existingTr.texte_traduit,
                            statut: payload.statut !== undefined ? payload.statut : existingTr.statut,
                            source: payload.source !== undefined ? payload.source : existingTr.source
                        }, { transaction: t });
                        results.push(existingTr);
                    } else {
                        const created = await Traduction.create({
                            segmentId,
                            projetId: projet.id,
                            traducteurId: payload.traducteurId || null,
                            texte_source: payload.texte_source || null,
                            texte_traduit: payload.texte_traduit || null,
                            statut: payload.statut || 'draft',
                            source: payload.source || 'manual'
                        }, { transaction: t });
                        results.push(created);
                    }
                }); // end item transaction
            } catch (itemErr) {
                // distinguish validation errors we threw vs DB errors
                if (itemErr && itemErr.code === 'VALIDATION') {
                    skipped.push({ reason: 'validation-error', payload: itemErr.payload, error: itemErr.message });
                } else {
                    console.error('Error processing traduction payload:', payload, itemErr && itemErr.message ? itemErr.message : itemErr);
                    const errMsg = itemErr && itemErr.message ? itemErr.message : String(itemErr);
                    skipped.push({ reason: 'processing-error', payload, error: errMsg, details: itemErr && itemErr.errors ? itemErr.errors : undefined });
                }
                // continue with next payload
                continue;
            }
        }

        console.log(`[route] POST /api/projets/${req.params.id}/traductions created: ${results.length}, skipped: ${skipped.length}`);

        // Re-fetch created/updated rows with associations
        const createdIds = results.map(r => r.id).filter(Boolean);
        let createdRows = [];
        if (createdIds.length > 0) {
            createdRows = await Traduction.findAll({
                where: { id: createdIds },
                include: [
                    { model: Utilisateur, as: 'Traducteur', attributes: ['id','nom','email'] },
                    { model: Segment }
                ]
            });
        }
        return res.json({ created: createdRows, skipped });
    } catch (e) {
        console.error(`[route] POST /api/projets/${req.params.id}/traductions unexpected error:`, e);
        return res.status(500).json({ error: 'Erreur lors de la création des traductions', details: e && e.message ? e.message : String(e) });
    }
});

// GET traductions for a project
router.get('/:id/traductions', async (req, res) => {
    const projet = await Projet.findByPk(req.params.id);
    if (!projet) return res.status(404).json({ error: 'Projet non trouvé' });
    try {
        const rows = await Traduction.findAll({ where: { projetId: projet.id }, include: [{ model: Utilisateur, as: 'Traducteur', attributes: ['id','nom','email'] }, { model: Segment }] });
        res.json(rows);
    } catch (e) {
        console.error('Erreur get traductions:', e);
        res.status(500).json({ error: 'Impossible de récupérer traductions', details: e.message });
    }
});

// PATCH single traduction (evaluation by chef)
router.patch('/traductions/:trId', async (req, res) => {
    const { statut, score, commentaire } = req.body;
    const tr = await Traduction.findByPk(req.params.trId);
    if (!tr) return res.status(404).json({ error: 'Traduction non trouvée' });
    try {
        const updates = {};
        if (statut !== undefined) updates.statut = statut;
        if (score !== undefined) updates.score = score;
        if (commentaire !== undefined) updates.commentaire = commentaire;
        await tr.update(updates);
        res.json(tr);
    } catch (e) {
        console.error('Erreur update traduction:', e);
        res.status(500).json({ error: 'Impossible de mettre à jour la traduction', details: e.message });
    }
});

module.exports = router;