import Link from "next/link";
import { homePath } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="app-state" id="main-content">
      <section className="status-panel">
        <div className="article-namespace">404</div>
        <h1>页面不存在</h1>
        <p>这个世界或词条没有找到。</p>
        <Link className="primary-button" href={homePath()}>
          返回首页
        </Link>
      </section>
    </main>
  );
}
