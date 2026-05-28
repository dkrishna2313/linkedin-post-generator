import { FileText, PenLine, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { sampleSources, viewpoints } from "@/lib/data/seed";

export default function ArticleStudioPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Article Studio"
        title="Long-form LinkedIn article workflow"
        description="Build a thesis, gather supporting sources, draft section by section, and generate a promotional LinkedIn post."
        actions={
          <button className="primary">
            <Sparkles size={17} /> Generate outline
          </button>
        }
      />

      <section className="grid two">
        <form className="card grid">
          <h2>Article Brief</h2>
          <label>
            Topic
            <input placeholder="Operating model change in AI transformation" />
          </label>
          <label>
            Thesis or viewpoint
            <select defaultValue={viewpoints[0].title}>
              {viewpoints.map((item) => (
                <option key={item.title}>{item.title}</option>
              ))}
            </select>
          </label>
          <label>
            Supporting source
            <select defaultValue={sampleSources[0].title}>
              {sampleSources.map((item) => (
                <option key={item.title}>{item.title}</option>
              ))}
            </select>
          </label>
          <label>
            Notes
            <textarea placeholder="Add supporting arguments, examples, caveats, and reader takeaway." />
          </label>
        </form>

        <div className="card grid">
          <h2>Article Outputs</h2>
          {[
            "Title options",
            "Subtitle",
            "Structured outline",
            "Section drafts",
            "Pull quotes",
            "Cover image concept",
            "Promotional LinkedIn post",
            "First comment and hashtags"
          ].map((item) => (
            <div className="list-item" key={item}>
              <span>{item}</span>
              <FileText size={17} color="#64748b" />
            </div>
          ))}
        </div>
      </section>

      <section className="card section-band">
        <h2>Section Editor</h2>
        <label>
          Draft body
          <textarea placeholder="Generated article sections will appear here for editing." />
        </label>
        <div className="toolbar">
          <button className="primary">
            <PenLine size={17} /> Save article
          </button>
          <button>Generate promo post</button>
          <button>Generate title options</button>
        </div>
      </section>
    </div>
  );
}
