"use client";
import { useState, useEffect } from "react";

export default function DashboardTraducteur() {
  const [segmentsAssignes, setSegmentsAssignes] = useState([]);
  const [progression, setProgression] = useState({ traduits: 0, total: 0 });
  const [scoreMoyen, setScoreMoyen] = useState(0);
  const [traducteurId] = useState(1); // ID simulé du traducteur (Marie Dupont)

  // Charger les segments assignés au traducteur
  useEffect(() => {
    chargerSegmentsAssignes();
  }, []);

  const chargerSegmentsAssignes = () => {
    // Récupérer tous les projets
    const projets = JSON.parse(localStorage.getItem("projets") || "[]");
    
    // Récupérer tous les segments de tous les projets
    let tousSegments = [];
    projets.forEach(projet => {
      const segmentsProjet = JSON.parse(localStorage.getItem(`segments_${projet.id}`) || "[]");
      tousSegments = [...tousSegments, ...segmentsProjet.map(seg => ({ ...seg, projet: projet.nom }))];
    });
    
    // Filtrer les segments assignés à ce traducteur
    const segmentsFiltres = tousSegments.filter(seg => seg.traducteurId == traducteurId);
    setSegmentsAssignes(segmentsFiltres);
    
    // Calculer la progression
    const segmentsTraduits = segmentsFiltres.filter(seg => seg.statut === "terminé").length;
    setProgression({
      traduits: segmentsTraduits,
      total: segmentsFiltres.length
    });
    
    // Calculer le score moyen (simulé)
    if (segmentsTraduits > 0) {
      const scoreTotal = segmentsFiltres
        .filter(seg => seg.statut === "terminé")
        .reduce((total, seg) => total + (seg.contenuTraduit ? Math.min(10, seg.contenuTraduit.length / 5) : 0), 0);
      setScoreMoyen(parseFloat((scoreTotal / segmentsTraduits).toFixed(2)));
    }
  };

  const modifierTraduction = (index, value) => {
    const nouveauxSegments = [...segmentsAssignes];
    nouveauxSegments[index].contenuTraduit = value;
    setSegmentsAssignes(nouveauxSegments);
  };

  const sauvegarderTraduction = (index) => {
    const segment = segmentsAssignes[index];
    
    if (!segment.contenuTraduit.trim()) {
      alert("Veuillez saisir une traduction avant de sauvegarder");
      return;
    }
    
    // Mettre à jour le statut
    const nouveauxSegments = [...segmentsAssignes];
    nouveauxSegments[index].statut = "terminé";
    setSegmentsAssignes(nouveauxSegments);
    
    // Mettre à jour le localStorage
    const projets = JSON.parse(localStorage.getItem("projets") || "[]");
    const projet = projets.find(p => p.nom === segment.projet);
    
    if (projet) {
      const segmentsProjet = JSON.parse(localStorage.getItem(`segments_${projet.id}`) || "[]");
      const segmentIndex = segmentsProjet.findIndex(s => s.id === segment.id);
      
      if (segmentIndex !== -1) {
        segmentsProjet[segmentIndex] = nouveauxSegments[index];
        localStorage.setItem(`segments_${projet.id}`, JSON.stringify(segmentsProjet));
      }
    }
    
    // Mettre à jour la progression
    setProgression(prev => ({
      ...prev,
      traduits: prev.traduits + 1
    }));
    
    alert("Traduction sauvegardée avec succès !");
  };

  const filtrerSegments = (statut) => {
    const projets = JSON.parse(localStorage.getItem("projets") || "[]");
    let tousSegments = [];
    
    projets.forEach(projet => {
      const segmentsProjet = JSON.parse(localStorage.getItem(`segments_${projet.id}`) || "[]");
      tousSegments = [...tousSegments, ...segmentsProjet.map(seg => ({ ...seg, projet: projet.nom }))];
    });
    
    let segmentsFiltres = tousSegments.filter(seg => seg.traducteurId == traducteurId);
    
    if (statut !== "tous") {
      segmentsFiltres = segmentsFiltres.filter(seg => seg.statut === statut);
    }
    
    setSegmentsAssignes(segmentsFiltres);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📝 Dashboard Traducteur</h1>
      </header>

      <main className="content">
        {/* Statistiques personnelles */}
        <div className="section">
          <h2>Mes statistiques</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Progression</h3>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${progression.total > 0 ? (progression.traduits / progression.total) * 100 : 0}%`}}
                ></div>
              </div>
              <p>{progression.traduits} / {progression.total} segments traduits</p>
            </div>
            <div className="stat-card">
              <h3>Score moyen</h3>
              <p className="score">{scoreMoyen}/10</p>
            </div>
            <div className="stat-card">
              <h3>Segments en attente</h3>
              <p className="pending">{progression.total - progression.traduits}</p>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="section">
          <h2>Mes segments assignés</h2>
          <div className="filters">
            <button onClick={() => filtrerSegments("tous")} className="filter-btn">
              Tous
            </button>
            <button onClick={() => filtrerSegments("à traduire")} className="filter-btn">
              À traduire
            </button>
            <button onClick={() => filtrerSegments("terminé")} className="filter-btn">
              Terminés
            </button>
          </div>
        </div>

        {/* Liste des segments */}
        <div className="section">
          {segmentsAssignes.length === 0 ? (
            <p className="no-segments">Aucun segment assigné pour le moment.</p>
          ) : (
            segmentsAssignes.map((segment, index) => (
              <div key={segment.id} className="segment-card">
                <div className="segment-header">
                  <span className="projet-nom">Projet: {segment.projet}</span>
                  <span className={`statut-badge ${segment.statut.replace(" ", "")}`}>
                    {segment.statut}
                  </span>
                </div>
                
                <div className="segment-content">
                  <div className="text-group">
                    <label>Texte original:</label>
                    <p className="original-text">{segment.contenu}</p>
                  </div>
                  
                  <div className="text-group">
                    <label>Votre traduction:</label>
                    <textarea
                      value={segment.contenuTraduit}
                      onChange={(e) => modifierTraduction(index, e.target.value)}
                      className="translation-input"
                      placeholder="Saisissez votre traduction ici..."
                      disabled={segment.statut === "terminé"}
                    />
                  </div>
                </div>
                
                <div className="segment-actions">
                  {segment.statut !== "terminé" && (
                    <button
                      onClick={() => sauvegarderTraduction(index)}
                      className="btn save"
                    >
                      💾 Sauvegarder
                    </button>
                  )}
                  {segment.statut === "terminé" && (
                    <span className="saved-label">✓ Traduction sauvegardée</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <style jsx>{`
        .app-container {
          max-width: 1000px;
          margin: auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f7fa;
          min-height: 100vh;
        }
        .app-header {
          background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
          color: white;
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 25px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .app-header h1 {
          margin: 0;
          font-size: 2.2rem;
        }
        .app-header p {
          margin: 10px 0 0;
          opacity: 0.9;
          font-size: 1.2rem;
        }
        .section {
          margin-top: 25px;
          padding: 25px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e1e4e8;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .section h2 {
          margin-top: 0;
          color: #2c3e50;
          border-bottom: 2px solid #f0f2f5;
          padding-bottom: 12px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }
        .stat-card {
          padding: 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          text-align: center;
        }
        .stat-card h3 {
          margin-top: 0;
          color: #2c3e50;
          font-size: 18px;
        }
        .stat-card p {
          margin: 8px 0;
          font-size: 16px;
          color: #555;
        }
        .stat-card .score {
          font-size: 2rem;
          font-weight: bold;
          color: #27ae60;
        }
        .stat-card .pending {
          font-size: 2rem;
          font-weight: bold;
          color: #e67e22;
        }
        .progress-bar {
          height: 24px;
          background: #ecf0f1;
          border-radius: 12px;
          overflow: hidden;
          margin: 15px 0;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2ecc71 0%, #27ae60 100%);
          transition: width 0.5s ease-out;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 10px;
          color: white;
          font-weight: bold;
          font-size: 12px;
        }
        .filters {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        .filter-btn {
          padding: 10px 20px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-btn:hover {
          background: #f0f2f5;
        }
        .segment-card {
          padding: 20px;
          background: white;
          border-radius: 10px;
          border: 1px solid #e1e4e8;
          margin-bottom: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }
        .segment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #f0f2f5;
        }
        .projet-nom {
          font-weight: bold;
          color: #2c3e50;
        }
        .statut-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .statut-badge.àtraduire {
          background: #ffeaa7;
          color: #d35400;
        }
        .statut-badge.terminé {
          background: #d5f5e3;
          color: #27ae60;
        }
        .segment-content {
          margin-bottom: 20px;
        }
        .text-group {
          margin-bottom: 15px;
        }
        .text-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
          color: #2c3e50;
        }
        .original-text {
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 4px solid #3498db;
          margin: 0;
        }
        .translation-input {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid #d1d9e0;
          border-radius: 6px;
          font-size: 15px;
          resize: vertical;
        }
        .translation-input:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }
        .translation-input:disabled {
          background-color: #f8f9fa;
          color: #6c757d;
        }
        .segment-actions {
          display: flex;
          justify-content: flex-end;
        }
        .btn {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: #3498db;
          color: white;
          font-weight: 500;
          transition: all 0.2s;
          font-size: 15px;
        }
        .btn.save {
          background: #27ae60;
        }
        .btn.save:hover {
          background: #219653;
        }
        .saved-label {
          color: #27ae60;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .no-segments {
          text-align: center;
          padding: 30px;
          color: #7f8c8d;
          font-style: italic;
          background: #f8f9fa;
          border-radius: 8px;
          border: 2px dashed #e1e4e8;
        }
      `}</style>
    </div>
  );
}