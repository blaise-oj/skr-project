import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './Navbar.css';
import { assets } from '../../assets/assets';

const Navbar = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const handleLogout = () => {
    logout();              // Clear token
    navigate('/login');    //  Manually redirect after logout
  };

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        <img className="logo" src={assets.logo} alt="Logo" />
        <div className="brand-text">
          <span className="brand-title">Gordon Security</span>
          <span className="admin-subtitle">Admin Panel</span>
        </div>
      </div>


      <div className="navbar-right">
        {token ? (
          <button className="logout-btn" onClick={handleLogout}>
            <span className="btn-icon">🚪</span> Logout
          </button>
        ) : (
          <button className="login-btn" onClick={handleLogin}>
            <span className="btn-icon">🔑</span> Login
          </button>
        )}
        <img className="profile" src={assets.profile_icon} alt="Profile" />
      </div>
    </div>
  );
};

export default Navbar;
