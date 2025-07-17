import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // ✅ Import useAuth
import "../../assets/css/auth/AuthForms.css";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); // ✅ Use login from AuthContext

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.password) newErrors.password = "Password is required";
    return newErrors;
  };

  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard"; // fallback if no prior route

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!navigator.onLine) {
      setErrors({ form: "You are offline. Please check your internet connection." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("https://skr-project-backend.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        throw new Error("Unstable or no network connection. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      login(data.token); // ✅ Use context login method , set token
      navigate(from, { replace: true }); // ✅ Smart redirect
    } catch (error) {
      const isNetworkError =
        error.message === "Failed to fetch" ||
        error.message.includes("NetworkError");

      setErrors({
        form: isNetworkError
          ? "Unstable or no network connection. Please try again."
          : error.message,
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Admin Login</h2>
          <p>Welcome back! Please enter your credentials</p>
        </div>

        {errors.form && <div className="error-message">{errors.form}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              className={errors.username ? "error" : ""}
            />
            {errors.username && (
              <span className="error-text">{errors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? "error" : ""}
            />
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          <div className="form-options">
            <div className="remember-me">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">Remember me</label>
            </div>
            <Link to="/forgot-password" className="forgot-password">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="auth-footer">
            Don't have an account?{" "}
            <Link to="/register" className="auth-link">
              Register here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
