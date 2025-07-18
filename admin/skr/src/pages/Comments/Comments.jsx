import { useEffect, useState } from "react";
import axios from "axios";

const Comments = () => {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const fetchComments = async () => {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        console.error("No token found");
        return;
      }

      try {
        const res = await axios.get("https://skr-project-backend.onrender.com/api/comments", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setComments(res.data);
      } catch (err) {
        console.error("Failed to fetch comments", err);
      }
    };

    fetchComments();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">User Comments</h2>
      {Array.isArray(comments) && comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map((comment) => (
            <div
              key={comment._id}
              className="bg-white shadow-sm px-4 py-2 rounded text-sm"
            >
              <p className="whitespace-normal">
                <strong>{comment.name}</strong> — 
                <strong> Email:</strong> {comment.email} — 
                <strong> Comment:</strong> {comment.comment}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p>No comments found or failed to load.</p>
      )}
    </div>
  );
};

export default Comments;
