import Link from "next/link";
import { FileInput, Lightbulb, PenLine, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db/prisma";

const defaultWorkspaceId = "default-workspace";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [draftCount, readyCount, sourceCount, recentDrafts, recentSources] = await Promise.all([
    prisma.post.count({ where: { workspaceId: defaultWorkspaceId, status: { in: ["draft", "edited"] } } }),
    prisma.post.count({ where: { workspaceId: defaultWorkspaceId, status: "ready_to_post" } }),
    prisma.source.count({ where: { workspaceId: defaultWorkspaceId } }),
    prisma.post.findMany({
      where: { workspaceId: defaultWorkspaceId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, hook: true, body: true, status: true, updatedAt: true }
    }),
    prisma.source.findMany({
      where: { workspaceId: defaultWorkspaceId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, url: true, summary: true, status: true, tags: true }
    })
  ]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Workspace"
        title="LinkedIn content command center"
        description="Track sources, draft status, brand memory, and high-priority writing actions from one focused workspace."
        actions={
          <>
            <Link className="button primary" href="/post-studio">
              <PenLine size={17} /> New post
            </Link>
            <Link className="button" href="/sources">
              <Plus size={17} /> Add source
            </Link>
          </>
        }
      />

      <section className="grid three">
        <div className="card metric">
          <span className="eyebrow">Drafts</span>
          <strong>{draftCount}</strong>
          <p>{readyCount} ready to post.</p>
        </div>
        <div className="card metric">
          <span className="eyebrow">Sources</span>
          <strong>{sourceCount}</strong>
          <p>Saved in the source inbox.</p>
        </div>
        <div className="card metric">
          <span className="eyebrow">Ideas</span>
          <strong>12</strong>
          <p>Generated from viewpoints and underused themes.</p>
        </div>
      </section>

      <section className="grid two section-band">
        <div className="card">
          <h2>Quick Actions</h2>
          <div className="toolbar">
            <Link className="button primary" href="/post-studio">
              <PenLine size={17} /> Generate post
            </Link>
            <Link className="button" href="/article-studio">
              <FileInput size={17} /> New article
            </Link>
            <Link className="button" href="/imports">
              <FileInput size={17} /> Import history
            </Link>
            <Link className="button" href="/ideas">
              <Lightbulb size={17} /> Generate ideas
            </Link>
          </div>
        </div>

        <div className="card">
          <h2>Recent Drafts</h2>
          <div className="list">
            {recentDrafts.length === 0 ? (
              <p>No saved drafts yet.</p>
            ) : (
              recentDrafts.map((post) => (
                <div className="list-item" key={post.id}>
                  <div>
                    <h3>{post.title ?? post.hook ?? "Untitled draft"}</h3>
                    <p>{post.body.slice(0, 180)}</p>
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
      </section>

      <section className="card section-band">
        <h2>Latest Sources</h2>
        <div className="list">
          {recentSources.length === 0 ? (
            <p>No saved sources yet.</p>
          ) : (
            recentSources.map((source) => (
              <div className="list-item" key={source.id}>
                <div>
                  <h3>{source.title ?? source.url ?? "Untitled source"}</h3>
                  <p>{source.summary ?? "No summary yet."}</p>
                  <div className="pill-row">
                    {source.tags.map((tag) => (
                      <span className="pill" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="status">{source.status}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
