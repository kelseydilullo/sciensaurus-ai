import { ArticleAnalyzer } from "@/components/article-analyzer";
import { SciensaurusLogo } from "@/components/sciensaurus-logo";
import Link from "next/link";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#1e3a6d] text-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <SciensaurusLogo className="h-8 w-8" variant="outline" />
            <span className="text-2xl font-bold">Sciensaurus</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="hover:text-blue-200 transition">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 text-[#1e3a6d]">
          Analyze Scientific Articles
        </h1>
        <p className="text-lg text-center mb-12 max-w-3xl mx-auto">
          Paste a URL to a scientific article, and our AI assistant will analyze it, providing a comprehensive breakdown of the research.
        </p>

        <ArticleAnalyzer />

        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-[#1e3a6d]">How it works</h2>
          <ol className="list-decimal pl-6 space-y-3">
            <li>Paste the URL of a scientific article (PubMed, Nature, Science, etc.)</li>
            <li>Our AI reads and analyzes the content</li>
            <li>Get a comprehensive breakdown with key findings, methodology, and significance</li>
            <li>Share or save the analysis for future reference</li>
          </ol>
        </div>
      </main>

      <footer className="bg-gray-100 py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} Sciensaurus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

