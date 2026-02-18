'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const OmegaWireframe = dynamic(() => import('@/components/OmegaWireframe'), {
  ssr: false,
});

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Delay content reveal to let the wireframe emerge first
    const timer = setTimeout(() => setShowContent(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#020309]">
      {/* Interactive Three.js wireframe background */}
      {mounted && <OmegaWireframe />}

      {/* Scanline overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
        }}
      />

      {/* Grid overlay — subtle engineering paper feel */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,170,102,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,170,102,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content overlay */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        {/* Top telemetry bar */}
        <div
          className={`absolute top-20 left-0 right-0 flex justify-between px-8 md:px-16 font-mono text-[10px] tracking-[0.3em] uppercase transition-all duration-[2000ms] ${
            showContent ? 'opacity-30 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
          style={{ color: '#ffaa66' }}
        >
          <span>sys.neural.mesh</span>
          <span>nodes: 1000 | topology: k-nn</span>
        </div>

        {/* Central content block */}
        <div className="flex flex-col items-center gap-6">
          {/* Title with Omega */}
          <div
            className={`flex flex-col items-center transition-all duration-[3000ms] ease-out ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h1
              className="text-white font-extralight tracking-[0.5em] text-sm md:text-base uppercase mb-3"
              style={{
                textShadow: '0 0 40px rgba(255,170,102,0.15)',
              }}
            >
              Omega
            </h1>
            <div
              className="w-16 h-px mb-6"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,170,102,0.4), transparent)',
              }}
            />
            <p
              className="text-zinc-500 font-light text-xs md:text-sm tracking-[0.2em] uppercase max-w-md text-center leading-relaxed"
            >
              Emergent intelligence on Discord
            </p>
          </div>

          {/* Action links */}
          <div
            className={`flex gap-8 mt-8 pointer-events-auto transition-all duration-[3000ms] delay-500 ease-out ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Link
              href="/playground"
              className="group relative font-mono text-[11px] tracking-[0.25em] uppercase text-zinc-400 hover:text-white transition-colors duration-500"
            >
              <span className="relative z-10">Playground</span>
              <span
                className="absolute bottom-0 left-0 w-0 h-px group-hover:w-full transition-all duration-500"
                style={{ background: 'rgba(255,170,102,0.5)' }}
              />
            </Link>
            <Link
              href="/messages"
              className="group relative font-mono text-[11px] tracking-[0.25em] uppercase text-zinc-400 hover:text-white transition-colors duration-500"
            >
              <span className="relative z-10">Messages</span>
              <span
                className="absolute bottom-0 left-0 w-0 h-px group-hover:w-full transition-all duration-500"
                style={{ background: 'rgba(255,170,102,0.5)' }}
              />
            </Link>
            <Link
              href="/blog"
              className="group relative font-mono text-[11px] tracking-[0.25em] uppercase text-zinc-400 hover:text-white transition-colors duration-500"
            >
              <span className="relative z-10">Blog</span>
              <span
                className="absolute bottom-0 left-0 w-0 h-px group-hover:w-full transition-all duration-500"
                style={{ background: 'rgba(255,170,102,0.5)' }}
              />
            </Link>
          </div>
        </div>

        {/* Bottom telemetry */}
        <div
          className={`absolute bottom-8 left-0 right-0 flex justify-between px-8 md:px-16 font-mono text-[10px] tracking-[0.3em] uppercase transition-all duration-[2000ms] delay-700 ${
            showContent ? 'opacity-20 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ color: '#ffaa66' }}
        >
          <span>verlet integration</span>
          <span className="hidden md:inline">move cursor to interact</span>
          <span>additive blending</span>
        </div>
      </div>
    </div>
  );
}
