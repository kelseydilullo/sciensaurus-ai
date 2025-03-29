import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  LucideBookOpen,
  LucideCalendarClock,
  LucideFileText,
  LucideList,
  LucideSearch,
  LucideUsers,
  LucideArrowRight,
} from "lucide-react"
import { SciensaurusLogo } from "@/components/sciensaurus-logo"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#1e3a6d] text-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SciensaurusLogo className="h-8 w-8" variant="outline" />
            <span className="text-2xl font-bold">Sciensaurus</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="hover:text-blue-200 transition">
              Home
            </Link>
            <Link href="#features" className="hover:text-blue-200 transition">
              Features
            </Link>
            <Link href="#use-cases" className="hover:text-blue-200 transition">
              Use Cases
            </Link>
            <Link href="#enterprise" className="hover:text-blue-200 transition">
              Enterprise
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button
                variant="outline"
                className="text-[#1e3a6d] border-white bg-white hover:bg-white/90 hover:text-[#1e3a6d]"
              >
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-blue-500 text-white hover:bg-blue-600">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-[#1e3a6d] text-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Your AI-Powered Research Companion</h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto">Scientific research summarized and demystified.</p>

          {/* URL Input Box */}
          <div className="max-w-2xl mx-auto mb-10 relative landing-page-search">
            <form action="/demo">
              <Input
                type="url"
                name="url"
                placeholder="Paste article URL here..."
                className="py-6 pl-12 pr-4 rounded-lg text-black"
              />
              <LucideSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600"
              >
                Analyze <LucideArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/demo">
              <Button className="bg-white text-[#1e3a6d] hover:bg-gray-100">See Demo</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-[#1e3a6d]">
            Powerful Features for Research Efficiency
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<LucideList className="h-10 w-10 text-blue-600" />}
              title="AI-Powered Summarization"
              description="Clear summaries with concise bullet points and emojis to highlight key findings."
            />
            <FeatureCard
              icon={<LucideSearch className="h-10 w-10 text-blue-600" />}
              title="Important Keywords"
              description="Automatically extract and highlight the most important terms and concepts."
            />
            <FeatureCard
              icon={<LucideFileText className="h-10 w-10 text-blue-600" />}
              title="Similar Article Analysis"
              description="Discover related research that supports or contradicts the main article's findings."
            />
            <FeatureCard
              icon={<LucideUsers className="h-10 w-10 text-blue-600" />}
              title="Cohort Visualization"
              description="Visual breakdown of people or subjects studied in the research."
            />
            <FeatureCard
              icon={<LucideCalendarClock className="h-10 w-10 text-blue-600" />}
              title="Research Timeline"
              description="Track existing research on a subject over time to see the evolution of findings."
            />
            <FeatureCard
              icon={<LucideBookOpen className="h-10 w-10 text-blue-600" />}
              title="Personal Collections"
              description="Save articles to custom collections for future reference and organization."
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-[#1e3a6d]">Engineered to Empower</h2>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <UseCaseCard
              title="Healthcare Professionals"
              description="Doctors and medical practitioners stay up-to-date with the latest research to provide better patient care and treatment options."
              image="/placeholder.svg?height=200&width=400"
            />
            <UseCaseCard
              title="Patients"
              description="Understand complex medical articles assigned by your doctor about your health conditions in clear, accessible language."
              image="/placeholder.svg?height=200&width=400"
            />
            <UseCaseCard
              title="Academic Researchers"
              description="University researchers and students can quickly process large volumes of literature and identify relevant studies."
              image="/placeholder.svg?height=200&width=400"
            />
            <UseCaseCard
              title="Health-Conscious Individuals"
              description="Stay informed about advancements in nutrition, aging, wellness trends, psychology, and other health-related topics."
              image="/placeholder.svg?height=200&width=400"
            />
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-bold mb-6 text-[#1e3a6d]">Research Topics Our Users Love</h3>
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {[
                "Metabolic Health",
                "Aging",
                "Wellness",
                "Parenting",
                "Psychology",
                "Environmental Factors",
                "Hormone Health",
                "Fertility",
                "Cancer Research",
                "Chronic Pain",
                "Nutrition",
                "Mental Health",
                "Exercise Science",
                "Sleep Research",
                "Immunology",
              ].map((topic, index) => (
                <span key={index} className="bg-blue-100 text-[#1e3a6d] px-4 py-2 rounded-full text-sm font-medium">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section className="py-16 md:py-24 bg-[#1e3a6d] text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Enterprise Solutions</h2>
            <p className="text-xl mb-10">
              White label summarization for embedding in your company's apps, such as patient portals, research
              databases, or healthcare systems.
            </p>
            <Button className="bg-white text-[#1e3a6d] hover:bg-gray-100">Contact Sales</Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-blue-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#1e3a6d]">
            Ready to Transform Your Research Experience?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto">
            Join thousands of professionals who save time and gain deeper insights with Sciensaurus.
          </p>
          <Link href="/signup">
            <Button className="bg-[#1e3a6d] text-white hover:bg-[#0f2a4d] px-8 py-6 text-lg">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <SciensaurusLogo className="h-6 w-6" variant="outline" />
                <span className="text-xl font-bold">Sciensaurus</span>
              </div>
              <p className="text-gray-400">
                AI-powered scientific research companion that makes complex research accessible.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Enterprise
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Case Studies
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} Sciensaurus. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-[#1e3a6d]">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Card>
  )
}

function UseCaseCard({ 
  title, 
  description, 
  image 
}: { 
  title: string; 
  description: string; 
  image: string;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <img src={image || "/placeholder.svg"} alt={title} className="w-full h-48 object-cover" />
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-[#1e3a6d]">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </Card>
  )
}

