"use client";
import { useState } from "react";
import { useAuth } from "../AuthContext";
import Link from "next/link";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ 
    nom: "", 
    email: "", 
    motDePasse: "", 
    confirmMotDePasse: "",
    role: "traducteur"  // 👈 rôle par défaut
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!form.nom) newErrors.nom = "Le nom est requis";
    if (!form.email) newErrors.email = "L'email est requis";
    if (!form.motDePasse) newErrors.motDePasse = "Le mot de passe est requis";
    if (!form.confirmMotDePasse) newErrors.confirmMotDePasse = "La confirmation est requise";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      newErrors.email = "Email invalide";
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/;
    if (form.motDePasse && !passwordRegex.test(form.motDePasse)) {
      newErrors.motDePasse = "Le mot de passe doit contenir 8 caractères, une lettre, un chiffre et un symbole";
    }

    if (form.motDePasse !== form.confirmMotDePasse) {
      newErrors.confirmMotDePasse = "Les mots de passe ne correspondent pas";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
await register(form.nom, form.email, form.motDePasse, form.confirmMotDePasse, "traducteur");
      alert("Compte créé avec succès ✅");
      window.location.href = "/login";
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'inscription: " + (e.response?.data?.message || e.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Créer un compte</h1>
          <p>Rejoignez-nous et commencez votre expérience</p>
        </div>

        <form onSubmit={submit} className="register-form">
          {/* Nom */}
          <div className="form-group">
            <label htmlFor="nom">Nom complet</label>
            <input
              id="nom"
              name="nom"
              type="text"
              placeholder="Votre nom complet"
              value={form.nom}
              onChange={handleInputChange}
              className={errors.nom ? "error" : ""}
            />
            {errors.nom && <span className="error-message">{errors.nom}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="exemple@email.com"
              value={form.email}
              onChange={handleInputChange}
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          {/* Mot de passe */}
          <div className="form-group">
            <label htmlFor="motDePasse">Mot de passe</label>
            <input
              id="motDePasse"
              name="motDePasse"
              type="password"
              placeholder="Votre mot de passe"
              value={form.motDePasse}
              onChange={handleInputChange}
              className={errors.motDePasse ? "error" : ""}
            />
            {errors.motDePasse && <span className="error-message">{errors.motDePasse}</span>}
          </div>

          {/* Confirmation */}
          <div className="form-group">
            <label htmlFor="confirmMotDePasse">Confirmer le mot de passe</label>
            <input
              id="confirmMotDePasse"
              name="confirmMotDePasse"
              type="password"
              placeholder="Retapez votre mot de passe"
              value={form.confirmMotDePasse}
              onChange={handleInputChange}
              className={errors.confirmMotDePasse ? "error" : ""}
            />
            {errors.confirmMotDePasse && <span className="error-message">{errors.confirmMotDePasse}</span>}
          </div>

          {/* Sélecteur de rôle */}
          <div className="form-group">
            <label htmlFor="role">Rôle</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleInputChange}
              className="select-role"
            >
              <option value="traducteur">Traducteur</option>
              <option value="chef_projet">Chef de projet</option>
            </select>
          </div>

          {/* Bouton */}
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Création en cours..." : "Créer un compte"}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="login-link">Se connecter</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        /* 👇 garde le même design que ton code précédent */
        .register-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        .register-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 450px;
          padding: 40px;
        }
        .register-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .register-header h1 {
          color: #333;
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .form-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
        }
        .form-group label {
          font-weight: 500;
          margin-bottom: 6px;
        }
        .form-group input,
        .form-group select {
          padding: 14px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 16px;
        }
        .form-group input.error {
          border-color: #e74c3c;
        }
        .error-message {
          color: #e74c3c;
          font-size: 14px;
          margin-top: 5px;
        }
        .submit-button {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
        }
        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .register-footer {
          text-align: center;
          margin-top: 20px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        .login-link {
          color: #667eea;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
