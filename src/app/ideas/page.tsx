import { Lightbulb, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ideaCategories, viewpoints } from "@/lib/data/seed";

const ideas = [
  {
    title: "AI adoption needs a commercial operating system",
    premise: "Most AI roadmaps focus on capability before they define ownership, customer value, and monetization.",
    angle: "Framework post",
    cta: "Where does your AI strategy still depend on heroic execution?"
  },
  {
    title: "The new leadership skill is problem selection",
    premise: "As execution gets cheaper, the scarce skill becomes choosing the right problem and framing the right bet.",
    angle: "Personal reflection",
    cta: "What problem would you choose if prototyping were nearly free?"
  },
  {
    title: "Reskilling only works when work is redesigned",
    premise: "Training without role redesign leaves employees with new skills inside old workflows.",
    angle: "What this means for leaders",
    cta: "Are your reskilling plans connected to actual workflow change?"
  }
];

export default function IdeasPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Ideas"
        title="Original post idea generator"
        description="Surface ideas from viewpoints, prior posts, saved sources, and underused themes in the content base."
        actions={
          <button className="primary">
            <Lightbulb size={17} /> Generate ideas
          </button>
        }
      />

      <section className="card">
        <h2>Idea Categories</h2>
        <div className="pill-row">
          {ideaCategories.map((category) => (
            <span className="pill" key={category}>
              {category}
            </span>
          ))}
        </div>
      </section>

      <section className="grid three section-band">
        {ideas.map((idea, index) => (
          <article className="card" key={idea.title}>
            <h2>{idea.title}</h2>
            <p>{idea.premise}</p>
            <div className="pill-row">
              <span className="pill">{idea.angle}</span>
              <span className="pill">{viewpoints[index % viewpoints.length].title}</span>
            </div>
            <p style={{ marginTop: 14 }}>
              <strong>Possible hook:</strong> {idea.cta}
            </p>
            <button>
              <Search size={17} /> Research this idea
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
