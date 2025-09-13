"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifier le token au chargement
  useEffect(() => {
    const initializeAuth = () => {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (savedToken && savedUser) {
        try {
          // Vérifier si le token est expiré
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
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Inscription
  const register = async (nom, email, motDePasse, confirmMotDePasse, role = "traducteur") => {
    try {
      // Validation côté client avant l'envoi
      if (!nom || !email || !motDePasse || !confirmMotDePasse) {
        throw new Error("Tous les champs sont requis");
      }

      if (motDePasse !== confirmMotDePasse) {
        throw new Error("Les mots de passe ne correspondent pas");
      }

      console.log("Envoi des données au serveur:", {
        nom,
        email,
        password: motDePasse, // Changement ici: motDePasse → password
        confirmPassword: confirmMotDePasse, // Changement ici: confirmMotDePasse → confirmPassword
        role
      });

      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          nom, 
          email, 
          password: motDePasse, // Changement ici
          confirmPassword: confirmMotDePasse, // Changement ici
          role 
        }),
      });

      const data = await res.json();
      
      console.log("Réponse du serveur:", data);
      
      if (!res.ok) {
        // Vérifier si le message d'erreur vient du serveur ou est générique
        const errorMessage = data.message || data.error || "Erreur lors de l'inscription";
        throw new Error(errorMessage);
      }
      
      return data;
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      throw error;
    }
  };

  // Connexion
  const login = async (email, motDePasse) => {
    try {
      console.log("Tentative de connexion:", { email, password: motDePasse });

      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email, 
          password: motDePasse // Changement ici
        }),
      });

      const data = await res.json();
      
      console.log("Réponse de connexion:", data);
      
      if (!res.ok) {
        const errorMessage = data.message || data.error || "Erreur lors de la connexion";
        throw new Error(errorMessage);
      }

      // Décoder token pour récupérer rôle + id
      const decoded = JSON.parse(atob(data.token.split(".")[1]));

      const userData = {
        email,
        nom: decoded.nom,
        role: decoded.role,
        id: decoded.id,
      };

      setToken(data.token);
      setUser(userData);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(userData));

      // Redirection selon rôle
      if (decoded.role === "chef_projet") {
        router.push("/dashboard-chef");
      } else if (decoded.role === "traducteur") {
        router.push("/dashboard-traducteur");
      } else {
        router.push("/");
      }
      
      return data;
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      throw error;
    }
  };

  // Déconnexion
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
};