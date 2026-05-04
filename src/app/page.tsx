import { CreateWorldForm } from "@/components/CreateWorldForm";

export default function Home() {
  return (
    <main className="home">
      <section className="home-panel">
        <h1 className="brand">Infinite Lore Wiki</h1>
        <p className="subtitle">
          写下一个世界的设定，再指定第一篇要打开的词条。
          后续页面会沿着高亮的 wiki 链接自然扩展。
        </p>
        <CreateWorldForm />
      </section>
    </main>
  );
}
