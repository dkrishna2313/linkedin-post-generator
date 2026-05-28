"use client";

import { useEffect, useState } from "react";
import { Clipboard, Image as ImageIcon, RefreshCw, Save, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { postAngles, sensitiveTopics } from "@/lib/data/seed";
import type { GeneratedDraft } from "@/lib/prompts/post";

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

type ViewpointListItem = {
  id: string;
  title: string;
  description: string;
  framing: string | null;
  priority: number;
};

const refinementActions = [
  "Make punchier",
  "Make more executive",
  "Make more personal",
  "Make more contrarian",
  "Add more nuance",
  "Reduce jargon",
  "Add emojis",
  "Remove emojis",
  "Shorten",
  "Expand",
  "Add sharper hook"
];

const imageStyles = [
  "Abstract business visual",
  "Simple conceptual illustration",
  "LinkedIn banner-style image",
  "Quote card",
  "Carousel cover slide",
  "Diagram/framework visual"
];

const aspectRatios = ["1:1", "4:5", "16:9", "1.91:1"];

export default function PostStudioPage() {
  const [sources, setSources] = useState<SourceListItem[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [source, setSource] = useState("");
  const [viewpoints, setViewpoints] = useState<ViewpointListItem[]>([]);
  const [angle, setAngle] = useState(postAngles[0]);
  const [viewpoint, setViewpoint] = useState("");
  const [sensitivity, setSensitivity] = useState(sensitiveTopics[0].guidance);
  const [emojiUsage, setEmojiUsage] = useState<"none" | "light" | "moderate">("light");
  const [drafts, setDrafts] = useState<GeneratedDraft[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sourceMessage, setSourceMessage] = useState("");
  const [viewpointMessage, setViewpointMessage] = useState("");
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [imageStyle, setImageStyle] = useState(imageStyles[0]);
  const [imageAspectRatio, setImageAspectRatio] = useState(aspectRatios[1]);
  const [imageProvider, setImageProvider] = useState("gemini");
  const [manualImagePrompt, setManualImagePrompt] = useState("");
  const [imagePromptResult, setImagePromptResult] = useState("");
  const [savedImageUrl, setSavedImageUrl] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const activeDraft = drafts[selected];

  useEffect(() => {
    async function loadSources() {
      try {
        const response = await fetch("/api/sources", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Sources could not be loaded.");
        }

        const savedSources: SourceListItem[] = data.sources ?? [];
        setSources(savedSources);

        if (savedSources.length > 0 && !selectedSourceId) {
          const first = savedSources[0];
          setSelectedSourceId(first.id);
          setSource(sourceMaterial(first));
        }
      } catch {
        setSourceMessage("Could not load saved sources. You can still paste source material below.");
      }
    }

    loadSources();
  }, [selectedSourceId]);

  useEffect(() => {
    async function loadViewpoints() {
      try {
        const response = await fetch("/api/viewpoints", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Viewpoints could not be loaded.");
        }

        const savedViewpoints: ViewpointListItem[] = data.viewpoints ?? [];
        setViewpoints(savedViewpoints);
        if (savedViewpoints.length > 0 && !viewpoint) {
          setViewpoint(savedViewpoints[0].title);
        }
      } catch {
        setViewpointMessage("Could not load viewpoints.");
      }
    }

    loadViewpoints();
  }, [viewpoint]);

  function chooseSource(id: string) {
    setSelectedSourceId(id);
    const nextSource = sources.find((item) => item.id === id);
    if (nextSource) {
      setSource(sourceMaterial(nextSource));
    }
  }

  async function generateDrafts() {
    setLoading(true);
    setDraftMessage("");
    let sourceForGeneration = source;
    const savedSource = sources.find((item) => item.id === selectedSourceId);

    if (savedSource?.url) {
      setSourceMessage("Reading and extracting the URL before generating drafts...");
      const ingestionResponse = await fetch(`/api/sources/${savedSource.id}/ingest`, { method: "POST" });
      const ingestionData = await ingestionResponse.json();

      if (!ingestionResponse.ok) {
        setLoading(false);
        setSourceMessage(`Could not read the URL: ${ingestionData.error ?? "Unknown error."}`);
        return;
      }

      const refreshedSource: SourceListItem = ingestionData.source;
      setSources((current) => current.map((item) => (item.id === refreshedSource.id ? refreshedSource : item)));
      sourceForGeneration = sourceMaterial(refreshedSource);
      setSource(sourceForGeneration);
      setSourceMessage("URL read successfully. Drafts are based on the extracted article content.");
    }

    const response = await fetch("/api/generate-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: sourceForGeneration,
        sourceReference: savedSource?.url,
        angle,
        viewpoint,
        sensitivity,
        emojiUsage,
        count: 4
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setLoading(false);
      setDraftMessage(data.error ?? "Draft generation failed.");
      return;
    }
    setDrafts(data.drafts ?? []);
    setSelected(0);
    setLoading(false);
  }

  async function refineDraft(action: string) {
    if (!activeDraft) return;
    setLoading(true);
    const response = await fetch("/api/refine-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: activeDraft.post_body, action })
    });
    const data = await response.json();
    const next = [...drafts];
    next[selected] = {
      ...activeDraft,
      post_body: data.revised_draft,
      hashtags: data.hashtags,
      first_comment: data.first_comment,
      image_idea: data.image_idea,
      tone_notes: data.explanation
    };
    setDrafts(next);
    setLoading(false);
  }

  async function generateImagePrompt() {
    if (!activeDraft) return;

    setLoading(true);
    setImageMessage("");

    const response = await fetch("/api/generate-image-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postText: activeDraft.post_body,
        imageIdea: activeDraft.image_idea,
        style: imageStyle,
        aspectRatio: imageAspectRatio,
        provider: imageProvider,
        manualPrompt: manualImagePrompt
      })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setImageMessage(data.error ?? "Image prompt could not be generated.");
      return;
    }

    setImagePromptResult(data.prompt);
    setImageMessage(`Prompt ready for ${data.provider} ${data.model ? `(${data.model})` : ""}.`);
  }

  async function generateAndSaveImage() {
    if (!imagePromptResult) {
      setImageMessage("Generate an image prompt first.");
      return;
    }

    setLoading(true);
    setImageMessage("Generating image. This can take a little while.");

    const response = await fetch("/api/generate-and-save-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: imagePromptResult,
        provider: imageProvider,
        aspectRatio: imageAspectRatio
      })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setImageMessage(data.error ?? "Image could not be generated.");
      return;
    }

    setSavedImageUrl(data.image.imagePath);
    setImageMessage(`Image saved with ${data.image.provider} ${data.image.model ? `(${data.image.model})` : ""}.`);
  }

  async function saveDraft() {
    if (!activeDraft) return;

    setLoading(true);
    setDraftMessage("");

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "draft",
        title: activeDraft.hook,
        body: activeDraft.post_body,
        hook: activeDraft.hook,
        hashtags: activeDraft.hashtags,
        firstComment: activeDraft.first_comment,
        imageIdea: activeDraft.image_idea,
        angle: activeDraft.angle,
        sourceRefs: activeDraft.source_references,
        generatedImagePath: savedImageUrl,
        metadata: {
          viewpointUsed: activeDraft.viewpoint_used,
          sensitiveTopicNotes: activeDraft.sensitive_topic_notes,
          toneNotes: activeDraft.tone_notes,
          confidenceScore: activeDraft.confidence_score,
          generatedImagePath: savedImageUrl
        }
      })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setDraftMessage(data.error ?? "Draft could not be saved.");
      return;
    }

    setDraftMessage(`Draft saved: ${data.post.title}`);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Post Studio"
        title="Guided LinkedIn post workflow"
        description="Choose a source, angle, viewpoint, and nuance settings, then generate and refine short LinkedIn drafts."
        actions={
          <button className="primary" onClick={generateDrafts} disabled={loading}>
            <Sparkles size={17} /> {loading ? "Working..." : "Generate drafts"}
          </button>
        }
      />

      <section className="grid two">
        <div className="card grid">
          <h2>1. Source and Input</h2>
          <label>
            Saved source
            <select value={selectedSourceId} onChange={(event) => chooseSource(event.target.value)}>
              {sources.length === 0 ? <option value="">No saved sources yet</option> : null}
              {sources.map((savedSource) => (
                <option key={savedSource.id} value={savedSource.id}>
                  {sourceLabel(savedSource)}
                </option>
              ))}
            </select>
          </label>
          {sourceMessage ? <p>{sourceMessage}</p> : null}
          {sources.find((item) => item.id === selectedSourceId)?.url ? (
            <p>
              <strong>Reference URL:</strong> {sources.find((item) => item.id === selectedSourceId)?.url}
            </p>
          ) : null}
          <label>
            Source material
            <textarea value={source} onChange={(event) => setSource(event.target.value)} />
          </label>
        </div>

        <div className="card grid">
          <h2>2. Direction</h2>
          <label>
            Post angle
            <select value={angle} onChange={(event) => setAngle(event.target.value)}>
              {postAngles.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Viewpoint
            <select value={viewpoint} onChange={(event) => setViewpoint(event.target.value)}>
              {viewpoints.length === 0 ? <option value="">No saved viewpoints yet</option> : null}
              {viewpoints.map((item) => (
                <option key={item.title}>{item.title}</option>
              ))}
            </select>
          </label>
          {viewpointMessage ? <p>{viewpointMessage}</p> : null}
          <label>
            Emoji use
            <select
              value={emojiUsage}
              onChange={(event) => setEmojiUsage(event.target.value as "none" | "light" | "moderate")}
            >
              <option value="none">None</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
            </select>
          </label>
          <label>
            Sensitive topic guidance
            <textarea value={sensitivity} onChange={(event) => setSensitivity(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="grid two section-band">
        <div className="card">
          <h2>Generated Options</h2>
          {drafts.length === 0 ? (
            <p>Generate drafts to see hooks, post bodies, hashtags, first comments, and image ideas.</p>
          ) : (
            <div className="list">
              {drafts.map((draft, index) => (
                <button
                  className={index === selected ? "primary" : ""}
                  key={`${draft.hook}-${index}`}
                  onClick={() => setSelected(index)}
                  type="button"
                >
                  {draft.hook}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card grid">
          <h2>Editor</h2>
          {activeDraft ? (
            <>
              <label>
                Hook
                <input
                  value={activeDraft.hook}
                  onChange={(event) => {
                    const next = [...drafts];
                    next[selected] = { ...activeDraft, hook: event.target.value };
                    setDrafts(next);
                  }}
                />
              </label>
              <label>
                Post body
                <textarea
                  value={activeDraft.post_body}
                  onChange={(event) => {
                    const next = [...drafts];
                    next[selected] = { ...activeDraft, post_body: event.target.value };
                    setDrafts(next);
                  }}
                />
              </label>
              <div className="pill-row">
                {activeDraft.hashtags.map((tag) => (
                  <span className="pill" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <p>
                <strong>First comment:</strong> {activeDraft.first_comment}
              </p>
              <p>
                <strong>Image idea:</strong> {activeDraft.image_idea}
              </p>
              <div className="toolbar">
                <button className="primary" type="button" onClick={saveDraft} disabled={loading}>
                  <Save size={17} /> {loading ? "Saving..." : "Save draft"}
                </button>
                <button type="button" onClick={() => setImagePanelOpen((current) => !current)}>
                  <ImageIcon size={17} /> {imagePanelOpen ? "Hide image panel" : "Image panel"}
                </button>
              </div>
              {draftMessage ? <p>{draftMessage}</p> : null}
            </>
          ) : (
            <p>No draft selected.</p>
          )}
        </div>
      </section>

      {activeDraft && imagePanelOpen ? (
        <section className="card section-band">
          <h2>Image Generation Panel</h2>
          <div className="grid two">
            <div className="grid">
              <label>
                Image type
                <select value={imageStyle} onChange={(event) => setImageStyle(event.target.value)}>
                  {imageStyles.map((style) => (
                    <option key={style}>{style}</option>
                  ))}
                </select>
              </label>
              <label>
                Aspect ratio
                <select value={imageAspectRatio} onChange={(event) => setImageAspectRatio(event.target.value)}>
                  {aspectRatios.map((ratio) => (
                    <option key={ratio}>{ratio}</option>
                  ))}
                </select>
              </label>
              <label>
                Provider
                <select value={imageProvider} onChange={(event) => setImageProvider(event.target.value)}>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                </select>
              </label>
              <label>
                Manual direction
                <textarea
                  placeholder="Optional: add color, composition, image metaphor, or text restrictions."
                  value={manualImagePrompt}
                  onChange={(event) => setManualImagePrompt(event.target.value)}
                />
              </label>
              <button className="primary" type="button" onClick={generateImagePrompt} disabled={loading}>
                <Sparkles size={17} /> {loading ? "Working..." : "Generate image prompt"}
              </button>
              <button type="button" onClick={generateAndSaveImage} disabled={loading || !imagePromptResult}>
                <ImageIcon size={17} /> Generate and save image
              </button>
              {imageMessage ? <p>{imageMessage}</p> : null}
            </div>

            <div className="grid">
              {savedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Generated LinkedIn visual"
                  src={savedImageUrl}
                  style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }}
                />
              ) : null}
              <label>
                Image idea
                <textarea value={activeDraft.image_idea} readOnly />
              </label>
              <label>
                Generated provider prompt
                <textarea value={imagePromptResult} readOnly placeholder="Generate an image prompt to see it here." />
              </label>
              <button
                type="button"
                disabled={!imagePromptResult}
                onClick={() => navigator.clipboard.writeText(imagePromptResult)}
              >
                <Clipboard size={17} /> Copy prompt
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card section-band">
        <h2>Refinement Actions</h2>
        <div className="toolbar">
          {refinementActions.map((action) => (
            <button key={action} onClick={() => refineDraft(action)} type="button" disabled={!activeDraft || loading}>
              {action === "Add sharper hook" ? <Wand2 size={16} /> : <RefreshCw size={16} />}
              {action}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function sourceLabel(source: SourceListItem) {
  return source.title ?? source.url ?? source.summary?.slice(0, 80) ?? "Untitled source";
}

function sourceMaterial(source: SourceListItem) {
  const parts = [
    source.title ? `Title: ${source.title}` : null,
    source.summary ? `Summary: ${source.summary}` : null,
    source.cleanContent ? `Source notes: ${source.cleanContent}` : null
  ].filter(Boolean);

  return parts.join("\n\n");
}
