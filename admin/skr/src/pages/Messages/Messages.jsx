import { useEffect, useState } from "react";
import axios from "axios";

const Messages = () => {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const fetchMessages = async () => {
            const token = localStorage.getItem("adminToken"); // 👈 Get stored token
            if (!token) {
                console.error("No token found");
                return;
            }

            try {
                const res = await axios.get("https://skr-project-backend.onrender.com/api/messages", {
                    headers: {
                        Authorization: `Bearer ${token}` // 👈 Send token in header
                    }
                });
                setMessages(res.data);
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        };

        fetchMessages();
    }, []);

    return (
        <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">What Our Clients Say</h2>
            {Array.isArray(messages) && messages.length > 0 ? (
                <div className="space-y-2">
                    {messages.map((msg) => (
                        <div
                            key={msg._id}
                            className="bg-white shadow-sm px-4 py-2 rounded text-sm"
                        >
                            <p className="whitespace-normal">
                                <strong>{msg.name}</strong> —
                                <strong> Subject:</strong> {msg.subject} —
                                <strong> Message:</strong> {msg.message}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p>No messages found or failed to load.</p>
            )}


        </div>
    );
};

export default Messages;
