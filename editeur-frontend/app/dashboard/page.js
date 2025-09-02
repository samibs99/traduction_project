"use client";
import { useEffect } from "react";
import { useAuth } from "../AuthContext";

export default function Dashboard() {
  const { user, token, ready, logout } = useAuth();

  useEffect(() => {
    if (ready && !token) window.location.href = "/login";
  }, [ready, token]);

  if (!ready) return <p>Chargement…</p>;
  if (!user) return null;

  return (
    <div style={{ padding: 20 }}>
      <h1>Bienvenue {user.nom}</h1>
      <p>Rôle : {user.role}</p>

      <button onClick={logout}>Déconnexion</button>
      <br /><br />
      <a href="/">Aller à l’éditeur</a>
    </div>
  );
}
