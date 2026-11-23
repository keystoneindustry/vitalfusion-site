import { Fragment } from "react";
import type { LegalSection } from "@/content/legal";

/** **bold** inside a line. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** Lines starting with "- " become a bullet list; everything else is a paragraph. */
function Body({ lines }: { lines: string[] }) {
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) out.push(<ul key={`u${out.length}`}>{bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}</ul>);
    bullets = [];
  };
  lines.forEach((l, i) => {
    if (l.startsWith("- ")) bullets.push(l.slice(2));
    else {
      flush();
      out.push(<p key={`p${i}`}>{inline(l)}</p>);
    }
  });
  flush();
  return <>{out}</>;
}

export default function LegalPage({ title, intro, sections }: { title: string; intro: string[]; sections: LegalSection[] }) {
  return (
    <main className="wrap legal">
      <h1 className="display">{title}</h1>
      <Body lines={intro} />
      {sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <Body lines={s.body} />
        </section>
      ))}
    </main>
  );
}
