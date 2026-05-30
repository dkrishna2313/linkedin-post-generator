"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Clipboard,
  Download,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { postAngles } from "@/lib/data/seed";
import type { EmojiUsage, GeneratedDraft } from "@/lib/prompts/post";

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
  publishedAt: string | null;
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

const draftStatuses = ["idea", "researching", "draft", "ready_to_post", "published", "archived"];
const imageStyles = [
  "Abstract business visual",
  "Simple conceptual illustration",
  "LinkedIn banner-style image",
  "Quote card",
  "Carousel cover slide",
  "Diagram/framework visual"
];
const aspectRatios = ["1:1", "4:5", "16:9", "1.91:1"];
const postLengths = ["Short", "Medium", "Long"] as const;
const emojiIntensities = ["None", "Light", "Medium", "Heavy"] as const;

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
  const [redraftContent, setRedraftContent] = useState("");
  const [regenerationAngle, setRegenerationAngle] = useState(postAngles[0]);
  const [postLength, setPostLength] = useState<(typeof postLengths)[number]>("Medium");
  const [emojiIntensity, setEmojiIntensity] = useState<(typeof emojiIntensities)[number]>("Light");
  const [regeneratedDrafts, setRegeneratedDrafts] = useState<GeneratedDraft[]>([]);
  const [editorHighlighted, setEditorHighlighted] = useState(false);
  const [imageStyle, setImageStyle] = useState(imageStyles[0]);
  const [imageAspectRatio, setImageAspectRatio] = useState(aspectRatios[1]);
  const [imageProvider, setImageProvider] = useState("gemini");
  const [manualImagePrompt, setManualImagePrompt] = useState("");
  const [imagePromptResult, setImagePromptResult] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishedDate, setPublishedDate] = useState(todayDateInputValue());
  const [selectedPublishImageId, setSelectedPublishImageId] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const publishImages = post?.images ?? [];
  const selectedPublishImage =
    publishImages.find((image) => image.id === selectedPublishImageId) ?? publishImages[0] ?? null;
  const finalPostText = buildFinalPostText({ hook, body, hashtags });

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
      setStatus(normalizePostStatus(loaded.status));
      setPublishedDate(dateInputValue(loaded.publishedAt) || todayDateInputValue());
      setSelectedPublishImageId(loaded.images[0]?.id ?? "");
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
    setMessage("Redrafting post...");

    const response = await fetch("/api/generate-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: [
          "Use the following redraft content as the complete source text for the new LinkedIn post.",
          "Do not use the existing saved draft as source material.",
          "Redraft content:",
          redraftContent,
          `Target post length: ${postLength} (${postLengthGuidance(postLength)})`,
          `Emoji intensity: ${emojiIntensity}`
        ]
          .filter(Boolean)
          .join("\n\n"),
        angle: regenerationAngle,
        sourceReference: post?.sourceRefs?.find((reference) => /^https?:\/\//i.test(reference)),
        viewpoint:
          "Redraft the supplied Redraft content into a new LinkedIn post. Treat that text as the source of truth and preserve its main points.",
        sensitivity: `Preserve nuance, avoid hype, and keep the draft suitable for LinkedIn. ${postLengthGuidance(postLength)} Match emoji intensity: ${emojiIntensity}.`,
        emojiUsage: emojiUsageForIntensity(emojiIntensity),
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
    setMessage("Generated redrafted options. Choose one below to replace the current editor content.");
  }

  function applyRegeneratedDraft(draft: GeneratedDraft) {
    setTitle(draft.hook);
    setHook(draft.hook);
    setBody(draft.post_body);
    setHashtags(draft.hashtags.join(" "));
    setFirstComment(draft.first_comment);
    setImageIdea(draft.image_idea);
    setAngle(draft.angle);
    setStatus("draft");
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
      setSelectedPublishImageId(data.image.id);
      setMessageType("success");
      setMessage("Image generated and attached to this draft.");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Image could not be generated.");
    } finally {
      setImageLoading(false);
    }
  }

  async function deleteSavedImage(id: string) {
    const confirmed = window.confirm("Delete this generated image? This cannot be undone.");
    if (!confirmed) return;

    setImageLoading(true);
    setMessageType("info");
    setMessage("Deleting image...");

    try {
      const response = await fetch(`/api/generated-images/${id}`, { method: "DELETE" });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Image could not be deleted.");
      }

      setPost((current) =>
        current
          ? {
              ...current,
              images: current.images.filter((image) => image.id !== id)
            }
          : current
      );
      if (selectedPublishImageId === id) {
        const nextImage = post?.images.find((image) => image.id !== id);
        setSelectedPublishImageId(nextImage?.id ?? "");
      }
      setMessageType("success");
      setMessage("Image deleted.");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Image could not be deleted.");
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

  async function copyFinalPost() {
    await navigator.clipboard.writeText(finalPostText);
    setPublishMessage("Post copied. Paste it into LinkedIn when you are ready.");
  }

  async function publishDraft() {
    if (!publishedDate) {
      setPublishMessage("Add a published date before publishing.");
      return;
    }

    setLoading(true);
    setPublishMessage("Publishing draft...");

    try {
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
          status: "published",
          publishedAt: new Date(`${publishedDate}T12:00:00`).toISOString(),
          metadata: { publishedFromDraftEditor: true }
        })
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Draft could not be published.");
      }

      setStatus("published");
      setPost((current) =>
        current
          ? {
              ...current,
              ...data.post,
              versions: data.post?.versions ? [...data.post.versions, ...current.versions] : current.versions,
              images: current.images
            }
          : current
      );
      setMessageType("success");
      setMessage(`Draft marked as published for ${publishedDate}.`);
      setPublishMessage("Published date saved and draft status changed to Published.");
    } catch (error) {
      setPublishMessage(error instanceof Error ? error.message : "Draft could not be published.");
    } finally {
      setLoading(false);
    }
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
            <button type="button" onClick={() => setPublishOpen(true)} disabled={!body.trim()}>
              <Send size={17} /> Publish
            </button>
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

        <div className="card grid">
          <h2>Sources Used</h2>
          {post?.sourceRefs?.length ? (
            <div className="list">
              {post.sourceRefs.map((sourceRef, index) => (
                <div className="list-item" key={`${sourceRef}-${index}`}>
                  <div className="source-list-content">
                    {isUrl(sourceRef) ? (
                      <a href={sourceRef} target="_blank" rel="noreferrer">
                        {sourceRef}
                      </a>
                    ) : (
                      <p>{sourceRef}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No source references were saved with this draft.</p>
          )}
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
        <div className="grid two redraft-layout">
          <div className="grid redraft-controls">
            <label>
              Regeneration angle
              <select value={regenerationAngle} onChange={(event) => setRegenerationAngle(event.target.value)}>
                {postAngles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Post length
              <select value={postLength} onChange={(event) => setPostLength(event.target.value as (typeof postLengths)[number])}>
                {postLengths.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Emoji intensity
              <select
                value={emojiIntensity}
                onChange={(event) => setEmojiIntensity(event.target.value as (typeof emojiIntensities)[number])}
              >
                {emojiIntensities.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Redraft content
              <textarea
                className="redraft-content"
                placeholder="Paste or write the content you want turned into a new LinkedIn post."
                value={redraftContent}
                onChange={(event) => setRedraftContent(event.target.value)}
              />
            </label>
            <button type="button" onClick={regenerateDraft} disabled={loading || !redraftContent.trim()}>
              <RefreshCw size={17} /> {loading ? "Working..." : "Redraft post"}
            </button>
          </div>

          <div className="list">
            {regeneratedDrafts.length === 0 ? (
              <p>No regenerated drafts yet.</p>
            ) : (
              regeneratedDrafts.map((draft, index) => (
                <div className="list-item" key={`${draft.hook}-${index}`}>
                  <div className="regenerated-draft-preview">
                    <h3>{draft.hook}</h3>
                    <p className="regenerated-draft-body">{draft.post_body}</p>
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
                <button type="button" onClick={() => deleteSavedImage(image.id)} disabled={imageLoading}>
                  <Trash2 size={17} /> Delete image
                </button>
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

      {publishOpen ? (
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
                  <button type="button" onClick={publishDraft} disabled={loading || !publishedDate}>
                    <Send size={17} /> {loading ? "Publishing..." : "Publish"}
                  </button>
                  {selectedPublishImage ? (
                    <a className="button" href={selectedPublishImage.imagePath} download>
                      <Download size={17} /> Download image
                    </a>
                  ) : (
                    <button type="button" disabled>
                      <Download size={17} /> No image to download
                    </button>
                  )}
                </div>
                <label>
                  Published Date
                  <input type="date" value={publishedDate} onChange={(event) => setPublishedDate(event.target.value)} />
                </label>
                {publishMessage ? <p>{publishMessage}</p> : null}
              </div>

              <div className="grid">
                {publishImages.length > 0 ? (
                  <>
                    <label>
                      Image
                      <select
                        value={selectedPublishImage?.id ?? ""}
                        onChange={(event) => setSelectedPublishImageId(event.target.value)}
                      >
                        {publishImages.map((image, index) => (
                          <option key={image.id} value={image.id}>
                            {`Image ${index + 1} - ${image.provider}${image.model ? ` (${image.model})` : ""}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedPublishImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt="Selected publish visual"
                        src={selectedPublishImage.imagePath}
                        className="publish-image-preview"
                      />
                    ) : null}
                  </>
                ) : (
                  <p>No image is attached to this draft yet. Use Generate Image if you want a visual with the post.</p>
                )}
                {firstComment ? (
                  <p>
                    <strong>First comment:</strong> {firstComment}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildFinalPostText(input: { hook: string; body: string; hashtags: string }) {
  return [input.hook, input.body, input.hashtags].map((part) => part.trim()).filter(Boolean).join("\n\n");
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizePostStatus(status: string) {
  return status === "edited" ? "draft" : status;
}

function emojiUsageForIntensity(intensity: (typeof emojiIntensities)[number]): EmojiUsage {
  if (intensity === "None") return "none";
  if (intensity === "Medium") return "moderate";
  if (intensity === "Heavy") return "high";
  return "light";
}

function postLengthGuidance(length: (typeof postLengths)[number]) {
  if (length === "Short") {
    return "Write a concise post of about 75-120 words.";
  }

  if (length === "Long") {
    return "Write a fuller post of about 220-320 words with more explanation and supporting detail.";
  }

  return "Write a medium-length post of about 140-220 words.";
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as { error?: string; ok?: boolean; post?: DraftPost & { versions?: DraftPost["versions"] } };
  } catch {
    return { error: text.slice(0, 240) };
  }
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}
