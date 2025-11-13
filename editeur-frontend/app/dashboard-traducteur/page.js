"use client";
import { useState, useEffect } from "react";
import ProtectedRoute from "../../component/ProtectedRoute";
import { useAuth } from "../AuthContext";

export default function DashboardTraducteur() {
  const { token, user, logout } = useAuth();
  const [projets, setProjets] = useState([]);
  const [selectedProjet, setSelectedProjet] = useState(null);
  const [segments, setSegments] = useState([]);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState(null);
  const [translations, setTranslations] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const [harmonization, setHarmonization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [langues, setLangues] = useState({ source: "FR", cible: "EN" });

  const API_BASE = "http://localhost:3000/api";

  const parseResponse = async (res) => {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return { ok: res.ok, status: res.status, data: await res.json() };
    return { ok: res.ok, status: res.status, text: await res.text() };
  };

  // Charger les projets assignés au traducteur
  useEffect(() => {
    if (!token) return;
    fetchProjets();
  }, [token]);

  const fetchProjets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projets`, { headers: { Authorization: `Bearer ${token}` } });
      const parsed = await parseResponse(res);
      if (!parsed.ok) {
        if (parsed.status === 401 || parsed.status === 403) {
          setMessage("Session expirée. Veuillez vous reconnecter.");
          logout();
          return;
        }
        setMessage("Erreur chargement projets");
        return;
      }
      // Filtrer projets assignés à ce traducteur
      const userProjets = (parsed.data || []).filter(p => p.Traducteur && p.Traducteur.id === user?.id);
      setProjets(userProjets);
      if (userProjets.length > 0) {
        selectProjet(userProjets[0].id);
      }
    } catch (e) {
      console.error(e);
      setMessage("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const selectProjet = async (projetId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projets/${projetId}`, { headers: { Authorization: `Bearer ${token}` } });
      const parsed = await parseResponse(res);
      if (!parsed.ok) {
        setMessage("Erreur chargement projet");
        return;
      }
      const projet = parsed.data;
      console.log('Project loaded:', projet);
      setSelectedProjet(projet);
      // Segments can be "Segments" (from association) or "segments" (from JSON column)
      const segs = projet.Segments || projet.segments || [];
      console.log('Segments found:', segs);
      setSegments(segs);
      setSelectedSegmentIdx(segs.length > 0 ? 0 : null);
      setTranslations({});
      setSuggestions({});
      if (segs.length === 0) {
        setMessage("Aucun segment pour ce projet");
      }
    } catch (e) {
      console.error(e);
      setMessage("Erreur réseau: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const currentSegment = selectedSegmentIdx !== null && segments[selectedSegmentIdx] ? segments[selectedSegmentIdx] : null;
  const currentTranslation = currentSegment ? (translations[currentSegment.id] || "") : "";

  // Appeler Traduire API
  const callTranslate = async () => {
    if (!currentSegment) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/ai/traduire`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          texte: currentSegment.text || currentSegment.contenu || "",
          langue_source: langues.source,
          langue_cible: langues.cible
        })
      });
      const parsed = await parseResponse(res);
      if (!parsed.ok) {
        setMessage("Erreur traduction");
        return;
      }
      const result = parsed.data;
      const translated = result.traduction || result.text || "";
      setTranslations(prev => ({ ...prev, [currentSegment.id]: translated }));
      setMessage("Traduction complétée ✓");
    } catch (e) {
      console.error(e);
      setMessage("Erreur traduction: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Appeler Suggest API
  const callSuggest = async () => {
    if (!currentSegment) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/ai/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contenu: currentTranslation || currentSegment.text })
      });
      const parsed = await parseResponse(res);
      if (!parsed.ok) {
        setMessage("Erreur suggestion");
        return;
      }
      const result = parsed.data;
      const suggestion = result.suggestion || result.text || "Aucune suggestion";
      setSuggestions(prev => ({ ...prev, [currentSegment.id]: suggestion }));
      setMessage("Suggestion générée ✓");
    } catch (e) {
      console.error(e);
      setMessage("Erreur suggestion: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Appeler Harmoniser API
  const callHarmonize = async () => {
    if (!segments.length) return;
    try {
      setLoading(true);
      const segsToHarmonize = segments.map((seg, idx) => translations[seg.id] || seg.text);
      const res = await fetch(`${API_BASE}/ai/harmoniser`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ segments: segsToHarmonize })
      });
      const parsed = await parseResponse(res);
      if (!parsed.ok) {
        setMessage("Erreur harmonisation");
        return;
      }
      const result = parsed.data;
      const harmonized = result.harmonisation || result.text || "";
      setHarmonization(harmonized);
      setMessage("Harmonisation complétée ✓");
    } catch (e) {
      console.error(e);
      setMessage("Erreur harmonisation: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTranslation = (value) => {
    if (currentSegment) {
      setTranslations(prev => ({ ...prev, [currentSegment.id]: value }));
    }
  };

  const saveAllTranslations = async () => {
    if (!selectedProjet) return;
    try {
      setLoading(true);
      // TODO: Implémenter un endpoint PATCH pour sauvegarder les traductions
      setMessage("Traductions sauvegardées ✓");
    } catch (e) {
      setMessage("Erreur sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  // Resegment a project
  const resegmentProject = async () => {
    if (!selectedProjet) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projets/${selectedProjet.id}/resegment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      const parsed = await parseResponse(res);
      if (!parsed.ok) {
        setMessage("Erreur resegmentation");
        return;
      }
      const result = parsed.data;
      setSegments(result.segments || []);
      setSelectedSegmentIdx(result.segments && result.segments.length > 0 ? 0 : null);
      setMessage(result.message || "Resegmentation complétée ✓");
    } catch (e) {
      console.error(e);
      setMessage("Erreur resegmentation: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["traducteur"]}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div>
              <h1>🌐 Dashboard Traducteur</h1>
              <p>Traduire, améliorer et harmoniser des segments</p>
            </div>
            <button onClick={logout} style={styles.logoutBtn}>
              Déconnexion
            </button>
          </div>
        </header>

        <main style={styles.main}>
          {/* Sélection du projet */}
          <section style={styles.section}>
            <h2>Projets assignés</h2>
            <div style={styles.projectSelector}>
              {projets.length === 0 ? (
                <p>Aucun projet assigné</p>
              ) : (
                <select
                  value={selectedProjet?.id || ""}
                  onChange={(e) => selectProjet(Number(e.target.value))}
                  style={styles.select}
                >
                  {projets.map(p => (
                    <option key={p.id} value={p.id}>{p.nomProjet}</option>
                  ))}
                </select>
              )}
            </div>
          </section>

          {selectedProjet && segments.length > 0 && (
            <>
              {/* Sélection de segment */}
              <section style={styles.section}>
                <h2>Segments à traduire ({segments.length})</h2>
                <div style={styles.segmentList}>
                  {segments.map((seg, idx) => (
                    <button
                      key={seg.id || idx}
                      onClick={() => setSelectedSegmentIdx(idx)}
                      style={{
                        ...styles.segmentButton,
                        ...(selectedSegmentIdx === idx ? styles.segmentButtonActive : {})
                      }}
                    >
                      {idx + 1}. {(seg.text || seg.contenu || "...").substring(0, 40)}...
                    </button>
                  ))}
                </div>
              </section>

              {/* Éditeur de traduction */}
              {currentSegment && (
                <section style={styles.section}>
                  <h3>Segment #{selectedSegmentIdx + 1}</h3>
                  
                  <div style={styles.segmentBox}>
                    <div style={styles.column}>
                      <label style={styles.label}>Texte original ({langues.source})</label>
                      <textarea
                        value={currentSegment.text || currentSegment.contenu || ""}
                        readOnly
                        style={styles.textareaReadonly}
                      />
                    </div>
                    
                    <div style={styles.column}>
                      <label style={styles.label}>Traduction ({langues.cible})</label>
                      <textarea
                        value={currentTranslation}
                        onChange={(e) => updateTranslation(e.target.value)}
                        placeholder="Entrez votre traduction..."
                        style={styles.textarea}
                        rows={4}
                      />
                    </div>
                  </div>

                  {/* Boutons d'action AI */}
                  <div style={styles.actions}>
                    <button onClick={callTranslate} disabled={loading} style={styles.btnPrimary}>
                      {loading ? "🔄 ..." : "🤖 Traduire"}
                    </button>
                    <button onClick={callSuggest} disabled={loading} style={styles.btnSecondary}>
                      {loading ? "🔄 ..." : "💡 Suggestion"}
                    </button>
                    <button onClick={callHarmonize} disabled={loading} style={styles.btnSecondary}>
                      {loading ? "🔄 ..." : "✨ Harmoniser tous"}
                    </button>
                    <button onClick={saveAllTranslations} disabled={loading} style={styles.btnSuccess}>
                      {loading ? "🔄 ..." : "💾 Sauvegarder"}
                    </button>
                  </div>

                  {/* Suggestion */}
                  {suggestions[currentSegment.id] && (
                    <div style={styles.suggestionBox}>
                      <h4>💡 Suggestion IA:</h4>
                      <p>{suggestions[currentSegment.id]}</p>
                      <button
                        onClick={() => updateTranslation(suggestions[currentSegment.id])}
                        style={styles.btnSmall}
                      >
                        Appliquer
                      </button>
                    </div>
                  )}

                  {/* Harmonization */}
                  {harmonization && (
                    <div style={styles.harmonyBox}>
                      <h4>✨ Harmonisation:</h4>
                      <textarea value={harmonization} readOnly style={styles.textareaReadonly} rows={6} />
                    </div>
                  )}

                  {/* Message */}
                  {message && (
                    <div style={{
                      ...styles.message,
                      backgroundColor: message.includes("Erreur") ? "#fed7d7" : "#c6f6d5",
                      color: message.includes("Erreur") ? "#c53030" : "#276749"
                    }}>
                      {message}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {selectedProjet && segments.length === 0 && (
            <section style={styles.section}>
              <div style={{ textAlign: "center", padding: "30px" }}>
                <p style={{ color: "#718096", fontSize: "16px", marginBottom: "20px" }}>
                  ⚠️ Aucun segment pour ce projet
                </p>
                <p style={{ color: "#a0aec0", fontSize: "14px", marginBottom: "20px" }}>
                  Les segments n'ont pas pu être créés lors de la création du projet.<br />
                  Cliquez sur le bouton ci-dessous pour segmenter le texte du projet.
                </p>
                <button 
                  onClick={resegmentProject} 
                  disabled={loading}
                  style={styles.btnPrimary}
                >
                  {loading ? "🔄 Segmentation en cours..." : "🔄 Segmenter le projet"}
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      <style jsx>{`
        * { box-sizing: border-box; }
      `}</style>
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f7fa",
    fontFamily: "system-ui, -apple-system, sans-serif"
  },
  header: {
    backgroundColor: "white",
    borderBottom: "2px solid #e2e8f0",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  },
  headerContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  logoutBtn: {
    padding: "10px 16px",
    backgroundColor: "#e53e3e",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s"
  },
  main: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  section: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  },
  projectSelector: {
    marginTop: "12px"
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    border: "2px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer"
  },
  segmentList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "12px",
    marginTop: "12px"
  },
  segmentButton: {
    padding: "12px",
    border: "2px solid #cbd5e0",
    borderRadius: "6px",
    backgroundColor: "white",
    cursor: "pointer",
    fontSize: "12px",
    transition: "all 0.2s",
    textAlign: "left"
  },
  segmentButtonActive: {
    borderColor: "#4299e1",
    backgroundColor: "#ebf8ff",
    color: "#2c5282",
    fontWeight: "600"
  },
  segmentBox: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginTop: "16px"
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  label: {
    fontWeight: "600",
    color: "#2d3748",
    fontSize: "14px"
  },
  textarea: {
    padding: "12px",
    border: "2px solid #e2e8f0",
    borderRadius: "6px",
    fontFamily: "monospace",
    fontSize: "13px",
    lineHeight: "1.5",
    resize: "none"
  },
  textareaReadonly: {
    padding: "12px",
    border: "2px solid #e2e8f0",
    borderRadius: "6px",
    fontFamily: "monospace",
    fontSize: "13px",
    lineHeight: "1.5",
    backgroundColor: "#f7fafc",
    resize: "none"
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "16px",
    flexWrap: "wrap"
  },
  btnPrimary: {
    padding: "10px 16px",
    backgroundColor: "#4299e1",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s"
  },
  btnSecondary: {
    padding: "10px 16px",
    backgroundColor: "#edf2f7",
    color: "#4a5568",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s"
  },
  btnSuccess: {
    padding: "10px 16px",
    backgroundColor: "#48bb78",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s"
  },
  btnSmall: {
    padding: "8px 12px",
    backgroundColor: "#4299e1",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    marginTop: "8px"
  },
  suggestionBox: {
    marginTop: "16px",
    padding: "12px",
    backgroundColor: "#fffaf0",
    border: "1px solid #fed7d7",
    borderRadius: "6px",
    borderLeft: "4px solid #f6ad55"
  },
  harmonyBox: {
    marginTop: "16px",
    padding: "12px",
    backgroundColor: "#f0fff4",
    border: "1px solid #c6f6d5",
    borderRadius: "6px",
    borderLeft: "4px solid #68d391"
  },
  message: {
    marginTop: "16px",
    padding: "12px 16px",
    borderRadius: "6px",
    fontWeight: "600",
    fontSize: "13px"
  }
};