"use client";

import Link from "next/link";
import { useState } from "react";
import { PenLine } from "lucide-react";

type RecentPost = {
  id: string;
  title: string | null;
  hook: string | null;
  body: string;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
};

const statusOptions = ["draft", "ready_to_post", "published", "archived", "idea", "researching"];

export function RecentDraftsClient({ posts }: { posts: RecentPost[] }) {
  const [statusFilter, setStatusFilter] = useState("draft");
  const normalizedPosts = posts.map((post) => ({ ...post, status: normalizePostStatus(post.status) }));
  const filteredPosts = normalizedPosts.filter((post) => post.status === statusFilter);

  return (
    <div className="grid">
      <label>
        Status
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <div className="list">
        {filteredPosts.length === 0 ? (
          <p>No posts found for this status.</p>
        ) : (
          filteredPosts.map((post) => (
            <div className="list-item" key={post.id}>
              <div>
                <h3>{post.title ?? post.hook ?? "Untitled draft"}</h3>
                <p>{post.body.slice(0, 180)}</p>
                {post.publishedAt ? <p>Published: {new Date(post.publishedAt).toLocaleDateString()}</p> : null}
                <Link className="button" href={`/drafts/${post.id}`}>
                  <PenLine size={17} /> Edit draft
                </Link>
              </div>
              <span className="status">{post.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function normalizePostStatus(status: string) {
  return status === "edited" ? "draft" : status;
}
