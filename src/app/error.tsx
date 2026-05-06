"use client";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app-state" id="main-content">
      <section className="status-panel status-panel-error">
        <div className="article-namespace">Error</div>
        <h1>页面载入失败</h1>
        <p>{error.message || "应用遇到未处理错误。"}</p>
        <button className="primary-button" onClick={reset} type="button">
          重试
        </button>
      </section>
    </main>
  );
}
