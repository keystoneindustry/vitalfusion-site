/** Placeholder for tabs that get filled in during later build phases. */
export default function ComingSoon({ eyebrow, title, intro, items }: { eyebrow: string; title: string; intro: string; items: string[] }) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="h1">{title}</h1>
      <p className="lead">{intro}</p>
      <section className="card">
        <h2 className="h2">Coming soon</h2>
        <ul className="coming" style={{ margin: 0, paddingLeft: 20 }}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
