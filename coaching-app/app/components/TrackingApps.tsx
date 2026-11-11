/** "How to track your calories": the two apps Tyler recommends, each opening its app store page. */
export default function TrackingApps({ guideId }: { guideId?: string | null }) {
  return (
    <section className="card">
      <h2 className="h2">📱 Track your calories</h2>
      <p className="coming" style={{ marginTop: 0 }}>Log what you eat in one of these free apps and aim for your targets above.</p>
      <div className="app-links">
        <a className="btn btn-ghost" href="/go/cronometer" target="_blank" rel="noopener noreferrer">
          ⬇ Cronometer
        </a>
        <a className="btn btn-ghost" href="/go/myfitnesspal" target="_blank" rel="noopener noreferrer">
          ⬇ MyFitnessPal
        </a>
      </div>
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        Cronometer is Tyler's pick. Either one works.
        {guideId && (
          <>
            {" "}
            New to tracking? <a href={`/resources/${guideId}`}>Read the guide</a>.
          </>
        )}
      </p>
    </section>
  );
}
