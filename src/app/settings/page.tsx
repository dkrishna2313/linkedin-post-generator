import { KeyRound, Save, ServerCog } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Settings"
        title="Workspace and provider settings"
        description="Manage profile details, encrypted provider keys, model preferences, diagnostics, and backup/export options."
        actions={
          <button className="primary">
            <Save size={17} /> Save settings
          </button>
        }
      />

      <section className="grid two">
        <form className="card grid">
          <h2>Workspace</h2>
          <label>
            Workspace name
            <input defaultValue="Dilip LinkedIn Studio" />
          </label>
          <label>
            User email
            <input defaultValue="dilip@example.com" type="email" />
          </label>
          <label>
            Default text provider
            <select defaultValue="openai">
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
        </form>

        <form className="card grid">
          <h2>Provider Keys</h2>
          <label>
            OpenAI API key
            <input placeholder="sk-... stored server-side only" type="password" />
          </label>
          <label>
            Gemini API key
            <input placeholder="Stored server-side only" type="password" />
          </label>
          <div className="toolbar">
            <button className="primary" type="button">
              <KeyRound size={17} /> Store encrypted
            </button>
            <button type="button">Test provider</button>
          </div>
        </form>
      </section>

      <section className="grid two section-band">
        <div className="card">
          <h2>Deployment Diagnostics</h2>
          <div className="list">
            {["Database connection", "Redis queue", "Upload storage", "Caddy reverse proxy"].map((item) => (
              <div className="list-item" key={item}>
                <span>{item}</span>
                <span className="status warn">not checked</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Backup and Export</h2>
          <p>Export posts, sources, drafts, brand memory, and generated image metadata for off-server backup.</p>
          <div className="toolbar">
            <button>
              <ServerCog size={17} /> Export JSON
            </button>
            <button>Download storage manifest</button>
          </div>
        </div>
      </section>
    </div>
  );
}
