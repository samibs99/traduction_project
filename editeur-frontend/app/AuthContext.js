"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ⚡ Vérifier le token au chargement
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      try {
        const decoded = JSON.parse(atob(savedToken.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);

        if (decoded.exp && decoded.exp > now) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        } else {
          // Token expiré
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } catch (err) {
        console.error("Erreur décodage token :", err);
      }
    }

    setLoading(false);
  }, []);

  // 📝 Inscription
  const register = async (nom, email, password, confirmPassword, role = "traducteur") => {
    const res = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, email, password, confirmPassword, role }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Erreur inscription");
    }

    return await res.json();
  };

  // 🔑 Connexion
  const login = async (email, password) => {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Erreur login");

    // Décoder token pour récupérer rôle + id
    const decoded = JSON.parse(atob(data.token.split(".")[1]));

    const userData = {
      email,
      role: decoded.role,
      id: decoded.id,
    };

    setToken(data.token);
    setUser(userData);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userData));

    // ✅ Redirection selon rôle
    if (decoded.role === "chef_projet") router.push("/dashboard-chef");
    else if (decoded.role === "traducteur") router.push("/dashboard-traducteur");
    else router.push("/login");
  };

  // 🚪 Déconnexion
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
