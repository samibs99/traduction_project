"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ 
    email: "", 
    motDePasse: "" 
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirection si déjà connecté
  useEffect(() => {
    if (!loading && user) {
      if (user.role === "chef_projet") {
        router.push("/dashboard-chef");
      } else if (user.role === "traducteur") {
        router.push("/dashboard-traducteur");
      }
    }
  }, [user, loading, router]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.email) newErrors.email = "L'email est requis";
    if (!form.motDePasse) newErrors.motDePasse = "Le mot de passe est requis";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      newErrors.email = "Email invalide";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      await login(form.email, form.motDePasse);
    } catch (error) {
      console.error(error);
      setErrors({ submit: error.message || "Erreur lors de la connexion" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Chargement...
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Connexion</h1>
          <p>Accédez à votre espace personnel</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
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
          </div>

          {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}

          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="spinner"></div>
                Connexion...
              </>
            ) : (
              "Se connecter"
            )}
          </button>

          <div className="login-footer">
            <p>
              Pas encore de compte?{" "}
              <Link href="/register" className="register-link">Créer un compte</Link>
            </p>
          </div>
        </form>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        
        .login-card {
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
        
        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .login-header h1 {
          color: #333;
          font-size: 28px;
          font-weight: 600;
          margin: 0 0 10px 0;
        }
        
        .login-header p {
          color: #666;
          margin: 0;
          font-size: 16px;
        }
        
        .login-form {
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
        
        .submit-error {
          text-align: center;
          padding: 10px;
          background-color: #ffebee;
          border-radius: 6px;
          border-left: 4px solid #e74c3c;
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
        
        .login-footer {
          text-align: center;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        
        .login-footer p {
          color: #666;
          margin: 0;
          font-size: 16px;
        }
        
        .register-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        
        .register-link:hover {
          color: #764ba2;
          text-decoration: underline;
        }
        
        @media (max-width: 480px) {
          .login-card {
            padding: 25px;
          }
          
          .login-header h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}