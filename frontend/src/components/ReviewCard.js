"use client";

import { useState, useEffect } from "react";
import { api, getCurrentUser } from "../lib/api";

function StarDisplay({ rating }) {
  return (
    <span className="text-gold">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export default function ReviewCard({ review, onDelete, onEdit, onFriendRequest, currentUser, sentRequests }) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);

  // Load initial like count and comments
  useEffect(() => {
    loadLikes();
    loadComments();
  }, [review.id]);

  async function loadLikes() {
    try {
      const data = await api.reviewLikes(review.id);
      setLikeCount(data.likeCount || 0);
      setIsLiked(data.likes?.some((l) => l.user_id === currentUser?.id) || false);
    } catch (err) {
      console.error("Failed to load likes:", err);
    }
  }

  async function loadComments() {
    try {
      const data = await api.reviewComments(review.id, 1, 5);
      setComments(data.comments || []);
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  }

  async function toggleLike() {
    if (!currentUser) return;
    setLikeLoading(true);
    try {
      if (isLiked) {
        const data = await api.unlikeReview(review.id);
        setLikeCount(data.likeCount || 0);
        setIsLiked(false);
      } else {
        const data = await api.likeReview(review.id);
        setLikeCount(data.likeCount || 0);
        setIsLiked(true);
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    } finally {
      setLikeLoading(false);
    }
  }

  async function addComment() {
    if (!newComment.trim() || !currentUser) return;
    setCommentLoading(true);
    try {
      const newCommentData = await api.addReviewComment(review.id, newComment);
      setComments([newCommentData, ...comments]);
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setCommentLoading(false);
    }
  }

  async function updateComment(commentId) {
    if (!editingCommentText.trim()) return;
    try {
      const updated = await api.updateReviewComment(commentId, editingCommentText);
      setComments(comments.map((c) => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      console.error("Failed to update comment:", err);
    }
  }

  async function deleteComment(commentId) {
    try {
      await api.deleteReviewComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  }

  return (
    <div className="card-surface rounded-2xl p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-medium text-mist">{review.username}</p>
              <p className="text-xs text-mist/50">
                {new Date(review.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-2 text-sm text-gold">
            <StarDisplay rating={review.rating} />
          </div>
        </div>
        {currentUser && currentUser.id === review.user_id && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(review.user_id)}
              className="rounded-lg border border-white/20 px-2 py-1 text-xs text-mist/60 hover:text-ember"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(review.tmdb_id || review.movie_id)}
              className="rounded-lg border border-red-500/50 px-2 py-1 text-xs text-red-500 hover:bg-red-500/15"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Review Text */}
      <p className="mt-3 text-sm text-mist/85">{review.review}</p>

      {/* Like and Comment Actions */}
      <div className="mt-4 flex gap-4 border-t border-white/10 pt-3">
        <button
          onClick={toggleLike}
          disabled={!currentUser || likeLoading}
          className={`flex items-center gap-1 text-xs transition ${
            isLiked
              ? "text-red-500"
              : currentUser
              ? "text-mist/60 hover:text-red-500"
              : "text-mist/40 cursor-not-allowed"
          }`}
        >
          <span className={isLiked ? "text-lg" : "text-lg"}>♥</span>
          <span>{likeCount}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 text-xs text-mist/60 hover:text-mist transition"
        >
          <span>💬</span>
          <span>{comments.length}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
          {/* Add Comment Form */}
          {currentUser && (
            <div className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="w-full rounded-lg border border-white/20 bg-[#102032] px-3 py-2 text-xs text-mist placeholder-mist/40 outline-none focus:border-ember"
              />
              <button
                onClick={addComment}
                disabled={!newComment.trim() || commentLoading}
                className="rounded-lg bg-ember px-3 py-1 text-xs text-white disabled:opacity-50"
              >
                {commentLoading ? "Posting..." : "Post"}
              </button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-lg bg-white/5 p-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-mist">{comment.username}</p>
                      <p className="text-xs text-mist/50">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {currentUser && currentUser.id === comment.user_id && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingCommentText(comment.comment);
                          }}
                          className="text-xs text-mist/60 hover:text-amber-400"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="text-xs text-red-500 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {editingCommentId === comment.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-white/20 bg-[#102032] px-2 py-1 text-xs text-mist outline-none focus:border-ember"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateComment(comment.id)}
                          className="rounded-lg bg-ember px-2 py-1 text-xs text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="rounded-lg border border-white/20 px-2 py-1 text-xs text-mist/60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-mist/75">{comment.comment}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-mist/50">No comments yet. Be the first!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
