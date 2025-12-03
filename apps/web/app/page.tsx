import OmegaWireframe from '@/components/OmegaWireframe';

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Omega Wireframe Background */}
      <OmegaWireframe />

      {/* Centered Title */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-8xl font-thin text-white tracking-widest opacity-90">
            Ω
          </h1>
          <p className="mt-6 text-2xl font-light text-zinc-300 tracking-wide opacity-80">
            Omega AI
          </p>
        </div>
      </div>
    </div>
  );
}
