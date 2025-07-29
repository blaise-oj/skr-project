import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './Navbar.css';
import { assets } from '../../assets/assets';

const Navbar = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth(); 
  const [showMenu, setShowMenu] = useState(false); // <-- for dropdown toggle

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const toggleMenu = () => {
    setShowMenu((prev) => !prev);
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
          <>
            <button className="logout-btn" onClick={handleLogout}>
              <span className="btn-icon">🚪</span> Logout
            </button>
            <div className="profile-container">
              <img
                className="profile"
                src={assets.profile_icon}
                alt="Profile"
                onClick={toggleMenu}
              />
              {showMenu && (
                <div className="profile-dropdown">
                  <Link to="/register" className="dropdown-item">
                    📝 Register Admin
                  </Link>
                  {/* You can add more options here */}
                </div>
              )}
            </div>
          </>
        ) : (
          <button className="login-btn" onClick={handleLogin}>
            <span className="btn-icon">🔑</span> Login
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
