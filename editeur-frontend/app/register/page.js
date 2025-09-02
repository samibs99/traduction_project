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
    confirmMotDePasse: "" 
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Champs requis
    if (!form.nom) newErrors.nom = "Le nom est requis";
    if (!form.email) newErrors.email = "L'email est requis";
    if (!form.motDePasse) newErrors.motDePasse = "Le mot de passe est requis";
    if (!form.confirmMotDePasse) newErrors.confirmMotDePasse = "La confirmation du mot de passe est requise";

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      newErrors.email = "Email invalide";
    }

    // Validation mot de passe
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (form.motDePasse && !passwordRegex.test(form.motDePasse)) {
      newErrors.motDePasse = "Le mot de passe doit contenir au moins 8 caractères, une lettre, un chiffre et un symbole";
    }

    // Vérifier correspondance
    if (form.motDePasse && form.confirmMotDePasse && form.motDePasse !== form.confirmMotDePasse) {
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
      await register(form.nom, form.email, form.motDePasse, form.confirmMotDePasse);
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
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Créer un compte</h1>
          <p>Rejoignez-nous et commencez votre expérience</p>
        </div>

        <form onSubmit={submit} className="register-form">
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
            <div className="password-requirements">
              <p>Le mot de passe doit contenir:</p>
              <ul>
                <li className={form.motDePasse.length >= 8 ? "valid" : ""}>Au moins 8 caractères</li>
                <li className={/[A-Za-z]/.test(form.motDePasse) ? "valid" : ""}>Une lettre</li>
                <li className={/\d/.test(form.motDePasse) ? "valid" : ""}>Un chiffre</li>
                <li className={/[@$!%*#?&]/.test(form.motDePasse) ? "valid" : ""}>Un symbole</li>
              </ul>
            </div>
          </div>

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

          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="spinner"></div>
                Création en cours...
              </>
            ) : (
              "Créer un compte"
            )}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Vous avez déjà un compte?{" "}
            <Link href="/login" className="login-link">Se connecter</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
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
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .register-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .register-header h1 {
          color: #333;
          font-size: 28px;
          font-weight: 600;
          margin: 0 0 10px 0;
        }
        
        .register-header p {
          color: #666;
          margin: 0;
          font-size: 16px;
        }
        
        .register-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .form-group label {
          font-weight: 500;
          margin-bottom: 8px;
          color: #444;
          font-size: 14px;
        }
        
        .form-group input {
          padding: 14px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.3s ease;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .form-group input.error {
          border-color: #e74c3c;
        }
        
        .error-message {
          color: #e74c3c;
          font-size: 14px;
          margin-top: 5px;
        }
        
        .password-requirements {
          margin-top: 8px;
          padding: 12px;
          background-color: #f8f9fa;
          border-radius: 6px;
          font-size: 13px;
        }
        
        .password-requirements p {
          margin: 0 0 8px 0;
          font-weight: 500;
          color: #555;
        }
        
        .password-requirements ul {
          margin: 0;
          padding-left: 20px;
          color: #777;
        }
        
        .password-requirements li {
          margin-bottom: 4px;
        }
        
        .password-requirements li.valid {
          color: #27ae60;
          text-decoration: line-through;
        }
        
        .submit-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 16px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }
        
        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .register-footer {
          text-align: center;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        
        .register-footer p {
          color: #666;
          margin: 0;
        }
        
        .login-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        
        .login-link:hover {
          color: #764ba2;
          text-decoration: underline;
        }
        
        @media (max-width: 480px) {
          .register-card {
            padding: 25px;
          }
          
          .register-header h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}