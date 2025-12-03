import OmegaWireframe from '@/components/OmegaWireframe';

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Omega Wireframe Background */}
      <OmegaWireframe />

      {/* Centered Omega Symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <h1 className="text-9xl font-thin text-white tracking-widest opacity-90">
          Ω
        </h1>
      </div>
    </div>
  );
}
