"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import ProtectedRoute from "../../component/ProtectedRoute";

export default function DashboardChef() {
  const { token, logout } = useAuth();
  const [nomProjet, setNomProjet] = useState("");
  const [texte, setTexte] = useState("");
  const [projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [traducteurs, setTraducteurs] = useState([]);
  const [selectedTraducteur, setSelectedTraducteur] = useState(null);

  const API_BASE = "http://localhost:3000/api";

  const parseResponse = async (res) => {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return { ok: res.ok, status: res.status, data: await res.json() };
    return { ok: res.ok, status: res.status, text: await res.text() };
  };

  const fetchProjets = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projets`, { headers: { Authorization: `Bearer ${token}` } });
      const parsed = await parseResponse(res);
      if (!parsed.ok) {
        console.warn("fetchProjets error:", parsed);
        if (parsed.status === 401 || parsed.status === 403) {
          setMessage("Session expirée. Veuillez vous reconnecter.");
          logout();
          return;
        }
        setMessage(parsed.text || JSON.stringify(parsed.data) || "Erreur récupération projets");
        return;
      }
      setProjets(parsed.data || []);
    } catch (e) {
      console.error(e);
      setMessage("Erreur réseau lors de la récupération des projets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjets(); }, [token]);

  // charger la liste des traducteurs
  useEffect(() => {
    const fetchTraducteurs = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/utilisateurs?role=traducteur`, { headers: { Authorization: `Bearer ${token}` } });
        const parsed = await parseResponse(res);
        if (!parsed.ok) {
          console.warn('fetchTraducteurs failed', parsed);
          if (parsed.status === 401 || parsed.status === 403) {
            setMessage('Session expirée. Veuillez vous reconnecter.');
            logout();
            return;
          }
          setTraducteurs([]);
          return;
        }
        // parsed.ok
        setTraducteurs(parsed.data || []);
      } catch (e) { console.warn('Impossible de charger traducteurs', e); }
    };
    fetchTraducteurs();
  }, [token]);

  const creerProjet = async () => {
    if (!nomProjet.trim()) return setMessage("Nom du projet requis.");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nomProjet, texte, traducteurId: selectedTraducteur || null })
      });
      const parsed = await parseResponse(res);
      if (!parsed.ok) {
        if (parsed.status === 401 || parsed.status === 403) {
          setMessage("Session expirée ou token invalide.");
          logout();
          return;
        }
        setMessage(parsed.text || JSON.stringify(parsed.data) || "Erreur création projet");
        return;
      }
      const created = parsed.data;
      setProjets(prev => [created, ...prev]);
      setNomProjet(""); setTexte("");
      if (created.segmentationWarning) {
        setMessage(`Projet créé. ⚠️ ${created.segmentationWarning}`);
      } else {
        setMessage("Projet créé avec succès.");
      }
    } catch (e) {
      console.error(e);
      setMessage("Erreur réseau lors de la création du projet");
    } finally { setLoading(false); }
  };

  return (
    <ProtectedRoute allowedRoles={["chef_projet"]}>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1>Dashboard Chef de Projet</h1>
              <p>Gestion et création de projets</p>
            </div>
            <button className="logout-btn" onClick={logout}>
              <span>Déconnexion</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </header>

        <main className="dashboard-main">
          <section className="creation-section">
            <div className="section-header">
              <h2>Créer un nouveau projet</h2>
              <div className="section-divider"></div>
            </div>
            
            <div className="form-container">
              <div className="input-group">
                <label htmlFor="nomProjet">Nom du projet *</label>
                <input 
                  id="nomProjet"
                  type="text" 
                  placeholder="Entrez le nom du projet..." 
                  value={nomProjet} 
                  onChange={e => setNomProjet(e.target.value)}
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="description">Description</label>
                <textarea 
                  id="description"
                  placeholder="Décrivez brièvement le projet..." 
                  value={texte} 
                  onChange={e => setTexte(e.target.value)} 
                  rows={5}
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="assign">Assigner à</label>
                <select id="assign" value={selectedTraducteur || ""} onChange={e => setSelectedTraducteur(e.target.value)}>
                  <option value="">-- Aucun --</option>
                  {traducteurs.map(t => (
                    <option key={t.id} value={t.id}>{t.nom} ({t.email})</option>
                  ))}
                </select>
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn-primary" 
                  onClick={creerProjet} 
                  disabled={loading || !nomProjet.trim()}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Créer le projet
                    </>
                  )}
                </button>
                
                <button 
                  className="btn-secondary" 
                  onClick={() => { setNomProjet(''); setTexte(''); setMessage(''); }}
                  disabled={loading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Réinitialiser
                </button>
              </div>
              
              {message && (
                <div className={`message ${message.includes("succès") ? "message-success" : "message-error"}`}>
                  {message}
                </div>
              )}
            </div>
          </section>

          <section className="projects-section">
            <div className="section-header">
              <h2>Projets existants</h2>
              <span className="project-count">{projets.length} projet(s)</span>
            </div>
            
            <div className="projects-container">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Chargement des projets...</p>
                </div>
              ) : projets.length === 0 ? (
                <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                  </svg>
                  <h3>Aucun projet créé</h3>
                  <p>Commencez par créer votre premier projet</p>
                </div>
              ) : (
                <div className="projects-grid">
                  {projets.map((projet, idx) => (
                    <div key={projet.id ?? projet.nomProjet ?? `projet-${idx}`} className="project-card">
                      <div className="project-header">
                        <h3 className="project-title">{projet.nomProjet || projet.titre || projet.nom}</h3>
                      </div>
                      <p className="project-description">
                        {projet.texte 
                          ? (projet.texte.length > 150 
                              ? projet.texte.substring(0, 150) + '...' 
                              : projet.texte)
                          : 'Aucune description fournie'}
                      </p>
                      <div className="project-footer">
                        <span className="project-date">Créé récemment</span>
                        <button className="project-action">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          Voir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 20px;
        }

        .dashboard-header {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          margin-bottom: 24px;
          padding: 20px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-title h1 {
          margin: 0;
          color: #1a202c;
          font-size: 28px;
          font-weight: 700;
        }

        .header-title p {
          margin: 4px 0 0 0;
          color: #718096;
          font-size: 14px;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #e53e3e;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          background: #c53030;
          transform: translateY(-1px);
        }

        .dashboard-main {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          gap: 24px;
        }

        .creation-section, .projects-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          padding: 24px;
        }

        .section-header {
          margin-bottom: 24px;
        }

        .section-header h2 {
          margin: 0 0 8px 0;
          color: #2d3748;
          font-size: 20px;
          font-weight: 600;
        }

        .section-divider {
          height: 3px;
          background: linear-gradient(90deg, #4299e1, #38b2ac);
          border-radius: 2px;
          width: 60px;
        }

        .project-count {
          background: #edf2f7;
          color: #4a5568;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .form-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group label {
          display: block;
          margin-bottom: 6px;
          color: #4a5568;
          font-weight: 600;
          font-size: 14px;
        }

        .input-group input, .input-group textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .input-group input:focus, .input-group textarea:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-primary, .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .btn-primary {
          background: #4299e1;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #3182ce;
          transform: translateY(-1px);
        }

        .btn-primary:disabled {
          background: #a0aec0;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: #edf2f7;
          color: #4a5568;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e2e8f0;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 8px;
        }

        .message-success {
          background: #c6f6d5;
          color: #276749;
          border: 1px solid #9ae6b4;
        }

        .message-error {
          background: #fed7d7;
          color: #c53030;
          border: 1px solid #feb2b2;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .project-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          transition: all 0.2s ease;
        }

        .project-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
        }

        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .project-title {
          margin: 0;
          color: #2d3748;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.4;
        }

        .project-badge {
          background: #c6f6d5;
          color: #276749;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
        }

        .project-description {
          color: #718096;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 16px 0;
        }

        .project-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .project-date {
          color: #a0aec0;
          font-size: 12px;
        }

        .project-action {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: #4299e1;
          font-size: 12px;
          cursor: pointer;
          font-weight: 600;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #718096;
        }

        .empty-state h3 {
          margin: 16px 0 8px 0;
          color: #4a5568;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 12px;
          }
          
          .header-content {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
          
          .form-actions {
            flex-direction: column;
          }
          
          .projects-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </ProtectedRoute>
  );
}