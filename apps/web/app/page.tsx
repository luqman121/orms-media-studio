import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Hero from '@/components/landing/Hero';
import { ModelStrip, UseCases, Features, PromptBuilder, Gallery } from '@/components/landing/Sections';
import Pricing from '@/components/landing/Pricing';
import Faq from '@/components/landing/Faq';
import FinalCta from '@/components/landing/FinalCta';

// Marketing landing page (DESIGN.md §10). Auth-guarded app lives under /generate,
// /dashboard, /history — the CTAs here route into it.
export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ModelStrip />
        <UseCases />
        <Features />
        <PromptBuilder />
        <Gallery />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
