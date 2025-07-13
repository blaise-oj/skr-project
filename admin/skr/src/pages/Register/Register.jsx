import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../assets/css/auth/AuthForms.css";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    return newErrors;
  };

  console.log("Registering admin with data:", {
    username: formData.username,
    email: formData.email,
    password: formData.password
  });


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
      const res = await fetch("http://localhost:4000/api/auth/admin/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        throw new Error("Unstable or no network connection. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data.message || "Admin registration failed");
      }

      alert("✅ Admin account created successfully!");
      navigate("/admin/dashboard");
    } catch (error) {
      const isNetworkError =
        error.message === "Failed to fetch" ||
        error.message.includes("NetworkError");

      setErrors({
        form: isNetworkError
          ? "Unstable or no network connection. Please try again."
          : error.message.includes("duplicate")
            ? "Admin username already exists"
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
          <h2>Create Admin Account</h2>
          <p>Fill in the details to create your account</p>
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
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
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

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? "error" : ""}
            />
            {errors.confirmPassword && (
              <span className="error-text">{errors.confirmPassword}</span>
            )}
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "Registering..." : "Register"}
          </button>

          <div className="auth-footer">
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Login here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;