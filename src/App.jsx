import Navbar from './components/sections/Navbar'
import Hero from './components/sections/Hero'
import LogoCloud from './components/sections/LogoCloud'
import DashboardSection from './components/sections/DashboardSection'
import Features from './components/sections/Features'
import Integrations from './components/sections/Integrations'
import Collaboration from './components/sections/Collaboration'
import Pricing from './components/sections/Pricing'
import FinalCTA from './components/sections/FinalCTA'
import Footer from './components/sections/Footer'

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div aria-hidden="true" className="noise pointer-events-none fixed inset-0 z-[60]" />
      <Navbar />
      <main>
        <Hero />
        <LogoCloud />
        <DashboardSection />
        <Features />
        <Integrations />
        <Collaboration />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
