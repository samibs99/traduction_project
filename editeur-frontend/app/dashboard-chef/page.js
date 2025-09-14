"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext"; // Import du contexte d'authentification

export default function DashboardChef() {
  const [texte, setTexte] = useState("");
  const [segments, setSegments] = useState([]);
  const [projets, setProjets] = useState([]);
  const [projetSelectionne, setProjetSelectionne] = useState(null);
  const [nomProjet, setNomProjet] = useState("");
  const [statistiques, setStatistiques] = useState(null);
  const [traducteurs, setTraducteurs] = useState([
    { id: 1, nom: "Marie Dupont" },
    { id: 2, nom: "Jean Martin" },
    { id: 3, nom: "Sophie Lambert" }
  ]);
  
  const { logout } = useAuth(); // Récupération de la fonction de déconnexion

  // Charger les projets depuis le localStorage au montage
  useEffect(() => {
    const savedProjets = localStorage.getItem("projets");
    if (savedProjets) {
      const parsedProjets = JSON.parse(savedProjets);
      setProjets(parsedProjets);
    }
  }, []);

  // Mettre à jour les statistiques quand les segments changent
  useEffect(() => {
    if (projetSelectionne && segments.length > 0) {
      calculerStatistiques();
    }
  }, [segments, projetSelectionne]);

  const calculerStatistiques = () => {
    const totalSegments = segments.length;
    const segmentsTraduits = segments.filter(s => s.statut === "terminé").length;
    const segmentsATraduire = totalSegments - segmentsTraduits;
    const pourcentageTraduits = totalSegments > 0 ? Math.round((segmentsTraduits / totalSegments) * 100) : 0;
    
    // Calculer un score moyen factice basé sur la longueur des traductions
    let scoreMoyen = 0;
    if (segmentsTraduits > 0) {
      const segmentsTermines = segments.filter(s => s.statut === "terminé");
      scoreMoyen = segmentsTermines.reduce((sum, seg) => {
        return sum + (seg.contenuTraduit ? Math.min(10, seg.contenuTraduit.length / 5) : 0);
      }, 0) / segmentsTermines.length;
    }

    setStatistiques({
      pourcentageTraduits,
      totalSegments,
      segmentsTraduits,
      segmentsATraduire,
      scoreMoyen: parseFloat(scoreMoyen.toFixed(2))
    });
  };

  const handleChangeTexte = (e) => setTexte(e.target.value);

  // Segmentation simple locale
  const segmenter = () => {
    if (!texte.trim()) return alert("⚠️ Texte vide !");
    const segs = texte
      .split(/[.!?]/)
      .map((s, index) => ({ 
        id: Date.now() + index, 
        contenu: s.trim(), 
        contenuTraduit: "", 
        statut: "à traduire",
        traducteurId: null
      }))
      .filter(seg => seg.contenu);
    setSegments(segs);
  };

  // Ajouter un segment vide
  const ajouterSegment = () => {
    const newSegment = {
      id: Date.now(),
      contenu: "",
      contenuTraduit: "",
      statut: "à traduire",
      traducteurId: null
    };
    setSegments([...segments, newSegment]);
  };

  // Supprimer un segment
  const supprimerSegment = (index) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  // Modifier le contenu d'un segment
  const handleChangeSegment = (index, value) => {
    const copy = [...segments];
    copy[index].contenu = value;
    setSegments(copy);
  };

  // Assigner un traducteur à un segment
  const assignerTraducteurSegment = (segmentIndex, traducteurId) => {
    const copy = [...segments];
    copy[segmentIndex].traducteurId = traducteurId;
    setSegments(copy);
  };

  // Créer un nouveau projet
  const creerProjet = () => {
    if (!nomProjet.trim()) return alert("⚠️ Nom du projet requis !");
    
    const nouveauProjet = {
      id: Date.now(),
      nom: nomProjet,
      statut: "en cours",
      dateCreation: new Date().toISOString()
    };
    
    setProjetSelectionne(nouveauProjet);
    setProjets([...projets, nouveauProjet]);
    setNomProjet("");
    
    // Sauvegarder dans le localStorage
    localStorage.setItem("projets", JSON.stringify([...projets, nouveauProjet]));
    
    alert("✅ Projet créé avec succès !");
  };

  // Sélectionner un projet existant
  const selectionnerProjet = (projet) => {
    setProjetSelectionne(projet);
    
    // Charger les segments depuis le localStorage
    const savedSegments = localStorage.getItem(`segments_${projet.id}`);
    if (savedSegments) {
      setSegments(JSON.parse(savedSegments));
    } else {
      setSegments([]);
    }
  };

  // Enregistrer les segments dans le localStorage
  const enregistrerSegments = () => {
    if (!segments.length) return alert("⚠️ Aucun segment à enregistrer !");
    if (!projetSelectionne) return alert("⚠️ Veuillez d'abord créer ou sélectionner un projet !");
    
    localStorage.setItem(`segments_${projetSelectionne.id}`, JSON.stringify(segments));
    alert("✅ Segments enregistrés avec succès !");
  };

  // Marquer un segment comme terminé
  const marquerCommeTermine = (index) => {
    const copy = [...segments];
    if (copy[index].contenuTraduit.trim()) {
      copy[index].statut = "terminé";
      setSegments(copy);
    } else {
      alert("Veuillez d'abord ajouter une traduction");
    }
  };

  // Modifier la traduction d'un segment
  const modifierTraduction = (index, value) => {
    const copy = [...segments];
    copy[index].contenuTraduit = value;
    setSegments(copy);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>📊 Dashboard Chef de Projet</h1>
            <p>Créez et gérez vos projets de traduction</p>
          </div>
          <button onClick={logout} className="logout-button">
            🚪 Déconnexion
          </button>
        </div>
      </header>

      <main className="content">
        {/* Section création de projet */}
        <div className="section">
          <h2>Créer un nouveau projet</h2>
          <div className="form-group">
            <input
              type="text"
              value={nomProjet}
              onChange={(e) => setNomProjet(e.target.value)}
              placeholder="Nom du projet"
              className="text-input"
            />
            <button onClick={creerProjet} className="btn">
              ➕ Créer le projet
            </button>
          </div>
        </div>

        {/* Liste des projets existants */}
        {projets.length > 0 && (
          <div className="section">
            <h2>Projets existants</h2>
            <div className="projets-list">
              {projets.map(projet => (
                <div 
                  key={projet.id} 
                  className={`projet-item ${projetSelectionne?.id === projet.id ? 'selected' : ''}`}
                  onClick={() => selectionnerProjet(projet)}
                >
                  <span className="projet-nom">{projet.nom}</span>
                  <span className="projet-statut">{projet.statut}</span>
                  <span className="projet-date">
                    {new Date(projet.dateCreation).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistiques du projet sélectionné */}
        {projetSelectionne && statistiques && (
          <div className="section">
            <h2>Statistiques du projet: {projetSelectionne.nom}</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Progression</h3>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{width: `${statistiques.pourcentageTraduits}%`}}
                  ></div>
                </div>
                <p>{statistiques.pourcentageTraduits}% traduits</p>
              </div>
              <div className="stat-card">
                <h3>Segments</h3>
                <p>Total: {statistiques.totalSegments}</p>
                <p>Traduits: {statistiques.segmentsTraduits}</p>
                <p>À traduire: {statistiques.segmentsATraduire}</p>
              </div>
              <div className="stat-card">
                <h3>Qualité moyenne</h3>
                <p>{statistiques.scoreMoyen ? statistiques.scoreMoyen.toFixed(2) + '/10' : 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Zone texte et segmentation - seulement si projet sélectionné */}
        {projetSelectionne && (
          <>
            <div className="section">
              <h2>Texte global</h2>
              <textarea
                value={texte}
                onChange={handleChangeTexte}
                placeholder="Collez ici le texte du projet..."
                className="main-textarea"
              />
              <div className="button-group">
                <button onClick={segmenter} className="btn">
                  📄 Segmenter
                </button>
                <button onClick={ajouterSegment} className="btn add">
                  ➕ Ajouter segment
                </button>
                <button onClick={enregistrerSegments} className="btn save">
                  💾 Enregistrer les segments
                </button>
               
              </div>
            </div>

            {/* Segments */}
            <div className="section">
              <h2>Segments ({segments.length})</h2>
              {segments.length === 0 ? (
                <p className="no-segments">Aucun segment pour ce projet. Ajoutez-en ou segmentez un texte.</p>
              ) : (
                segments.map((seg, i) => (
                  <div key={seg.id} className="segment-item">
                    <span className="segment-label">Segment {i + 1}</span>
                    <div className="segment-content">
                      <div className="segment-original">
                        <input
                          type="text"
                          value={seg.contenu}
                          onChange={(e) => handleChangeSegment(i, e.target.value)}
                          className="segment-input"
                          placeholder="Contenu du segment"
                        />
                      </div>
                      <div className="segment-translation">
                        <input
                          type="text"
                          value={seg.contenuTraduit}
                          onChange={(e) => modifierTraduction(i, e.target.value)}
                          className="segment-input"
                          placeholder="Traduction"
                          disabled={seg.statut === "terminé"}
                        />
                        <button
                          onClick={() => marquerCommeTermine(i)}
                          className={`btn status ${seg.statut === "terminé" ? "completed" : "incomplete"}`}
                        >
                          {seg.statut === "terminé" ? "✓ Terminé" : "Marquer terminé"}
                        </button>
                      </div>
                    </div>
                    <select 
                      value={seg.traducteurId || ""} 
                      onChange={(e) => assignerTraducteurSegment(i, e.target.value)}
                      className="traducteur-select"
                    >
                      <option value="">Assigner un traducteur</option>
                      {traducteurs.map(trad => (
                        <option key={trad.id} value={trad.id}>
                          {trad.nom}
                        </option>
                      ))}
                    </select>
                    <span className={`statut-badge ${seg.statut.replace(" ", "")}`}>
                      {seg.statut}
                    </span>
                    <button
                      onClick={() => supprimerSegment(i)}
                      className="btn delete"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        .app-container {
          max-width: 1200px;
          margin: auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f7fa;
          min-height: 100vh;
        }
        .app-header {
          background: linear-gradient(135deg, #2c3e50 0%, #4a6491 100%);
          color: white;
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 25px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .app-header h1 {
          margin: 0;
          font-size: 2.2rem;
        }
        .app-header p {
          margin: 10px 0 0;
          opacity: 0.9;
        }
        .logout-button {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid white;
          border-radius: 8px;
          color: white;
          padding: 10px 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .logout-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
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
        .form-group {
          display: flex;
          gap: 15px;
          align-items: center;
        }
        .text-input, .main-textarea {
          padding: 12px 15px;
          border-radius: 8px;
          border: 1px solid #d1d9e0;
          flex: 1;
          font-size: 16px;
          transition: border-color 0.3s;
        }
        .text-input:focus, .main-textarea:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }
        .main-textarea {
          width: 100%;
          min-height: 150px;
          margin-bottom: 15px;
          resize: vertical;
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
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .btn.add {
          background: #27ae60;
        }
        .btn.delete {
          background: #e74c3c;
          padding: 10px 15px;
        }
        .btn.save {
          background: #8e44ad;
        }
        .btn.ia {
          background: #f39c12;
        }
        .btn.status {
          padding: 8px 15px;
          font-size: 14px;
          white-space: nowrap;
        }
        .btn.status.completed {
          background: #27ae60;
        }
        .btn.status.incomplete {
          background: #e67e22;
        }
        .button-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .segment-item {
          display: flex;
          align-items: center;
          margin-top: 15px;
          gap: 15px;
          padding: 15px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e1e4e8;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .segment-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .segment-label {
          width: 90px;
          font-weight: bold;
          color: #7f8c8d;
          flex-shrink: 0;
        }
        .segment-content {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 10px;
        }
        .segment-original, .segment-translation {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .segment-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d9e0;
          border-radius: 6px;
          font-size: 15px;
          transition: border-color 0.3s;
        }
        .segment-input:focus {
          outline: none;
          border-color: #3498db;
        }
        .segment-input:disabled {
          background-color: #f8f9fa;
          color: #6c757d;
        }
        .traducteur-select {
          padding: 10px 12px;
          border: 1px solid #d1d9e0;
          border-radius: 6px;
          width: 200px;
          font-size: 14px;
          flex-shrink: 0;
        }
        .statut-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: bold;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .statut-badge.àtraduire {
          background: #ffeaa7;
          color: #d35400;
        }
        .statut-badge.terminé {
          background: #d5f5e3;
          color: #27ae60;
        }
        .projets-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .projet-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border: 1px solid #e1e4e8;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .projet-item:hover {
          background: #f8f9fa;
        }
        .projet-item.selected {
          background: #e8f4fc;
          border-color: #3498db;
        }
        .projet-statut {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 13px;
          background: #eee;
          text-transform: uppercase;
          font-weight: bold;
        }
        .projet-date {
          font-size: 14px;
          color: #7f8c8d;
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
          color: 555;
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