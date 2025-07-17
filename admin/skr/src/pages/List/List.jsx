import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './List.css';

const List = () => {
  const navigate = useNavigate();

  const [showOnlyWithdrawn, setShowOnlyWithdrawn] = useState(false);
  const [showOnlyDeposited, setShowOnlyDeposited] = useState(false);


  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTrackingId, setSelectedTrackingId] = useState(null);
  const [notificationMethod, setNotificationMethod] = useState('');

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const res = await fetch("https://skr-project-backend.onrender.com/api/receipt");
      let data = await res.json();

      // Sort receipts by depositDate descending
      data.sort((a, b) => new Date(b.depositDate) - new Date(a.depositDate));

      setReceipts(data);
    } catch (error) {
      console.error("Error fetching receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this receipt?")) return;
    try {
      const res = await fetch(`https://skr-project-backend.onrender.com/api/receipt/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      alert(result.message);
      fetchReceipts();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleWithdrawClick = (trackingId) => {
    setSelectedTrackingId(trackingId);
    setNotificationMethod('');
    setShowModal(true);
  };

  const confirmWithdraw = async () => {
    if (!notificationMethod) {
      alert("Please select a notification method.");
      return;
    }

    try {
      const res = await fetch(`https://skr-project-backend.onrender.com/api/receipt/${selectedTrackingId}/withdraw`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationMethod }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error during withdrawal");
        return;
      }

      alert("Receipt withdrawn and notification sent.");
      fetchReceipts();
    } catch (err) {
      console.error("Withdraw error:", err);
      alert("Failed to withdraw receipt.");
    } finally {
      setShowModal(false);
    }
  };

  const downloadPDF = (trackingId) => {
    window.open(`https://skr-project-backend.onrender.com/api/receipt/${trackingId}/pdf`, "_blank");
  };

  const handleEdit = (receipt) => {
    navigate(`/edit/${receipt.trackingId}`);
  };

  const filteredReceipts = receipts
    .filter((r) =>
      r.trackingId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((r) => {
      if (showOnlyWithdrawn) return r.status === "withdrawn";
      if (showOnlyDeposited) return r.status === "deposited";
      return true;
    });



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="list">
      <h2>All Storage Receipts</h2>

      {/* Search filter */}
      <input
        type="text"
        placeholder="Search by Tracking ID..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />
      <div className="filter-toggles">
        <label>
          <input
            type="checkbox"
            checked={showOnlyWithdrawn}
            onChange={() => {
              setShowOnlyWithdrawn(!showOnlyWithdrawn);
              if (!showOnlyWithdrawn) setShowOnlyDeposited(false); // disable other toggle
            }}
          />
          Show Only Withdrawn Items
        </label>
        <label>
          <input
            type="checkbox"
            checked={showOnlyDeposited}
            onChange={() => {
              setShowOnlyDeposited(!showOnlyDeposited);
              if (!showOnlyDeposited) setShowOnlyWithdrawn(false); // disable other toggle
            }}
          />
          Show Only Deposited Items
        </label>
      </div>



      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="list-table">
          <thead>
            <tr>
              <th>Track ID</th>
              <th>Item</th>
              <th>Weight</th>
              <th>Client</th>
              <th>Status</th>
              <th>Deposit Date</th>
              <th>Withdrawal Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReceipts.map((r) => (
              <tr key={r._id}>
                <td>{r.trackingId}</td>
                <td>{r.name}</td>
                <td>{r.weight} kgs</td>
                <td>{r.client?.name || "N/A"}</td>
                <td>{r.status}</td>
                <td>{r.depositDate ? formatDate(r.depositDate) : "N/A"}</td>
                <td>{r.withdrawalDate ? formatDate(r.withdrawalDate) : "-"}</td>
                <td>
                  <button className="edit-btn" onClick={() => handleEdit(r)}>Edit</button>
                  
                  <button className="download-btn-deposit" onClick={() => downloadPDF(r.trackingId)}>
                    Download Deposited Receipt
                  </button>
                  {r.status !== "withdrawn" ? (
                    <button className="withdraw-btn" onClick={() => handleWithdrawClick(r.trackingId)}>
                      Withdraw
                    </button>
                  ) : (
                    <button className="download-btn-withdraw" onClick={() => downloadPDF(r.trackingId)}>
                      Download Withdrawn Receipt
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal for selecting notification method */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Notify client for: {selectedTrackingId}</h3>

            <select
              value={notificationMethod}
              onChange={(e) => setNotificationMethod(e.target.value)}
            >
              <option value="">Select notification method</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>

            <div className="modal-buttons">
              <button onClick={confirmWithdraw}>Confirm Withdraw</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default List;
