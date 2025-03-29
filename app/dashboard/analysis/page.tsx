import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { LucideExternalLink, LucideBookmark, LucideShare2, LucideDownload, LucidePrinter } from "lucide-react"

export default function AnalysisPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Main Dashboard Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {/* Article Info */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span>Source: Nature Medicine</span>
                  <span>•</span>
                  <span>Published: March 15, 2023</span>
                  <span>•</span>
                  <a href="#" className="flex items-center gap-1 text-blue-600 hover:underline">
                    View Original <LucideExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Efficacy of Novel mRNA Vaccine Candidates Against SARS-CoV-2 Variants of Concern
                </h1>

                <h2 className="text-xl md:text-2xl font-semibold text-[#1e3a6d] mb-6">
                  AI Summary: New mRNA vaccines show promising results against multiple COVID-19 variants
                </h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <LucideBookmark className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <LucideShare2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <LucideDownload className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <LucidePrinter className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Key Findings */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-[#1e3a6d]">Key Findings</CardTitle>
              <CardDescription>The most important discoveries from this research</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="text-2xl">🧬</span>
                  <span>
                    Novel mRNA-1273.351 vaccine candidate demonstrated 96.4% efficacy against the Beta variant in phase
                    3 clinical trials.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">🛡️</span>
                  <span>
                    Neutralizing antibody titers were 4.3-fold higher against the Delta variant compared to the original
                    vaccine formulation.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">⏱️</span>
                  <span>
                    Protection lasted at least 8 months post-vaccination with minimal waning of immunity observed.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">🔬</span>
                  <span>
                    T-cell responses showed cross-reactivity against all tested variants, including Beta, Delta, and
                    Omicron.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">💉</span>
                  <span>
                    Side effect profile was similar to the original mRNA vaccines with no new safety concerns
                    identified.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">🦠</span>
                  <span>
                    Breakthrough infections were 76% less common with the new vaccine candidate compared to the original
                    formulation.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-2xl">👵</span>
                  <span>
                    Efficacy in adults over 65 years was 91.3%, showing strong protection in vulnerable populations.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Keywords */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[#1e3a6d] mb-3">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {[
                "mRNA vaccines",
                "SARS-CoV-2",
                "COVID-19",
                "Variants of concern",
                "Beta variant",
                "Delta variant",
                "Neutralizing antibodies",
                "T-cell immunity",
                "Vaccine efficacy",
                "Breakthrough infections",
              ].map((keyword, index) => (
                <Link href={`/dashboard/research-topic/1`} key={index}>
                  <Badge variant="outline" className="bg-blue-50 text-[#1e3a6d] hover:bg-blue-100 cursor-pointer">
                    {keyword}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Cohort Analysis */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[#1e3a6d] mb-3">Cohort Analysis</h3>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Sample Size */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Sample Size</span>
                      <span className="text-sm text-gray-500">32,459 participants</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-[#1e3a6d] h-2 rounded-full" style={{ width: "100%" }}></div>
                    </div>
                  </div>

                  {/* Age Distribution */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Age Distribution</span>
                    </div>
                    <div className="flex items-end h-16 gap-1">
                      <div className="bg-blue-200 w-full rounded-t" style={{ height: "20%" }}>
                        <div className="text-xs text-center mt-1">18-24</div>
                        <div className="text-xs text-center font-medium">8%</div>
                      </div>
                      <div className="bg-blue-300 w-full rounded-t" style={{ height: "45%" }}>
                        <div className="text-xs text-center mt-1">25-34</div>
                        <div className="text-xs text-center font-medium">18%</div>
                      </div>
                      <div className="bg-blue-400 w-full rounded-t" style={{ height: "75%" }}>
                        <div className="text-xs text-center mt-1">35-49</div>
                        <div className="text-xs text-center font-medium">30%</div>
                      </div>
                      <div className="bg-blue-500 w-full rounded-t" style={{ height: "100%" }}>
                        <div className="text-xs text-center mt-1">50-64</div>
                        <div className="text-xs text-center font-medium">40%</div>
                      </div>
                      <div className="bg-blue-600 w-full rounded-t" style={{ height: "25%" }}>
                        <div className="text-xs text-center mt-1 text-white">65+</div>
                        <div className="text-xs text-center font-medium text-white">10%</div>
                      </div>
                    </div>
                  </div>

                  {/* Gender Distribution and Study Duration */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Gender</span>
                      <div className="flex mt-1">
                        <div className="bg-blue-500 h-4 rounded-l" style={{ width: "52%" }}></div>
                        <div className="bg-pink-400 h-4 rounded-r" style={{ width: "48%" }}></div>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span>Male: 52%</span>
                        <span>Female: 48%</span>
                      </div>
                    </div>

                    {/* Study Duration */}
                    <div>
                      <span className="text-sm font-medium">Study Duration</span>
                      <div className="flex items-center mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: "75%" }}></div>
                        </div>
                        <span className="ml-2 text-sm">18 months</span>
                      </div>
                    </div>
                  </div>

                  {/* Geographic Distribution */}
                  <div>
                    <span className="text-sm font-medium">Geographic Distribution</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">North America (42%)</Badge>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Europe (28%)</Badge>
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Asia (18%)</Badge>
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">South America (8%)</Badge>
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Africa (4%)</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Related Research */}
          <h3 className="text-xl font-semibold text-[#1e3a6d] mb-6">Related Research</h3>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Supporting Research */}
            <div>
              <h4 className="text-lg font-medium mb-4 flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                Supporting Research
              </h4>
              <div className="space-y-4">
                {[
                  {
                    title:
                      "Broad neutralization of SARS-CoV-2 variants by an inhalable bispecific single-domain antibody",
                    journal: "Cell",
                    date: "February 2023",
                    findings: [
                      "Bispecific antibodies neutralize all tested variants",
                      "Inhalable delivery enhances mucosal immunity",
                    ],
                  },
                  {
                    title: "Bivalent mRNA vaccine booster induces robust antibody response against Omicron subvariants",
                    journal: "Nature Immunology",
                    date: "January 2023",
                    findings: [
                      "Bivalent boosters increase neutralizing antibodies",
                      "Cross-protection against multiple subvariants observed",
                    ],
                  },
                  {
                    title: "T cell responses to mRNA vaccination are durable and broadly reactive",
                    journal: "Science Immunology",
                    date: "December 2022",
                    findings: [
                      "T cell immunity persists for 12+ months",
                      "Broad recognition of variant spike proteins",
                    ],
                  },
                ].map((article, index) => (
                  <Card key={index} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{article.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {article.journal} • {article.date}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1">
                        {article.findings.map((finding, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Contradictory Research - Unblurred for logged-in users */}
            <div>
              <h4 className="text-lg font-medium mb-4 flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                Contradictory Research
              </h4>
              <div className="space-y-4">
                {[
                  {
                    title: "Limitations of mRNA vaccines against emerging SARS-CoV-2 recombinant strains",
                    journal: "Virology",
                    date: "March 2023",
                    findings: [
                      "Reduced efficacy against XE recombinant variant",
                      "Antibody escape mechanisms identified",
                    ],
                  },
                  {
                    title: "Waning immunity after mRNA vaccination requires alternative approaches",
                    journal: "Frontiers in Immunology",
                    date: "January 2023",
                    findings: [
                      "Significant decline in protection after 6 months",
                      "Protein-based vaccines show more durable response",
                    ],
                  },
                  {
                    title: "Mucosal immunity limitations of current mRNA vaccine platforms",
                    journal: "Nature Reviews Immunology",
                    date: "February 2023",
                    findings: [
                      "Poor induction of mucosal IgA antibodies",
                      "Nasal vaccines demonstrate superior respiratory protection",
                    ],
                  },
                ].map((article, index) => (
                  <Card key={index} className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{article.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {article.journal} • {article.date}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1">
                        {article.findings.map((finding, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-500 font-bold">✗</span>
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

