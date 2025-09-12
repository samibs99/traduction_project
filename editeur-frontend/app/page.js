"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { useRouter } from "next/navigation";

export default function Home() {
  const [texte, setTexte] = useState("");
  const [segments, setSegments] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [traduction, setTraduction] = useState("");
  const [reference, setReference] = useState("");
  const [scores, setScores] = useState(null);
  const [activeTab, setActiveTab] = useState("éditeur");  
  const [loading, setLoading] = useState({
    segmenter: false,
    harmoniser: false,
    traduction: false,
    evaluation: false
  });
const { token, ready } = useAuth();
const router = useRouter();

useEffect(() => {
  if (ready && !token) router.push("/login");
}, [ready, token, router]);

  // ------------------- Handlers -------------------
  const handleChangeTexte = (e) => setTexte(e.target.value);

  const segmenter = async () => {
    setLoading(prev => ({...prev, segmenter: true}));
    try {
      const { data } = await axios.post("http://localhost:3000/api/ai/segmenter", { texte });
      setSegments(data.segments || []);
      setActiveTab("segments");
    } catch (e) {
      alert("Erreur lors du segmenter");
    } finally {
      setLoading(prev => ({...prev, segmenter: false}));
    }
  };

  const harmoniser = async () => {
    setLoading(prev => ({...prev, harmoniser: true}));
    try {
      const { data } = await axios.post("http://localhost:3000/api/ai/harmoniser", {
        segments,
      });
      setSegments(data.harmonisation.split("\n"));
    } catch (e) {
      console.error(
        "Erreur harmonisation:",
        e.response && e.response.data ? e.response.data : e.message
      );
      alert("Erreur lors de l'harmonisation");
    } finally {
      setLoading(prev => ({...prev, harmoniser: false}));
    }
  };

  const traduire = async () => {
    setLoading(prev => ({...prev, traduction: true}));
    try {
      const { data } = await axios.post("http://localhost:3000/api/ai/traduire", {
        texte,
        langue_cible: "en"
      });
      setTraduction(data.traduction);
      setActiveTab("traduction");
    } catch (e) {
      alert("Erreur lors de la traduction");
    } finally {
      setLoading(prev => ({...prev, traduction: false}));
    }
  };

  const demanderSuggestion = async (index) => {
    try {
      const { data } = await axios.post("http://localhost:3000/api/ai/suggest", {
        contenu: segments[index]
      });
      setSuggestions((prev) => ({ ...prev, [index]: data.suggestion }));
    } catch (e) {
      alert("Erreur lors de la suggestion");
    }
  };

  const accepterSuggestion = (index) => {
    const s = suggestions[index];
    if (!s) return;
    const copy = [...segments];
    copy[index] = s;
    setSegments(copy);

    setSuggestions((prev) => {
      const cp = { ...prev };
      delete cp[index];
      return cp;
    });
  };

  const rejeterSuggestion = (index) => {
    setSuggestions((prev) => {
      const cp = { ...prev };
      delete cp[index];
      return cp;
    });
  };

  const handleChangeSegment = (index, value) => {
    const copy = [...segments];
    copy[index] = value;
    setSegments(copy);
  };

  const ajouterSegment = () => setSegments([...segments, ""]);
  const supprimerSegment = (index) => setSegments(segments.filter((_, i) => i !== index));

  // ------------------- Évaluation -------------------
  const evaluerTraduction = async () => {
    if (!traduction || !reference) {
      alert("Veuillez remplir la référence et générer une traduction !");
      return;
    }
    setLoading(prev => ({...prev, evaluation: true}));
    try {
      const { data } = await axios.post("http://localhost:3000/api/ai/evaluer", {
        reference,
        hypothesis: traduction
      });
      setScores({
        bleu: data.bleu.score,
        comet: data.comet.score
      });
    } catch (e) {
      alert("Erreur lors de l'évaluation");
    } finally {
      setLoading(prev => ({...prev, evaluation: false}));
    }
  };

  // ------------------- UI -------------------
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Éditeur IA Collaboratif</h1>
        <p className="app-subtitle">Transformez vos textes avec l'intelligence artificielle : segmentation, harmonisation, traduction et évaluation automatiques dans une interface moderne et intuitive.</p>
      </header>

      <div className="main-content">
        <div className="sidebar">
          <div className="sidebar-section">
            <h3>Fonctionnalités</h3>
            <div className="tab-buttons">
              <button 
                className={`tab-button ${activeTab === "éditeur" ? "active" : ""}`}
                onClick={() => setActiveTab("éditeur")}
              >
                Éditeur
              </button>
              <button 
                className={`tab-button ${activeTab === "segments" ? "active" : ""}`}
                onClick={() => setActiveTab("segments")}
                disabled={segments.length === 0}
              >
                Segments
              </button>
              <button 
                className={`tab-button ${activeTab === "traduction" ? "active" : ""}`}
                onClick={() => setActiveTab("traduction")}
                disabled={!traduction}
              >
                Traduction
              </button>
              <button 
                className={`tab-button ${activeTab === "évaluation" ? "active" : ""}`}
                onClick={() => setActiveTab("évaluation")}
              >
                Évaluation
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Actions</h3>
            <div className="action-buttons">
              <button 
                onClick={segmenter} 
                className={`action-button ${loading.segmenter ? 'loading' : ''}`}
                disabled={loading.segmenter || !texte.trim()}
              >
                {loading.segmenter ? '⏳' : '📄'} Segmenter
              </button>
              <button 
                onClick={harmoniser} 
                className={`action-button ${loading.harmoniser ? 'loading' : ''}`}
                disabled={loading.harmoniser || segments.length === 0}
              >
                {loading.harmoniser ? '⏳' : '🔄'} Harmoniser
              </button>
              <button 
                onClick={traduire} 
                className={`action-button ${loading.traduction ? 'loading' : ''}`}
                disabled={loading.traduction || !texte.trim()}
              >
                {loading.traduction ? '⏳' : '🌐'} Traduire
              </button>
            </div>
          </div>

          
        </div>

        <div className="content-area">
          {activeTab === "éditeur" && (
            <div className="tab-content">
              <h2>Texte Principal</h2>
              <textarea
                value={texte}
                onChange={handleChangeTexte}
                placeholder="Écrivez votre texte ici pour commencer l'édition collaborative avec l'IA..."
                className="main-textarea"
              />
            </div>
          )}

          {activeTab === "segments" && segments.length > 0 && (
            <div className="tab-content">
              <div className="segments-header">
                <h2>Segments</h2>
                <button onClick={ajouterSegment} className="add-button">➕ Ajouter un segment</button>
              </div>
              
              <div className="segments-list">
                {segments.map((seg, i) => (
                  <div key={i} className="segment-item">
                    <div className="segment-header">
                      <span className="segment-number">Segment {i + 1}</span>
                      <button 
                        onClick={() => supprimerSegment(i)} 
                        className="delete-button"
                        title="Supprimer ce segment"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <input
                      type="text"
                      value={seg}
                      onChange={(e) => handleChangeSegment(i, e.target.value)}
                      className="segment-input"
                    />
                    
                    <div className="segment-actions">
                      <button 
                        onClick={() => demanderSuggestion(i)} 
                        className="suggestion-button"
                        disabled={!seg.trim()}
                      >
                        🧠 Suggestion IA
                      </button>
                    </div>

                    {suggestions[i] && (
                      <div className="suggestion-box">
                        <div className="suggestion-header">
                          <span className="suggestion-title">Suggestion IA</span>
                        </div>
                        <p className="suggestion-text">{suggestions[i]}</p>
                        <div className="suggestion-actions">
                          <button 
                            onClick={() => accepterSuggestion(i)} 
                            className="accept-button"
                          >
                            ✅ Accepter
                          </button>
                          <button 
                            onClick={() => rejeterSuggestion(i)} 
                            className="reject-button"
                          >
                            ❌ Rejeter
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "traduction" && traduction && (
            <div className="tab-content">
              <h2>Traduction</h2>
              <div className="translation-box">
                {traduction}
              </div>
            </div>
          )}

          {activeTab === "évaluation" && (
            <div className="tab-content">
              <h2>Évaluation de la Traduction</h2>
              <textarea
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Entrez le texte de référence pour évaluer la qualité de la traduction..."
                className="reference-textarea"
              />
              <button 
                onClick={evaluerTraduction} 
                className={`evaluate-button ${loading.evaluation ? 'loading' : ''}`}
                disabled={loading.evaluation || !traduction || !reference}
              >
                {loading.evaluation ? '⏳' : '📊'} Évaluer la Traduction
              </button>

              {scores && (
                <div className="scores-container">
                  <h3>Résultats de l'évaluation</h3>
                  <div className="scores-grid">
                    <div className="score-item">
                      <span className="score-label">Score BLEU</span>
                      <span className="score-value">{scores.bleu.toFixed(4)}</span>
                    </div>
                    <div className="score-item">
                      <span className="score-label">Score COMET</span>
                      <span className="score-value">{scores.comet.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f5f5;
        }
        
        .app-header {
          background: linear-gradient(135deg, #6e8efb, #a777e3);
          color: white;
          padding: 20px 30px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .app-title {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        
        .app-subtitle {
          margin: 8px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
          max-width: 800px;
        }
        
        .main-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .sidebar {
          width: 280px;
          background-color: #2c3e50;
          color: white;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 25px;
        }
        
        .sidebar-section h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
          font-weight: 600;
          color: #ecf0f1;
        }
        
        .tab-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .tab-button {
          background: none;
          border: none;
          color: #bdc3c7;
          text-align: left;
          padding: 12px 15px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 15px;
        }
        
        .tab-button:hover {
          background-color: #34495e;
          color: white;
        }
        
        .tab-button.active {
          background-color: #3498db;
          color: white;
        }
        
        .tab-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .action-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px 15px;
          cursor: pointer;
          transition: background-color 0.2s;
          font-size: 14px;
        }
        
        .action-button:hover:not(:disabled) {
          background-color: #2980b9;
        }
        
        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .windows-activation {
          margin-top: auto;
          padding: 15px;
          background-color: #34495e;
          border-radius: 6px;
        }
        
        .windows-activation h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
        }
        
        .windows-activation p {
          margin: 0;
          font-size: 14px;
          color: #bdc3c7;
        }
        
        .content-area {
          flex: 1;
          padding: 25px;
          overflow-y: auto;
          background-color: white;
        }
        
        .tab-content {
          max-width: 800px;
        }
        
        .tab-content h2 {
          margin: 0 0 20px 0;
          color: #2c3e50;
          font-size: 24px;
          font-weight: 600;
        }
        
        .main-textarea, .reference-textarea {
          width: 100%;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          margin-bottom: 20px;
          resize: vertical;
          min-height: 200px;
          box-sizing: border-box;
          font-family: inherit;
        }
        
        .main-textarea:focus, .reference-textarea:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }
        
        .segments-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .add-button {
          background-color: #27ae60;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 15px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .add-button:hover {
          background-color: #219653;
        }
        
        .segments-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .segment-item {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          background-color: #f9f9f9;
        }
        
        .segment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .segment-number {
          font-weight: 600;
          color: #2c3e50;
        }
        
        .delete-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 5px;
          border-radius: 4px;
        }
        
        .delete-button:hover {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .segment-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 15px;
          margin-bottom: 12px;
          box-sizing: border-box;
        }
        
        .segment-input:focus {
          outline: none;
          border-color: #3498db;
        }
        
        .segment-actions {
          display: flex;
          justify-content: flex-end;
        }
        
        .suggestion-button {
          background-color: #9b59b6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .suggestion-button:hover:not(:disabled) {
          background-color: #8e44ad;
        }
        
        .suggestion-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .suggestion-box {
          margin-top: 15px;
          padding: 15px;
          background-color: #e8f4fc;
          border-radius: 6px;
          border-left: 4px solid #3498db;
        }
        
        .suggestion-header {
          margin-bottom: 8px;
        }
        
        .suggestion-title {
          font-weight: 600;
          color: #2980b9;
        }
        
        .suggestion-text {
          margin: 0 0 12px 0;
          color: #2c3e50;
          line-height: 1.5;
        }
        
        .suggestion-actions {
          display: flex;
          gap: 10px;
        }
        
        .accept-button {
          background-color: #27ae60;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .accept-button:hover {
          background-color: #219653;
        }
        
        .reject-button {
          background-color: #e74c3c;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .reject-button:hover {
          background-color: #c0392b;
        }
        
        .translation-box {
          padding: 20px;
          background-color: #e8f5e9;
          border-radius: 8px;
          border-left: 4px solid #2ecc71;
          line-height: 1.6;
          white-space: pre-wrap;
          font-size: 16px;
        }
        
        .evaluate-button {
          background-color: #f39c12;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px 20px;
          cursor: pointer;
          font-size: 16px;
          margin-bottom: 20px;
        }
        
        .evaluate-button:hover:not(:disabled) {
          background-color: #e67e22;
        }
        
        .evaluate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .scores-container {
          padding: 20px;
          background-color: #fff8e1;
          border-radius: 8px;
          border-left: 4px solid #f1c40f;
        }
        
        .scores-container h3 {
          margin: 0 0 15px 0;
          color: #d35400;
        }
        
        .scores-grid {
          display: flex;
          gap: 30px;
        }
        
        .score-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .score-label {
          font-size: 14px;
          color: #7f8c8d;
          margin-bottom: 8px;
        }
        
        .score-value {
          font-size: 24px;
          font-weight: 700;
          color: #e67e22;
        }
        
        @media (max-width: 768px) {
          .main-content {
            flex-direction: column;
          }
          
          .sidebar {
            width: 100%;
            padding: 15px;
          }
          
          .tab-buttons, .action-buttons {
            flex-direction: row;
            flex-wrap: wrap;
          }
          
          .segments-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .scores-grid {
            flex-direction: column;
            gap: 15px;
          }
        }
      `}</style>
    </div>
  );
}