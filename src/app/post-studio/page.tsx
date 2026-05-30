"use client";

import { useEffect, useState } from "react";
import {
  Clipboard,
  Download,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Wand2,
  X
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { postAngles, sensitiveTopics } from "@/lib/data/seed";
import type { EmojiUsage, GeneratedDraft } from "@/lib/prompts/post";

type SourceListItem = {
  id: string;
  title: string | null;
  type: string;
  status: string;
  summary: string | null;
  keyPoints?: unknown;
  cleanContent?: string | null;
  articleContent?: string | null;
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
  const [sourceNotes, setSourceNotes] = useState("");
  const [viewpoints, setViewpoints] = useState<ViewpointListItem[]>([]);
  const [angle, setAngle] = useState(postAngles[0]);
  const [viewpoint, setViewpoint] = useState("");
  const [sensitivity, setSensitivity] = useState(sensitiveTopics[0].guidance);
  const [emojiUsage, setEmojiUsage] = useState<EmojiUsage>("moderate");
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
  const [generationMessage, setGenerationMessage] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const activeDraft = drafts[selected];
  const finalPostText = activeDraft ? buildFinalPostText(activeDraft) : "";

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
          setSourceNotes(sourceNotesFromSource(first));
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
      setSourceNotes(sourceNotesFromSource(nextSource));
    }
  }

  async function generateDrafts() {
    setLoading(true);
    setGenerationMessage("");
    setDraftMessage("");

    try {
      let sourceForGeneration = source;
      const savedSource = sources.find((item) => item.id === selectedSourceId);

      if (savedSource?.url) {
        setSourceMessage("Reading and extracting the URL before generating drafts...");
        const ingestionResponse = await fetchWithTimeout(`/api/sources/${savedSource.id}/ingest`, { method: "POST" });
        const ingestionData = await readResponseJson(ingestionResponse);

        if (!ingestionResponse.ok) {
          throw new Error(`Could not read the URL: ${ingestionData.error ?? "Unknown error."}`);
        }

        const refreshedSource: SourceListItem = ingestionData.source;
        setSources((current) => current.map((item) => (item.id === refreshedSource.id ? refreshedSource : item)));
        sourceForGeneration = sourceMaterialForGeneration(refreshedSource);
        setSource(sourceMaterial(refreshedSource));
        setSourceMessage("URL read successfully. Drafts are based on the extracted article content.");
      }

      const generationInput = sourceWithNotes(sourceForGeneration, sourceNotes);

      const response = await fetchWithTimeout("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: generationInput,
          sourceReference: savedSource?.url,
          angle,
          viewpoint,
          sensitivity,
          emojiUsage,
          count: 4
        })
      });
      const data = await readResponseJson(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Draft generation failed.");
      }

      setDrafts(data.drafts ?? []);
      setSelected(0);
    } catch (error) {
      setGenerationMessage(errorMessage(error, "Draft generation failed."));
    } finally {
      setLoading(false);
    }
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
    const savedSource = sources.find((item) => item.id === selectedSourceId);

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
        sourceRefs: sourceReferencesForDraft(activeDraft, savedSource),
        generatedImagePath: savedImageUrl,
        metadata: {
          viewpointUsed: activeDraft.viewpoint_used,
          sensitiveTopicNotes: activeDraft.sensitive_topic_notes,
          toneNotes: activeDraft.tone_notes,
          confidenceScore: activeDraft.confidence_score,
          generatedImagePath: savedImageUrl,
          sourceMaterial: source,
          sourceNotes
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

  async function copyFinalPost() {
    if (!finalPostText) return;

    await navigator.clipboard.writeText(finalPostText);
    setPublishMessage("Post copied. Paste it into LinkedIn when you are ready.");
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
      {generationMessage ? <p className="notice error">{generationMessage}</p> : null}

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
            <textarea
              placeholder="Article text, source summary, pasted source material, or extracted URL content."
              value={source}
              onChange={(event) => setSource(event.target.value)}
            />
          </label>
          <label>
            Notes
            <textarea
              placeholder="Optional notes for yourself, emphasis, caveats, or points to include. These stay separate from the source material."
              value={sourceNotes}
              onChange={(event) => setSourceNotes(event.target.value)}
            />
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
              onChange={(event) => setEmojiUsage(event.target.value as EmojiUsage)}
            >
              <option value="none">None</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
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
                <button type="button" onClick={() => setPublishOpen(true)}>
                  <Send size={17} /> Publish
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

      {publishOpen && activeDraft ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="publish-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Publish</p>
                <h2 id="publish-title">Ready to publish</h2>
              </div>
              <button className="icon" type="button" title="Close publish preview" onClick={() => setPublishOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="grid two">
              <div className="grid">
                <label>
                  Final LinkedIn post
                  <textarea className="publish-preview" value={finalPostText} readOnly />
                </label>
                <div className="toolbar">
                  <button className="primary" type="button" onClick={copyFinalPost}>
                    <Clipboard size={17} /> Copy post
                  </button>
                  {savedImageUrl ? (
                    <a className="button" href={savedImageUrl} download>
                      <Download size={17} /> Download image
                    </a>
                  ) : (
                    <button type="button" disabled>
                      <Download size={17} /> No image to download
                    </button>
                  )}
                </div>
                {publishMessage ? <p>{publishMessage}</p> : null}
              </div>

              <div className="grid">
                {savedImageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Selected publish visual" src={savedImageUrl} className="publish-image-preview" />
                    <p>This generated image will download separately for upload to LinkedIn.</p>
                  </>
                ) : (
                  <p>No image has been generated for this draft yet. Use the image panel if you want a visual with the post.</p>
                )}
                <p>
                  <strong>First comment:</strong> {activeDraft.first_comment}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function sourceLabel(source: SourceListItem) {
  return truncateLabel(source.title ?? source.url ?? source.summary ?? "Untitled source");
}

function sourceMaterial(source: SourceListItem) {
  const parts = [
    source.title ? `Title: ${source.title}` : null,
    source.summary ? `Summary: ${source.summary}` : null,
    keyThemesFromSource(source) ? `Key themes:\n${keyThemesFromSource(source)}` : null
  ].filter(Boolean);

  return parts.join("\n\n");
}

function sourceNotesFromSource(source: SourceListItem) {
  return source.cleanContent ?? "";
}

function sourceMaterialForGeneration(source: SourceListItem) {
  const parts = [
    sourceMaterial(source),
    source.articleContent ? `Article text:\n${source.articleContent}` : null
  ].filter(Boolean);

  return parts.join("\n\n");
}

function sourceWithNotes(source: string, notes: string) {
  const trimmedSource = source.trim();
  const trimmedNotes = notes.trim();

  if (!trimmedNotes) {
    return trimmedSource;
  }

  return [trimmedSource, `User notes:\n${trimmedNotes}`].filter(Boolean).join("\n\n");
}

function truncateLabel(label: string) {
  return label.length > 90 ? `${label.slice(0, 87)}...` : label;
}

function keyThemesFromSource(source: SourceListItem) {
  const keyPoints = source.keyPoints;

  if (!keyPoints) {
    return "";
  }

  if (typeof keyPoints === "string") {
    return keyPoints;
  }

  if (typeof keyPoints === "object" && "keyThemes" in keyPoints) {
    const value = (keyPoints as { keyThemes?: unknown }).keyThemes;
    if (Array.isArray(value)) {
      return value.map(String).join("\n");
    }

    return typeof value === "string" ? value : "";
  }

  return "";
}

function sourceReferencesForDraft(draft: GeneratedDraft, source?: SourceListItem) {
  return Array.from(
    new Set(
      [
        source ? sourceLabel(source) : null,
        source?.url ?? null,
        ...draft.source_references
      ].filter((reference): reference is string => Boolean(reference?.trim()))
    )
  );
}

function buildFinalPostText(draft: GeneratedDraft) {
  const parts = [
    draft.hook,
    draft.post_body,
    draft.hashtags.length > 0 ? draft.hashtags.join(" ") : null
  ].filter(Boolean);

  return parts.join("\n\n");
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 75000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readResponseJson(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 240) };
  }
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Draft generation timed out. Try again, or use a shorter source.";
  }

  return error instanceof Error ? error.message : fallback;
}
