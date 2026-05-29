"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FileText, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type SourceListItem = {
  id: string;
  title: string | null;
  type: string;
  status: string;
  summary: string | null;
  cleanContent?: string | null;
  url?: string | null;
  tags: string[];
};

const sourceTypes = [
  "Public URL",
  "Deloitte public URL",
  "YouTube/video URL",
  "Pasted text",
  "Book notes",
  "Manual idea"
];

export function SourcesClient() {
  const [sources, setSources] = useState<SourceListItem[]>([]);
  const [sourceType, setSourceType] = useState(sourceTypes[0]);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    type: sourceTypes[0],
    title: "",
    url: "",
    cleanContent: "",
    summary: "",
    status: "queued",
    tags: ""
  });

  async function loadSources() {
    const response = await fetch("/api/sources", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Sources could not be loaded.");
    }
    setSources(data.sources ?? []);
  }

  useEffect(() => {
    loadSources().catch(() => setMessage("Could not load saved sources."));
  }, []);

  const filteredSources = useMemo(() => {
    return sources.filter((source) => {
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        source.title?.toLowerCase().includes(query) ||
        source.summary?.toLowerCase().includes(query) ||
        source.cleanContent?.toLowerCase().includes(query) ||
        source.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "All" || source.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, sources, statusFilter]);

  async function saveSource(status: "queued" | "draft") {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: sourceType,
        title: newTitle,
        url: newUrl,
        content,
        summary,
        status
      })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Source could not be saved.");
      return;
    }

    setNewTitle("");
    setNewUrl("");
    setSummary("");
    setContent("");
    setMessage(status === "queued" ? "Source queued." : "Source saved as draft.");
    await loadSources();
  }

  async function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSource("queued");
  }

  async function summarizeNewUrl() {
    const url = extractUrl(newUrl);
    if (!url) {
      setMessage("Enter a valid URL first.");
      return;
    }

    setLoading(true);
    setMessage("Summarizing URL...");

    const response = await fetch("/api/sources/summarize-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "URL could not be summarized.");
      return;
    }

    setNewUrl(url);
    setNewTitle((current) => current || data.source.title || "");
    setSummary(data.source.summary);
    setMessage("Summary created. You can edit it before saving the source.");
  }

  function startEditing(source: SourceListItem) {
    setEditingId(source.id);
    setEditDraft({
      type: source.type,
      title: source.title ?? "",
      url: source.url ?? "",
      cleanContent: source.cleanContent ?? "",
      summary: source.summary ?? "",
      status: source.status,
      tags: source.tags.join(", ")
    });
    setMessage("");
  }

  async function updateSource() {
    if (!editingId) return;
    setLoading(true);
    setMessage("");

    const response = await fetch(`/api/sources/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: editDraft.type,
        title: editDraft.title,
        url: editDraft.url,
        cleanContent: editDraft.cleanContent,
        summary: editDraft.summary,
        status: editDraft.status,
        tags: editDraft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Source could not be updated.");
      return;
    }

    setSources((current) => current.map((source) => (source.id === data.source.id ? data.source : source)));
    setEditingId(null);
    setMessage("Source updated.");
  }

  async function summarizeEditingUrl() {
    const url = extractUrl(editDraft.url);
    if (!url) {
      setMessage("Enter a valid URL in the edit form first.");
      return;
    }

    setLoading(true);
    setMessage("Summarizing URL...");

    const response = await fetch("/api/sources/summarize-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "URL could not be summarized.");
      return;
    }

    setEditDraft((current) => ({
      ...current,
      title: data.source.title ?? current.title,
      summary: data.source.summary,
      status: "summarized"
    }));
    setMessage("Summary created. Click Save source to persist it.");
  }

  async function deleteSource(id: string) {
    const confirmed = window.confirm("Delete this source? This cannot be undone.");
    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    const response = await fetch(`/api/sources/${id}`, { method: "DELETE" });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Source could not be deleted.");
      return;
    }

    setSources((current) => current.filter((source) => source.id !== id));
    if (editingId === id) setEditingId(null);
    setMessage("Source deleted.");
  }

  function toggleExpanded(id: string) {
    setExpandedSources((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Sources"
        title="Source inbox"
        description="Add URLs, documents, pasted text, book notes, and manual ideas for post and article generation."
        actions={
          <>
            <button className="primary" form="source-form" type="submit">
              <Plus size={17} /> Add source
            </button>
            <button type="button">
              <Upload size={17} /> Upload
            </button>
          </>
        }
      />

      <section className="grid">
        <form
          className="card grid"
          id="source-form"
          onSubmit={submitSource}
        >
          <h2>Add Source Material</h2>
          <label>
            Source type
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
              {sourceTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              placeholder="Source title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
            />
          </label>
          <label>
            URL
            <input
              placeholder="https://example.com/article"
              value={newUrl}
              onChange={(event) => setNewUrl(event.target.value)}
            />
          </label>
          <button type="button" onClick={summarizeNewUrl} disabled={loading || !extractUrl(newUrl)}>
            <FileText size={17} /> Summarize URL
          </button>
          <label>
            Summary
            <textarea
              placeholder="Summary will appear here after URL summarization, or you can write one manually."
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>
          <label>
            Pasted text or notes
            <textarea
              placeholder="Add your own notes about this source. URL summarization will not overwrite this field."
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </label>
          <div className="toolbar">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Queue source"}
            </button>
            <button type="button" disabled={loading} onClick={() => saveSource("draft")}>
              Save as draft
            </button>
          </div>
          {message ? <p>{message}</p> : null}
        </form>

        <div className="card">
          <h2>Filters</h2>
          <div className="grid two">
            <label>
              Search
              <span style={{ position: "relative" }}>
                <Search size={17} style={{ position: "absolute", left: 10, top: 12, color: "#64748b" }} />
                <input
                  style={{ paddingLeft: 36 }}
                  placeholder="Search source titles, tags, summaries"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </span>
            </label>
            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>All</option>
                <option>draft</option>
                <option>queued</option>
                <option>parsed</option>
                <option>summarized</option>
                <option>embedded</option>
                <option>failed</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="card section-band">
        <h2>Saved Sources</h2>
        <div className="list">
          {filteredSources.length === 0 ? (
            <p>
              {sources.length === 0
                ? "No saved sources yet. Add a URL, title, or pasted notes above."
                : "No sources match the current filters."}
            </p>
          ) : (
            filteredSources.map((source) => {
              const expanded = expandedSources.has(source.id);
              const hasDetails = Boolean(source.summary || source.cleanContent);

              return (
              <div className="list-item" key={source.id}>
                {editingId === source.id ? (
                  <div className="grid" style={{ flex: 1 }}>
                    <label>
                      Source type
                      <select
                        value={editDraft.type}
                        onChange={(event) => setEditDraft((current) => ({ ...current, type: event.target.value }))}
                      >
                        {sourceTypes.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Title
                      <input
                        value={editDraft.title}
                        onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))}
                      />
                    </label>
                    <label>
                      URL
                      <input
                        value={editDraft.url}
                        onChange={(event) => setEditDraft((current) => ({ ...current, url: event.target.value }))}
                      />
                    </label>
                    <button type="button" onClick={summarizeEditingUrl} disabled={loading || !extractUrl(editDraft.url)}>
                      <FileText size={17} /> Summarize URL
                    </button>
                    <label>
                      Summary
                      <textarea
                        value={editDraft.summary}
                        onChange={(event) => setEditDraft((current) => ({ ...current, summary: event.target.value }))}
                      />
                    </label>
                    <label>
                      Content / notes
                      <textarea
                        placeholder="Your own notes about this source. URL summarization will not overwrite this field."
                        value={editDraft.cleanContent}
                        onChange={(event) => setEditDraft((current) => ({ ...current, cleanContent: event.target.value }))}
                      />
                    </label>
                    <label>
                      Tags
                      <input
                        value={editDraft.tags}
                        onChange={(event) => setEditDraft((current) => ({ ...current, tags: event.target.value }))}
                        placeholder="AI, leadership, operating model"
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={editDraft.status}
                        onChange={(event) => setEditDraft((current) => ({ ...current, status: event.target.value }))}
                      >
                        <option>draft</option>
                        <option>queued</option>
                        <option>fetching</option>
                        <option>parsed</option>
                        <option>summarized</option>
                        <option>embedded</option>
                        <option>failed</option>
                        <option>archived</option>
                      </select>
                    </label>
                    <div className="toolbar">
                      <button className="primary" type="button" onClick={updateSource} disabled={loading}>
                        Save source
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="source-list-content">
                      <h3>{source.title ?? source.url ?? "Untitled source"}</h3>
                      <p className={expanded ? "source-detail expanded" : "source-detail"}>
                        {source.summary ?? "No summary yet."}
                      </p>
                      {source.cleanContent ? (
                        <p className={expanded ? "source-detail expanded" : "source-detail"}>
                          <strong>Notes:</strong> {source.cleanContent}
                        </p>
                      ) : null}
                      <div className="pill-row">
                        <span className="pill">{source.type}</span>
                        {source.tags.map((tag) => (
                          <span className="pill" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="toolbar">
                      <span className={source.status === "draft" ? "status warn" : "status"}>{source.status}</span>
                      {hasDetails ? (
                        <button
                          className="icon"
                          type="button"
                          title={expanded ? "Collapse source details" : "Expand source details"}
                          onClick={() => toggleExpanded(source.id)}
                        >
                          {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                        </button>
                      ) : null}
                      <button className="icon" type="button" title="Edit source" onClick={() => startEditing(source)}>
                        <Pencil size={17} />
                      </button>
                      <button className="icon" type="button" title="Delete source" onClick={() => deleteSource(source.id)}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </>
                )}
              </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function extractUrl(value: string) {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  try {
    return new URL(trimmed).toString();
  } catch {
    return "";
  }
}
