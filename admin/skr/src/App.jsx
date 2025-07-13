import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/sidebar/sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import Add from './pages/Add/Add';
import List from './pages/List/List';
import EditChooser from './pages/EditChooser/EditChooser';
import Edit from './pages/Edit/Edit';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import './App.css';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Messages from './pages/Messages/Messages.jsx';



const AppLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Navbar />
      <div className="content-wrapper">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  console.log("App.jsx rendered");

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          index
          element={
            <AppLayout>
              <Dashboard />
            </AppLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <Dashboard />
            </AppLayout>
          }
        />
        <Route
          path="/add"
          element={
            <AppLayout>
              <Add />
            </AppLayout>
          }
        />
        <Route
          path="/list"
          element={
            <AppLayout>
              <List />
            </AppLayout>
          }
        />
        <Route
          path="/edit"
          element={
            <AppLayout>
              <EditChooser />
            </AppLayout>
          }
        />

        <Route
          path="/edit/:trackingId"
          element={
            <AppLayout>
              <Edit />
            </AppLayout>
          }
        />
      </Route>
      
      <Route
        path="/messages"
        element={
          <AppLayout>
            <Messages />
          </AppLayout>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>


  );
};

export default App;