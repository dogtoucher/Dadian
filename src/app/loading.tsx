export default function Loading() {
  return (
    <main className="app-state" id="main-content" aria-busy="true">
      <section className="status-panel">
        <div className="article-namespace">词条</div>
        <h1>正在加载</h1>
        <p>正在准备词条。</p>
        <div className="reading-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
