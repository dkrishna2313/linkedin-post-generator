"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Image as ImageIcon, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { postAngles } from "@/lib/data/seed";
import type { GeneratedDraft } from "@/lib/prompts/post";

type DraftPost = {
  id: string;
  status: string;
  title: string | null;
  body: string;
  hook: string | null;
  hashtags: string[];
  firstComment: string | null;
  imageIdea: string | null;
  angle: string | null;
  sourceRefs: string[] | null;
  updatedAt: string;
  versions: Array<{
    id: string;
    body: string;
    createdAt: string;
  }>;
  images: Array<{
    id: string;
    provider: string;
    model: string | null;
    prompt: string;
    imagePath: string;
    createdAt: string;
  }>;
};

const draftStatuses = ["idea", "researching", "draft", "edited", "ready_to_post", "published", "archived"];
const imageStyles = [
  "Abstract business visual",
  "Simple conceptual illustration",
  "LinkedIn banner-style image",
  "Quote card",
  "Carousel cover slide",
  "Diagram/framework visual"
];
const aspectRatios = ["1:1", "4:5", "16:9", "1.91:1"];

export function DraftEditorClient({ postId }: { postId: string }) {
  const [post, setPost] = useState<DraftPost | null>(null);
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [body, setBody] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [imageIdea, setImageIdea] = useState("");
  const [angle, setAngle] = useState("");
  const [status, setStatus] = useState("draft");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [loading, setLoading] = useState(false);
  const [regenerationContext, setRegenerationContext] = useState("");
  const [regenerationAngle, setRegenerationAngle] = useState(postAngles[0]);
  const [regeneratedDrafts, setRegeneratedDrafts] = useState<GeneratedDraft[]>([]);
  const [editorHighlighted, setEditorHighlighted] = useState(false);
  const [imageStyle, setImageStyle] = useState(imageStyles[0]);
  const [imageAspectRatio, setImageAspectRatio] = useState(aspectRatios[1]);
  const [imageProvider, setImageProvider] = useState("gemini");
  const [manualImagePrompt, setManualImagePrompt] = useState("");
  const [imagePromptResult, setImagePromptResult] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadDraft() {
      const response = await fetch(`/api/posts/${postId}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error ?? "Draft could not be loaded.");
        return;
      }

      const loaded: DraftPost = data.post;
      setPost(loaded);
      setTitle(loaded.title ?? "");
      setHook(loaded.hook ?? "");
      setBody(loaded.body);
      setHashtags(loaded.hashtags.join(" "));
      setFirstComment(loaded.firstComment ?? "");
      setImageIdea(loaded.imageIdea ?? "");
      setAngle(loaded.angle ?? "");
      setStatus(loaded.status);
    }

    loadDraft();
  }, [postId]);

  async function saveChanges() {
    setLoading(true);
    setMessageType("info");
    setMessage("");

    const response = await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        hook,
        body,
        hashtags: hashtags
          .split(/\s+/)
          .map((tag) => tag.trim())
          .filter(Boolean),
        firstComment,
        imageIdea,
        angle,
        status,
        metadata: { editedFromDraftEditor: true }
      })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessageType("error");
      setMessage(data.error ?? "Draft could not be saved.");
      return;
    }

    setPost((current) =>
      current
        ? {
            ...current,
            ...data.post,
            versions: data.post.versions ? [...data.post.versions, ...current.versions] : current.versions
          }
        : current
    );
    setMessageType("success");
    setMessage(`Changes saved at ${new Date().toLocaleTimeString()}. Status: ${data.post.status}.`);
  }

  async function regenerateDraft() {
    setLoading(true);
    setMessageType("info");
    setMessage("Generating alternate drafts...");

    const response = await fetch("/api/generate-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: [
          "Current saved draft:",
          body,
          firstComment ? `First comment: ${firstComment}` : "",
          imageIdea ? `Image idea: ${imageIdea}` : "",
          regenerationContext ? `Regeneration direction: ${regenerationContext}` : ""
        ]
          .filter(Boolean)
          .join("\n\n"),
        angle: regenerationAngle,
        sourceReference: post?.sourceRefs?.find((reference) => /^https?:\/\//i.test(reference)),
        viewpoint: "Preserve the current draft's core point of view unless the regeneration direction says otherwise.",
        sensitivity: "Preserve nuance, avoid hype, and keep the draft suitable for LinkedIn.",
        emojiUsage: "light",
        count: 3
      })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessageType("error");
      setMessage(data.error ?? "Could not regenerate draft.");
      return;
    }

    setRegeneratedDrafts(data.drafts ?? []);
    setMessageType("success");
    setMessage("Generated alternate drafts. Choose one below to replace the current editor content.");
  }

  function applyRegeneratedDraft(draft: GeneratedDraft) {
    setTitle(draft.hook);
    setHook(draft.hook);
    setBody(draft.post_body);
    setHashtags(draft.hashtags.join(" "));
    setFirstComment(draft.first_comment);
    setImageIdea(draft.image_idea);
    setAngle(draft.angle);
    setStatus("edited");
    setEditorHighlighted(true);
    setMessageType("info");
    setMessage("Regenerated draft brought into the editor. Review it above, then click Save changes.");
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => setEditorHighlighted(false), 1800);
  }

  function deleteRegeneratedDraft(index: number) {
    setRegeneratedDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMessageType("info");
    setMessage("Regenerated draft option removed.");
  }

  async function generateImagePrompt() {
    setImageLoading(true);
    setMessageType("info");
    setMessage("Generating image prompt...");

    try {
      const prompt = await createImagePrompt();
      setImagePromptResult(prompt);
      setMessageType("success");
      setMessage("Image prompt generated. Review it below, then generate and attach the image.");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Image prompt could not be generated.");
    } finally {
      setImageLoading(false);
    }
  }

  async function generateAndAttachImage() {
    setImageLoading(true);
    setMessageType("info");
    setMessage("Generating and attaching image. This can take a little while.");

    try {
      const prompt = imagePromptResult || (await createImagePrompt());
      setImagePromptResult(prompt);

      const response = await fetch("/api/generate-and-save-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: imageProvider,
          aspectRatio: imageAspectRatio,
          postId
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Image could not be generated.");
      }

      setPost((current) =>
        current
          ? {
              ...current,
              images: [data.image, ...(current.images ?? [])]
            }
          : current
      );
      setMessageType("success");
      setMessage("Image generated and attached to this draft.");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Image could not be generated.");
    } finally {
      setImageLoading(false);
    }
  }

  async function createImagePrompt() {
    const response = await fetch("/api/generate-image-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postText: body,
        imageIdea,
        style: imageStyle,
        aspectRatio: imageAspectRatio,
        provider: imageProvider,
        manualPrompt: manualImagePrompt
      })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Image prompt could not be generated.");
    }

    return data.prompt as string;
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Draft Editor"
        title={post?.title ?? post?.hook ?? "Saved draft"}
        description="Edit a saved post draft and keep a version history of each saved change."
        actions={
          <>
            <Link className="button" href="/dashboard">
              <ArrowLeft size={17} /> Dashboard
            </Link>
            <button className="primary" onClick={saveChanges} disabled={loading || !body.trim()}>
              <Save size={17} /> {loading ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      />

      {message ? <div className={`notice ${messageType}`}>{message}</div> : null}

      <section className="draft-editor-stack">
        <div className={`card grid draft-editor-panel ${editorHighlighted ? "is-highlighted" : ""}`} ref={editorRef}>
          <h2>Draft</h2>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {draftStatuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Hook
            <input value={hook} onChange={(event) => setHook(event.target.value)} />
          </label>
          <label>
            Post body
            <textarea value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <label>
            Hashtags
            <input value={hashtags} onChange={(event) => setHashtags(event.target.value)} />
          </label>
        </div>

        <div className="card grid draft-support-panel">
          <h2>Supporting Fields</h2>
          <label>
            First comment
            <textarea value={firstComment} onChange={(event) => setFirstComment(event.target.value)} />
          </label>
          <label>
            Image idea
            <textarea value={imageIdea} onChange={(event) => setImageIdea(event.target.value)} />
          </label>
          <label>
            Angle
            <input value={angle} onChange={(event) => setAngle(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="card section-band">
        <h2>Regenerate Draft</h2>
        {regeneratedDrafts.length > 0 ? (
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <button type="button" onClick={() => setRegeneratedDrafts([])}>
              <Trash2 size={17} /> Clear regenerated drafts
            </button>
          </div>
        ) : null}
        <div className="grid two">
          <div className="grid">
            <label>
              Regeneration angle
              <select value={regenerationAngle} onChange={(event) => setRegenerationAngle(event.target.value)}>
                {postAngles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Direction
              <textarea
                placeholder="Example: make this more executive, sharper, and less technical."
                value={regenerationContext}
                onChange={(event) => setRegenerationContext(event.target.value)}
              />
            </label>
            <button type="button" onClick={regenerateDraft} disabled={loading || !body.trim()}>
              <RefreshCw size={17} /> {loading ? "Working..." : "Generate alternate drafts"}
            </button>
          </div>

          <div className="list">
            {regeneratedDrafts.length === 0 ? (
              <p>No regenerated drafts yet.</p>
            ) : (
              regeneratedDrafts.map((draft, index) => (
                <div className="list-item" key={`${draft.hook}-${index}`}>
                  <div>
                    <h3>{draft.hook}</h3>
                    <p>{draft.post_body.slice(0, 240)}</p>
                    <p>
                      <strong>First comment:</strong> {draft.first_comment}
                    </p>
                    <p>
                      <strong>Image idea:</strong> {draft.image_idea}
                    </p>
                    <div className="pill-row">
                      {draft.hashtags.map((tag) => (
                        <span className="pill" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="toolbar">
                    <button type="button" onClick={() => applyRegeneratedDraft(draft)}>
                      Bring into editor
                    </button>
                    <button className="icon" type="button" title="Delete regenerated draft" onClick={() => deleteRegeneratedDraft(index)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="card section-band">
        <h2>Generate Image</h2>
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
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>
            <label>
              Manual direction
              <textarea
                placeholder="Optional: add color, composition, visual metaphor, or text restrictions."
                value={manualImagePrompt}
                onChange={(event) => setManualImagePrompt(event.target.value)}
              />
            </label>
            <div className="toolbar">
              <button type="button" onClick={generateImagePrompt} disabled={imageLoading || !body.trim()}>
                <Sparkles size={17} /> {imageLoading ? "Working..." : "Generate image prompt"}
              </button>
              <button className="primary" type="button" onClick={generateAndAttachImage} disabled={imageLoading || !body.trim()}>
                <ImageIcon size={17} /> {imageLoading ? "Working..." : "Generate and attach image"}
              </button>
            </div>
          </div>

          <div className="grid">
            <label>
              Image idea
              <textarea value={imageIdea} onChange={(event) => setImageIdea(event.target.value)} />
            </label>
            <label>
              Generated provider prompt
              <textarea
                value={imagePromptResult}
                onChange={(event) => setImagePromptResult(event.target.value)}
                placeholder="Generate a prompt, or write one here before generating the image."
              />
            </label>
          </div>
        </div>
      </section>

      <section className="card section-band">
        <h2>Saved Images</h2>
        {post?.images?.length ? (
          <div className="draft-image-grid">
            {post.images.map((image) => (
              <div className="grid" key={image.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Saved generated visual" src={image.imagePath} className="draft-image-preview" />
                <div className="pill-row">
                  <span className="pill">{image.provider}</span>
                  {image.model ? <span className="pill">{image.model}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No saved image is attached to this draft yet.</p>
        )}
      </section>

      <section className="card section-band">
        <h2>Version History</h2>
        <div className="list">
          {!post || post.versions.length === 0 ? (
            <p>No versions found.</p>
          ) : (
            post.versions.map((version) => (
              <div className="list-item" key={version.id}>
                <div>
                  <h3>{new Date(version.createdAt).toLocaleString()}</h3>
                  <p>{(version.body ?? "Version body was not captured.").slice(0, 220)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
