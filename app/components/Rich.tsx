import { Fragment } from "react";

// Renders copy from content/site.ts where *words in stars* get the italic
// accent font, e.g. "It was never your *willpower.*", and **double stars** are bold.
export default function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p.startsWith("*") && p.endsWith("*") ? <em key={i}>{p.slice(1, -1)}</em>
        : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}
