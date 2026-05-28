"use client";

import { FormEvent, useEffect, useState } from "react";
import { Archive, Plus, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { defaultVoiceProfile, sensitiveTopics } from "@/lib/data/seed";

type Viewpoint = {
  id: string;
  title: string;
  description: string;
  framing: string | null;
  priority: number;
  active: boolean;
};

export function BrandMemoryClient() {
  const [viewpoints, setViewpoints] = useState<Viewpoint[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [framing, setFraming] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadViewpoints() {
    const response = await fetch("/api/viewpoints", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Viewpoints could not be loaded.");
    }
    setViewpoints(data.viewpoints ?? []);
  }

  useEffect(() => {
    loadViewpoints().catch(() => setMessage("Could not load viewpoints."));
  }, []);

  async function addViewpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/viewpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, framing })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Viewpoint could not be saved.");
      return;
    }

    setTitle("");
    setDescription("");
    setFraming("");
    setMessage("Viewpoint added.");
    await loadViewpoints();
  }

  async function archiveViewpoint(id: string) {
    setMessage("");
    const response = await fetch(`/api/viewpoints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false })
    });

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "Viewpoint could not be archived.");
      return;
    }

    setMessage("Viewpoint archived.");
    await loadViewpoints();
  }

  async function updateViewpoint(id: string, changes: Partial<Viewpoint>) {
    const response = await fetch(`/api/viewpoints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes)
    });

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "Viewpoint could not be updated.");
      return;
    }

    await loadViewpoints();
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Brand Memory"
        title="Voice, viewpoints, and nuance controls"
        description="Manage the reusable guidance that keeps generated posts consistent with Dilip’s point of view."
        actions={
          <button className="primary" form="viewpoint-form" type="submit" disabled={loading}>
            <Save size={17} /> {loading ? "Saving..." : "Save viewpoint"}
          </button>
        }
      />

      <section className="grid two">
        <div className="card grid">
          <h2>Voice Profile</h2>
          <label>
            Tone summary
            <textarea defaultValue={defaultVoiceProfile.tone} />
          </label>
          <label>
            Writing style
            <textarea defaultValue={defaultVoiceProfile.style} />
          </label>
          <label>
            CTA style
            <input defaultValue={defaultVoiceProfile.cta} />
          </label>
        </div>

        <div className="card grid">
          <h2>Emoji and Structure Preferences</h2>
          <label>
            Emoji usage level
            <select defaultValue="light">
              <option>none</option>
              <option>light</option>
              <option>moderate</option>
            </select>
          </label>
          <label>
            Max emojis per post
            <input defaultValue="3" type="number" min="0" max="8" />
          </label>
          <label>
            Banned cliches
            <textarea defaultValue={"AI is changing everything\nThe future is now\nDisruption is inevitable"} />
          </label>
        </div>
      </section>

      <section className="grid two section-band">
        <div className="card">
          <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Viewpoints</h2>
          </div>

          <form className="grid" id="viewpoint-form" onSubmit={addViewpoint} style={{ marginBottom: 18 }}>
            <label>
              New viewpoint title
              <input
                placeholder="Example: AI governance is a leadership system, not a committee."
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                placeholder="Explain the point of view and when to use it."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label>
              Preferred framing
              <textarea
                placeholder="How should the app frame this viewpoint in posts?"
                value={framing}
                onChange={(event) => setFraming(event.target.value)}
              />
            </label>
            <button className="primary" type="submit" disabled={loading}>
              <Plus size={17} /> {loading ? "Saving..." : "Add viewpoint"}
            </button>
            {message ? <p>{message}</p> : null}
          </form>

          <div className="list">
            {viewpoints.length === 0 ? (
              <p>No viewpoints yet.</p>
            ) : (
              viewpoints.map((item) => (
                <div className="list-item" key={item.id}>
                  <div className="grid" style={{ flex: 1 }}>
                    <label>
                      Title
                      <input
                        defaultValue={item.title}
                        onBlur={(event) => {
                          if (event.target.value !== item.title) {
                            updateViewpoint(item.id, { title: event.target.value });
                          }
                        }}
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        defaultValue={item.description}
                        onBlur={(event) => {
                          if (event.target.value !== item.description) {
                            updateViewpoint(item.id, { description: event.target.value });
                          }
                        }}
                      />
                    </label>
                    <label>
                      Framing
                      <textarea
                        defaultValue={item.framing ?? ""}
                        onBlur={(event) => {
                          if (event.target.value !== (item.framing ?? "")) {
                            updateViewpoint(item.id, { framing: event.target.value });
                          }
                        }}
                      />
                    </label>
                    <span className="pill">Priority {item.priority}</span>
                  </div>
                  <button className="icon" title="Archive viewpoint" onClick={() => archiveViewpoint(item.id)}>
                    <Archive size={17} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Sensitive Topics</h2>
            <button type="button">
              <Plus size={17} /> Add
            </button>
          </div>
          <div className="list">
            {sensitiveTopics.map((item) => (
              <div className="list-item" key={item.topic}>
                <div>
                  <h3>{item.topic}</h3>
                  <p>{item.guidance}</p>
                  <div className="pill-row">
                    {item.caveats.map((caveat) => (
                      <span className="pill" key={caveat}>
                        {caveat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
