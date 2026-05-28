import { FileInput, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function ImportsPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Imports"
        title="LinkedIn history import"
        description="Upload LinkedIn shares CSV files and article HTML exports to build the voice and style corpus."
        actions={
          <button className="primary">
            <Upload size={17} /> Start import
          </button>
        }
      />

      <section className="grid two">
        <form className="card grid">
          <h2>Upload Files</h2>
          <label>
            LinkedIn shares CSV
            <input accept=".csv" type="file" />
          </label>
          <label>
            LinkedIn article HTML files
            <input accept=".html,.htm" multiple type="file" />
          </label>
          <label>
            Duplicate handling
            <select defaultValue="skip">
              <option value="skip">Skip existing records</option>
              <option value="preview">Preview duplicates before import</option>
              <option value="overwrite">Overwrite only after confirmation</option>
            </select>
          </label>
          <button className="primary" type="button">
            <FileInput size={17} /> Preview import
          </button>
        </form>

        <div className="card">
          <h2>Import Rules</h2>
          <p>Posts are deduplicated by source type, normalized URL, and content hash.</p>
          <p>Each import stores the original row or HTML for traceability, then extracts clean text for retrieval and style analysis.</p>
          <div className="pill-row">
            <span className="pill">CSV posts</span>
            <span className="pill">HTML articles</span>
            <span className="pill">Voice corpus</span>
            <span className="pill">Embeddings queued</span>
          </div>
        </div>
      </section>

      <section className="card section-band">
        <h2>Recent Import Results</h2>
        <div className="list">
          {[
            ["LinkedIn shares CSV", "Parsed 42 rows, 39 new records, 3 duplicates skipped."],
            ["Article HTML batch", "Parsed 6 files, 6 articles queued for embedding."]
          ].map(([title, detail]) => (
            <div className="list-item" key={title}>
              <div>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
              <span className="status">complete</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
