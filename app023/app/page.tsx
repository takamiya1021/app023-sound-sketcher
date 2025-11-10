import Header from '@/app/components/Header';
import KeyboardGuide from '@/app/components/KeyboardGuide';
import Timeline from '@/app/components/Timeline';
import ControlPanel from '@/app/components/ControlPanel';
import BpmControl from '@/app/components/BpmControl';
import SoundSelector from '@/app/components/SoundSelector';
import ExportDialog from '@/app/components/ExportDialog';
import ImportDialog from '@/app/components/ImportDialog';
import AIBeatSuggestion from '@/app/components/AIBeatSuggestion';
import StoreHydrator from '@/app/components/StoreHydrator';
import ServiceWorkerRegister from '@/app/components/ServiceWorkerRegister';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-zinc-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <StoreHydrator />
        <ServiceWorkerRegister />
        <Header />

        <ControlPanel />

        <Timeline />
        <KeyboardGuide />

        <section className="grid gap-6 md:grid-cols-2">
          <BpmControl />
          <SoundSelector />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <ExportDialog />
          <ImportDialog />
        </section>
        <AIBeatSuggestion />
      </main>
    </div>
  );
}
