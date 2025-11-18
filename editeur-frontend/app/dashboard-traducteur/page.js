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
  const [lastSaveResult, setLastSaveResult] = useState(null);
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
      const rawSegs = projet.Segments || projet.segments || [];
      console.log('Segments found (raw):', rawSegs);
      const segs = normalizeSegments(rawSegs);
      console.log('Segments normalized:', segs);
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

  // Wrapper to set a quick preview immediately when clicking a project
  const handleProjectClick = (projet) => {
    try {
      console.log('Project clicked:', projet.id, projet.nomProjet);
      // show a quick preview immediately
      setSelectedProjet(projet);
      // If the project object already contains segments (from the list), show them immediately
      const rawSegs = projet.Segments || projet.segments || [];
      if (rawSegs && rawSegs.length > 0) {
        const norm = normalizeSegments(rawSegs);
        setSegments(norm);
        setSelectedSegmentIdx(norm.length > 0 ? 0 : null);
      } else {
        // clear previous segments while loading
        setSegments([]);
        setSelectedSegmentIdx(null);
      }
      // fetch full project data (will call setSelectedProjet again)
      selectProjet(projet.id);
    } catch (e) {
      console.error('handleProjectClick error', e);
    }
  };

  // Normalize segments helper
  const normalizeSegments = (rawSegs) => {
    return (rawSegs || []).map((s, idx) => {
      if (typeof s === 'string') {
        return { id: `s-${idx + 1}`, text: s, classementnum: idx + 1 };
      }
      const src = s && s.dataValues ? s.dataValues : s || {};
      return {
        id: src.id || `s-${idx + 1}`,
        text: src.text || src.contenu || src.texte || '',
        classementnum: src.classementnum || src.classement || idx + 1
      };
    });
  };

  const currentSegment = selectedSegmentIdx !== null && segments[selectedSegmentIdx] ? segments[selectedSegmentIdx] : null;
  const currentTranslation = currentSegment ? (translations[currentSegment.id] || "") : "";

  const LANG_OPTIONS = [
    { code: "FR", label: "Français" },
    { code: "EN", label: "Anglais" },
    { code: "ES", label: "Espagnol" },
    { code: "DE", label: "Allemand" },
    { code: "IT", label: "Italien" },
    { code: "PT", label: "Portugais" },
    { code: "AR", label: "Arabe" }
  ];

  const changeLang = (which, value) => {
    setLangues(prev => ({ ...prev, [which]: value }));
  };

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
      console.log('Traduire response:', parsed);
      if (!parsed.ok) {
        const detail = parsed.data && parsed.data.detail ? parsed.data.detail : (parsed.text || parsed.status);
        setMessage("Erreur traduction: " + detail);
        return;
      }
      const result = parsed.data;
      const translated = result.traduction || result.text || "";
      setTranslations(prev => ({ ...prev, [currentSegment.id]: translated }));
      setMessage("Traduction complétée ✓");
    } catch (e) {
      console.error('Erreur traduction:', e);
      setMessage("Erreur traduction: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  // Appeler Suggest API
  const callSuggest = async () => {
    if (!currentSegment) return;
    const currentTranslated = translations[currentSegment.id] || '';
    if (!currentTranslated || currentTranslated.trim().length === 0) {
      setMessage('Aucune traduction disponible pour ce segment. Entrez ou générez d\'abord une traduction.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/ai/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contenu: currentTranslated })
      });
      const parsed = await parseResponse(res);
      console.log('Suggest response:', parsed);
      if (!parsed.ok) {
        const detail = parsed.data && parsed.data.detail ? parsed.data.detail : (parsed.text || parsed.status);
        setMessage("Erreur suggestion: " + detail);
        return;
      }
      const result = parsed.data;
      const suggestion = result.suggestion || result.text || "Aucune suggestion";
      setSuggestions(prev => ({ ...prev, [currentSegment.id]: suggestion }));
      setMessage("Suggestion générée ✓");
    } catch (e) {
      console.error('Erreur suggestion:', e);
      setMessage("Erreur suggestion: " + (e.message || e));
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
      console.log('Harmoniser response:', parsed);
      if (!parsed.ok) {
        const detail = parsed.data && parsed.data.detail ? parsed.data.detail : (parsed.text || parsed.status);
        setMessage("Erreur harmonisation: " + detail);
        return;
      }
      const result = parsed.data;
      const harmonized = result.harmonisation || result.text || "";
      setHarmonization(harmonized);
      setMessage("Harmonisation complétée ✓");
    } catch (e) {
      console.error('Erreur harmonisation:', e);
      setMessage("Erreur harmonisation: " + (e.message || e));
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
      // Build payload: only include segments that have numeric IDs (persisted)
      const traductions = segments.map(s => {
        const maybeId = Number(s.id);
        const segmentId = Number.isFinite(maybeId) ? Number(maybeId) : null;
        return {
          segmentId,
          classementnum: s.classementnum || null,
          texte_source: s.text || '',
          texte_traduit: translations[s.id] || '',
          traducteurId: user?.id || null,
          source: 'manual'
        };
      });

      const res = await fetch(`${API_BASE}/projets/${selectedProjet.id}/traductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ traductions })
      });
      const parsed = await parseResponse(res);
      if (!parsed.ok) {
        setMessage(parsed.text || JSON.stringify(parsed.data) || 'Erreur sauvegarde');
        return;
      }
      // Accept either old format (array) or new { created, skipped }
      let created = [];
      let skipped = [];
      if (Array.isArray(parsed.data)) {
        created = parsed.data;
      } else if (parsed.data && Array.isArray(parsed.data.created)) {
        created = parsed.data.created;
        skipped = parsed.data.skipped || [];
      }
      setMessage(`Traductions sauvegardées ✓ (${created.length})${skipped.length ? `, ignorées: ${skipped.length}` : ''}`);
      // store full backend response for debugging (created/skipped details)
      setLastSaveResult(parsed.data || null);

      // Update local translations map so translator UI reflects saved values
      try {
        const newMap = { ...translations };
        for (const tr of created) {
          // Try to match segment by segmentId if present, otherwise by classementnum or texte_source
          let matched = null;
          if (tr.segmentId) {
            matched = segments.find(s => Number(s.id) === Number(tr.segmentId) || String(s.id) === String(tr.segmentId));
          }
          if (!matched && tr.classementnum) {
            matched = segments.find(s => Number(s.classementnum) === Number(tr.classementnum));
          }
          if (!matched && tr.texte_source) {
            matched = segments.find(s => (s.text || '').trim() === (tr.texte_source || '').trim());
          }
          if (matched) {
            newMap[matched.id] = tr.texte_traduit || newMap[matched.id] || '';
          }
        }
        setTranslations(newMap);
      } catch (e) {
        console.warn('Erreur mise à jour état local après sauvegarde', e);
      }

      // Also fetch server-side traductions for debugging/confirmation (console)
      try {
        const check = await fetch(`${API_BASE}/projets/${selectedProjet.id}/traductions`, { headers: { Authorization: `Bearer ${token}` } });
        const parsedCheck = await parseResponse(check);
        console.log('Traductions from server after save:', parsedCheck);
      } catch (e) {
        console.warn('Impossible de récupérer traductions après sauvegarde', e);
      }
    } catch (e) {
      console.error('Erreur saveAllTranslations:', e);
      setMessage('Erreur sauvegarde: ' + (e.message || e));
    } finally { setLoading(false); }
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
            <div style={styles.headerTitle}>
              <div style={styles.logo}>🌐</div>
              <div>
                <h1 style={styles.title}>Dashboard Traducteur</h1>
                <p style={styles.subtitle}>Traduire, améliorer et harmoniser des segments</p>
              </div>
            </div>
            <div style={styles.headerActions}>
              <div style={styles.userInfo}>
                <span style={styles.userName}>{user?.name || user?.email}</span>
                <span style={styles.userRole}>Traducteur</span>
              </div>
              <button onClick={logout} style={styles.logoutBtn}>
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </header>

        <main style={styles.main}>
          {/* Sélection du projet */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Projets assignés</h2>
              <div style={styles.badge}>{projets.length} projet(s)</div>
            </div>
            
            <div style={styles.projectSelector}>
              {projets.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📂</div>
                  <p style={styles.emptyText}>Aucun projet assigné</p>
                </div>
              ) : (
                <div style={styles.projectGrid}>
                  {projets.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleProjectClick(p)}
                      style={{
                        ...styles.projectCard,
                        ...(selectedProjet?.id === p.id ? styles.projectCardActive : {}),
                      }}
                    >
                      <div style={styles.projectIcon}>📄</div>
                      <div style={styles.projectInfo}>
                        <h3 style={styles.projectName}>{p.nomProjet}</h3>
                        <p style={styles.projectMeta}>
                          {p.Segments ? `${p.Segments.length} segments` : 'Chargement...'}
                        </p>
                      </div>
                      <div style={styles.projectArrow}>→</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Afficher le contenu du projet sélectionné (texte source) */}
              {selectedProjet && (
                <div style={styles.projectContentBox}>
                  <h3 style={styles.projectContentTitle}>Contenu du projet</h3>
                  <div style={styles.textareaContainer}>
                    <textarea
                      readOnly
                      value={selectedProjet.texte || selectedProjet.text || selectedProjet.contenu || ""}
                      style={styles.textareaReadonly}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {selectedProjet && segments.length > 0 && (
            <>
              {/* Sélection de segment */}
              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Segments à traduire</h2>
                  <div style={styles.badge}>{segments.length} segment(s)</div>
                </div>
                
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
                      <span style={styles.segmentNumber}>{idx + 1}</span>
                      <span style={styles.segmentText}>
                        {(seg.text || seg.contenu || "...").substring(0, 45)}...
                      </span>
                      {translations[seg.id] && (
                        <div style={styles.translatedBadge}>✓</div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Éditeur de traduction */}
              {currentSegment && (
                <section style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>
                      Segment #{selectedSegmentIdx + 1}
                      {translations[currentSegment.id] && (
                        <span style={styles.translatedLabel}> - Traduit</span>
                      )}
                    </h3>
                  </div>
                  
                  <div style={styles.segmentBox}>
                    <div style={styles.langSelector}>
                      <div style={styles.langGroup}>
                        <label style={styles.label}>Langue source</label>
                        <select
                          value={langues.source}
                          onChange={(e) => changeLang('source', e.target.value)}
                          style={styles.select}
                        >
                          {LANG_OPTIONS.map(opt => (
                            <option key={opt.code} value={opt.code}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div style={styles.langArrow}>→</div>

                      <div style={styles.langGroup}>
                        <label style={styles.label}>Langue cible</label>
                        <select
                          value={langues.cible}
                          onChange={(e) => changeLang('cible', e.target.value)}
                          style={styles.select}
                        >
                          {LANG_OPTIONS.map(opt => (
                            <option key={opt.code} value={opt.code}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={styles.translationEditor}>
                      <div style={styles.column}>
                        <label style={styles.label}>
                          Texte original ({langues.source})
                        </label>
                        <div style={styles.textareaContainer}>
                          <textarea
                            value={currentSegment.text || currentSegment.contenu || ""}
                            readOnly
                            style={styles.textareaReadonly}
                          />
                        </div>
                      </div>
                      
                      <div style={styles.column}>
                        <label style={styles.label}>
                          Traduction ({langues.cible})
                        </label>
                        <div style={styles.textareaContainer}>
                          <textarea
                            value={currentTranslation}
                            onChange={(e) => updateTranslation(e.target.value)}
                            placeholder="Entrez votre traduction..."
                            style={styles.textarea}
                            rows={5}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'action AI */}
                  <div style={styles.actions}>
                    <button onClick={callTranslate} disabled={loading} style={styles.btnPrimary}>
                      <span style={styles.btnIcon}>🤖</span>
                      <span>Traduire automatiquement</span>
                    </button>
                    <button onClick={callSuggest} disabled={loading} style={styles.btnSecondary}>
                      <span style={styles.btnIcon}>💡</span>
                      <span>Obtenir une suggestion</span>
                    </button>
                    <button onClick={callHarmonize} disabled={loading} style={styles.btnSecondary}>
                      <span style={styles.btnIcon}>✨</span>
                      <span>Harmoniser tous les segments</span>
                    </button>
                    <button onClick={saveAllTranslations} disabled={loading} style={styles.btnSuccess}>
                      <span style={styles.btnIcon}>💾</span>
                      <span>Sauvegarder les traductions</span>
                    </button>
                  </div>

                  {/* Suggestion */}
                  {suggestions[currentSegment.id] && (
                    <div style={styles.suggestionBox}>
                      <div style={styles.suggestionHeader}>
                        <h4 style={styles.suggestionTitle}>💡 Suggestion de l'IA</h4>
                        <button
                          onClick={() => updateTranslation(suggestions[currentSegment.id])}
                          style={styles.btnSmall}
                        >
                          Appliquer
                        </button>
                      </div>
                      <p style={styles.suggestionText}>{suggestions[currentSegment.id]}</p>
                    </div>
                  )}

                  {/* Harmonization */}
                  {harmonization && (
                    <div style={styles.harmonyBox}>
                      <h4 style={styles.harmonyTitle}>✨ Harmonisation globale</h4>
                      <div style={styles.textareaContainer}>
                        <textarea value={harmonization} readOnly style={styles.textareaReadonly} rows={6} />
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {message && (
                    <div style={{
                      ...styles.message,
                      ...(message.includes("Erreur") ? styles.messageError : styles.messageSuccess)
                    }}>
                      {message}
                    </div>
                  )}
                  {/* Debug: show backend created/skipped details after save */}
                  {lastSaveResult && (
                    <div style={{ marginTop: 12, padding: 12, border: '1px dashed #cbd5e1', borderRadius: 8, background: '#f8fafc' }}>
                      <strong>Résultat sauvegarde (debug)</strong>
                      <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>
                        Créés: {Array.isArray(lastSaveResult.created) ? lastSaveResult.created.length : 0} — Ignorés: {Array.isArray(lastSaveResult.skipped) ? lastSaveResult.skipped.length : 0}
                      </div>
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: 'pointer' }}>Voir détails JSON</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, maxHeight: 240, overflow: 'auto', background: '#ffffff', padding: 8, borderRadius: 6 }}>{JSON.stringify(lastSaveResult, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {selectedProjet && segments.length === 0 && (
            <section style={styles.section}>
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>⚡</div>
                <h3 style={styles.emptyTitle}>Aucun segment disponible</h3>
                <p style={styles.emptyText}>
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
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#334155"
  },
  header: {
    backgroundColor: "white",
    borderBottom: "1px solid #e2e8f0",
    padding: "0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  },
  headerContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px"
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  logo: {
    fontSize: "32px",
    padding: "8px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "12px",
    width: "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1e293b",
    margin: "0"
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: "4px 0 0 0"
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px"
  },
  userName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e293b"
  },
  userRole: {
    fontSize: "12px",
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    padding: "2px 8px",
    borderRadius: "12px"
  },
  logoutBtn: {
    padding: "10px 16px",
    backgroundColor: "transparent",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  main: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  section: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #f1f5f9"
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1e293b",
    margin: "0",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  badge: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500"
  },
  projectSelector: {
    marginTop: "4px"
  },
  projectGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "12px"
  },
  projectCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    borderRadius: "8px",
    backgroundColor: "white",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left",
    width: "100%"
  },
  projectCardActive: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
    boxShadow: "0 0 0 1px #3b82f6"
  },
  projectIcon: {
    fontSize: "20px",
    padding: "8px",
    backgroundColor: "#f8fafc",
    borderRadius: "6px"
  },
  projectInfo: {
    flex: "1"
  },
  projectName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e293b",
    margin: "0 0 4px 0"
  },
  projectMeta: {
    fontSize: "12px",
    color: "#64748b",
    margin: "0"
  },
  projectArrow: {
    color: "#94a3b8",
    fontSize: "18px"
  },
  projectContentBox: {
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "1px solid #f1f5f9"
  },
  projectContentTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
    margin: "0 0 12px 0"
  },
  segmentList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "12px"
  },
  segmentButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    borderRadius: "8px",
    backgroundColor: "white",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left",
    position: "relative"
  },
  segmentButtonActive: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
    boxShadow: "0 0 0 1px #3b82f6"
  },
  segmentNumber: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "600",
    flexShrink: "0"
  },
  segmentText: {
    fontSize: "13px",
    color: "#475569",
    flex: "1",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  translatedBadge: {
    backgroundColor: "#10b981",
    color: "white",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: "bold",
    flexShrink: "0"
  },
  translatedLabel: {
    color: "#10b981",
    fontSize: "14px",
    fontWeight: "500"
  },
  segmentBox: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  langSelector: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    justifyContent: "center"
  },
  langGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  langArrow: {
    color: "#94a3b8",
    fontSize: "18px",
    marginTop: "20px"
  },
  translationEditor: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px"
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  label: {
    fontWeight: "600",
    color: "#374151",
    fontSize: "14px"
  },
  textareaContainer: {
    position: "relative"
  },
  textarea: {
    padding: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontFamily: "inherit",
    fontSize: "14px",
    lineHeight: "1.5",
    resize: "none",
    width: "100%",
    transition: "border-color 0.2s ease",
    backgroundColor: "white"
  },
  textareaReadonly: {
    padding: "16px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontFamily: "inherit",
    fontSize: "14px",
    lineHeight: "1.5",
    backgroundColor: "#f9fafb",
    resize: "none",
    width: "100%",
    color: "#6b7280"
  },
  select: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    backgroundColor: "white",
    minWidth: "140px"
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "20px",
    flexWrap: "wrap"
  },
  btnPrimary: {
    padding: "12px 20px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px"
  },
  btnSecondary: {
    padding: "12px 20px",
    backgroundColor: "white",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px"
  },
  btnSuccess: {
    padding: "12px 20px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px"
  },
  btnIcon: {
    fontSize: "16px"
  },
  btnSmall: {
    padding: "6px 12px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500"
  },
  suggestionBox: {
    marginTop: "20px",
    padding: "16px",
    backgroundColor: "#fffbeb",
    border: "1px solid #fcd34d",
    borderRadius: "8px",
    borderLeft: "4px solid #f59e0b"
  },
  suggestionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },
  suggestionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#92400e",
    margin: "0"
  },
  suggestionText: {
    fontSize: "14px",
    color: "#92400e",
    margin: "0",
    lineHeight: "1.5"
  },
  harmonyBox: {
    marginTop: "20px",
    padding: "16px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: "8px",
    borderLeft: "4px solid #22c55e"
  },
  harmonyTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#166534",
    margin: "0 0 8px 0"
  },
  message: {
    marginTop: "16px",
    padding: "12px 16px",
    borderRadius: "8px",
    fontWeight: "500",
    fontSize: "14px"
  },
  messageSuccess: {
    backgroundColor: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0"
  },
  messageError: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca"
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px"
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    opacity: "0.5"
  },
  emptyTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 12px 0"
  },
  emptyText: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 24px 0",
    lineHeight: "1.5"
  }
};