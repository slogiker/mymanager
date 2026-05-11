import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/portfolio/Hero';
import ProjectsGrid from '../components/portfolio/ProjectsGrid';
import SkillsSection from '../components/portfolio/SkillsSection';
import ContactForm from '../components/portfolio/ContactForm';

export default function PortfolioPage() {
  return (
    <div className="relative">
      <Navbar />
      <main>
        <Hero />
        <ProjectsGrid />
        <SkillsSection />
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
}
