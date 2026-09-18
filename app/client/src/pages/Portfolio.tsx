import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/portfolio/Hero';
import ApplicationsGrid from '../components/portfolio/ApplicationsGrid';
import SkillsSection from '../components/portfolio/SkillsSection';
import ContactForm from '../components/portfolio/ContactForm';

export default function PortfolioPage() {
  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <div className="border-t border-slate-800/20">
          <ApplicationsGrid />
        </div>
        <div className="border-t border-slate-800/20">
          <SkillsSection />
        </div>
        <div className="border-t border-slate-800/20">
          <ContactForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
