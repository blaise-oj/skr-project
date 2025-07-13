// src/pages/EditChooser/EditChooser.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EditChooser.css"; // optional for styling

const EditChooser = () => {
  const [trackingId, setTrackingId] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!trackingId.trim()) {
      alert("Please enter a valid Tracking ID.");
      return;
    }
    navigate(`/edit/${trackingId}`);
  };

  return (
    <div className="edit-chooser">
      <h2>Edit Receipt</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter Tracking ID..."
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
        />
        <button type="submit">Go to Edit</button>
      </form>
    </div>
  );
};

export default EditChooser;
