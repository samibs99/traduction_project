"use client";
import { useAuth } from "../app/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Si l'utilisateur n'est pas connecté
      if (!user) {
        router.push("/login");
        return;
      }

      // Si l'utilisateur n'a pas le rôle requis
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Rediriger vers le dashboard approprié ou page d'erreur
        if (user.role === "chef_projet") {
          router.push("/dashboard-chef");
        } else if (user.role === "traducteur") {
          router.push("/dashboard-traducteur");
        } else {
          router.push("/unauthorized");
        }
      }
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        fontSize: "1.5rem"
      }}>
        <div className="spinner"></div>
        <span style={{ marginLeft: "10px" }}>Chargement...</span>
        
        <style jsx>{`
          .spinner {
            width: 30px;
            height: 30px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Afficher les enfants seulement si l'utilisateur est connecté et a le bon rôle
  if (user && (!allowedRoles || allowedRoles.includes(user.role))) {
    return children;
  }

  return null;
}