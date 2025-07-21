import React, { useState } from "react";
import "./Add.css";

const AddReceipt = () => {
    const [formData, setFormData] = useState({
        name: "",
        quantity: "",
        weight: "",
        image: "",
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        identification: "",
    });

    const [message, setMessage] = useState("");
    const [trackCode, setTrackCode] = useState("");
    const [searchedReceipt, setSearchedReceipt] = useState(null);

    // Form input handler
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Submit form
   const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("adminToken");

    const receiptPayload = {
        name: formData.name,
        quantity: parseInt(formData.quantity),
        weight: parseFloat(formData.weight),
        image: formData.image,
        client: {
            name: formData.clientName,
            phone: formData.clientPhone,
            email: formData.clientEmail,
            identification: formData.identification,
        },
    };

    try {
        const response = await fetch("https://skr-project-backend.onrender.com/api/receipt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // ✅ Correctly placed inside headers
            },
            body: JSON.stringify(receiptPayload),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Creation failed");

        setMessage(`✅ Receipt created! Track Code: ${data.trackingId}`);
        setFormData({
            name: "",
            quantity: "",
            weight: "",
            image: "",
            clientName: "",
            clientPhone: "",
            clientEmail: "",
            identification: "",
        });
    } catch (err) {
        setMessage(`❌ ${err.message}`);
    }
};


    // Search by track code
    const searchReceipt = async () => {
        try {
            const res = await fetch(`https://skr-project-backend.onrender.com/api/receipt/track/${trackCode}`);
            if (!res.ok) {
                setSearchedReceipt(null);
                return setMessage("❌ Receipt not found");
            }
            const receipt = await res.json();
            setSearchedReceipt(receipt);
            setMessage(""); // this clears any previous messages
        } catch (err) {
            console.error(err);
            setMessage("❌ Failed to fetch receipt");
        }
    };

    const downloadPDF = (trackingId) => {
        window.open(`https://skr-project-backend.onrender.com/api/receipt/${trackingId}/pdf`, "_blank");
    };


    return (
        <div className="add-page">
            <h2>Create New Receipt</h2>
            <form className="add-form" onSubmit={handleSubmit}>
                <label>Item Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required />

                <label>Quantity</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required />

                <label>Weight (kgs)</label>
                <div className="weight-display-wrapper">
                    <input
                        type="text"
                        name="weight"
                        value={formData.weight}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^\d.]/g, ''); // Allow only numbers and .
                            setFormData((prev) => ({ ...prev, weight: val }));
                        }}
                        required
                    />
                    <span className="unit-suffix">kgs</span>
                </div>


                <label>Image URL (optional)</label>
                <input type="text" name="image" value={formData.image} onChange={handleChange} />

                <hr />
                <label>Client Name</label>
                <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} required />

                <label>Client Phone</label>
                <input type="tel" name="clientPhone" value={formData.clientPhone} onChange={handleChange} required />

                <label>Client Email</label>
                <input type="email" name="clientEmail" value={formData.clientEmail} onChange={handleChange} required />

                <label>Identification (optional)</label>
                <input type="text" name="identification" value={formData.identification} onChange={handleChange} />

                <button type="submit">Create Receipt</button>
            </form>

            {message && <p className="message">{message}</p>}

            <hr />
            <h2>Search Receipt by Tracking Code</h2>
            <div className="track-search">
                <input
                    type="text"
                    placeholder="Enter Tracking ID (e.g. ABC123XY)"
                    value={trackCode}
                    onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
                />
                <button onClick={searchReceipt}>Search</button>
            </div>

            {searchedReceipt && (
                <div className="receipt-details">
                    <h3>Receipt Found</h3>
                    <p><strong>Item:</strong> {searchedReceipt.name}</p>
                    <p><strong>Quantity:</strong> {searchedReceipt.quantity}</p>
                    <p><strong>Weight:</strong> {searchedReceipt.weight} kg</p>
                    <p><strong>Tracking ID:</strong> {searchedReceipt.trackingId}</p>
                    <p><strong>Status:</strong> {searchedReceipt.status}</p>
                    <p><strong>Deposit Date:</strong> {new Date(searchedReceipt.depositDate).toLocaleString()}</p>
                    <p><strong>Client:</strong> {searchedReceipt.client?.name}</p>
                    <p><strong>Phone:</strong> {searchedReceipt.client?.phone}</p>
                    <p><strong>Email:</strong> {searchedReceipt.client?.email}</p>
                    <p><strong>ID:</strong> {searchedReceipt.client?.identification || "N/A"}</p>

                    <button onClick={() => downloadPDF(searchedReceipt.trackingId)}>
                        Download PDF
                    </button>
                </div>
            )}
        </div>
    );
};

export default AddReceipt;
