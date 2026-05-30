"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type LatestSource = {
  id: string;
  title: string | null;
  url: string | null;
  summary: string | null;
  status: string;
  tags: string[];
};

export function LatestSourcesClient({ sources }: { sources: LatestSource[] }) {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

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

  if (sources.length === 0) {
    return <p>No saved sources yet.</p>;
  }

  return (
    <div className="list">
      {sources.map((source) => {
        const expanded = expandedSources.has(source.id);

        return (
          <div className="list-item" key={source.id}>
            <div className="source-list-content">
              <h3>{source.title ?? source.url ?? "Untitled source"}</h3>
              <p className={expanded ? "source-detail expanded" : "source-detail"}>
                {source.summary ?? "No summary yet."}
              </p>
              <div className="pill-row">
                {source.tags.map((tag) => (
                  <span className="pill" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="toolbar">
              <span className="status">{source.status}</span>
              {source.summary ? (
                <button
                  className="icon"
                  type="button"
                  title={expanded ? "Collapse summary" : "Expand summary"}
                  onClick={() => toggleExpanded(source.id)}
                >
                  {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
