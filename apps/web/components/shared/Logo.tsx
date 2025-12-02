import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2">
      <span className="text-2xl font-bold text-white">Ω</span>
      <span className="text-xl font-light text-white">Omega AI</span>
    </Link>
  );
}
