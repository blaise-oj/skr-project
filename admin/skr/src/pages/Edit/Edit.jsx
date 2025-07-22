import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import './Edit.css';

const Edit = () => {
  const { trackingId: initialTrackingId } = useParams();
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState(initialTrackingId || '');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchReceipt = async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken"); // Make sure the token is stored

      const res = await fetch(`https://skr-project-backend.onrender.com/api/receipt/track/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Send token here
        },
        credentials: 'include' // Important for cross-origin cookies (if any)
      });

      if (!res.ok) throw new Error('Receipt not found');
      const data = await res.json();
      setReceipt(data);
      setError('');
      setSuccess('');
    } catch (err) {
      setReceipt(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleSearch = () => {
    if (!trackingId.trim()) {
      setError("Please enter a valid Tracking ID");
      return;
    }
    fetchReceipt(trackingId);
  };



  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this receipt?")) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`https://skr-project-backend.onrender.com/api/receipt/${receipt._id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();
      alert(data.message || "Receipt deleted");
      navigate("/list");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete receipt");
    }
  };

  const handleChange = (e) => {
    setReceipt({ ...receipt, [e.target.name]: e.target.value });
  };

  const handleClientChange = (e) => {
    setReceipt({
      ...receipt,
      client: { ...receipt.client, [e.target.name]: e.target.value }
    });
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`https://skr-project-backend.onrender.com/api/receipt/${receipt._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(receipt)
      });

      if (!res.ok) throw new Error('Failed to update receipt');
      const updated = await res.json();
      setReceipt(updated);
      setSuccess('Receipt updated successfully');
      setError('');
    } catch (err) {
      setSuccess('');
      setError(err.message);
    }
  };

  return (
    <div className="edit-page">
      <h2>Edit Receipt</h2>

      <div className="search-box">
        <input
          type="text"
          placeholder="Enter Tracking ID"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error-msg">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      {receipt && (
        <div className="edit-form">
          <input
            type="text"
            name="name"
            value={receipt.name}
            onChange={handleChange}
            placeholder="Item Name"
          />
          <input
            type="number"
            name="quantity"
            value={receipt.quantity}
            onChange={handleChange}
            placeholder="Quantity"
          />
          <input
            type="number"
            name="weight"
            value={receipt.weight}
            onChange={handleChange}
            placeholder="Weight (kg)"
          />
          <input
            type="text"
            name="status"
            value={receipt.status}
            onChange={handleChange}
            placeholder="Status (e.g., deposited)"
          />

          <h4>Client Info</h4>
          <input
            type="text"
            name="name"
            value={receipt.client?.name || ''}
            onChange={handleClientChange}
            placeholder="Client Name"
          />
          <input
            type="tel"
            name="phone"
            value={receipt.client?.phone || ''}
            onChange={handleClientChange}
            placeholder="Phone"
          />
          <input
            type="email"
            name="email"
            value={receipt.client?.email || ''}
            onChange={handleClientChange}
            placeholder="Email"
          />

          <button onClick={handleUpdate}>Save Changes</button>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="delete-btn" onClick={handleDelete}>Delete Receipt</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Edit;
