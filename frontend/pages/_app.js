import '../styles/globals.css';
import Link from 'next/link';

function MyApp({ Component, pageProps }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container py-4 flex items-center justify-between">
          <Link href="/home"><a className="font-bold text-xl">Fliktox</a></Link>
          <nav className="space-x-4">
            <Link href="/home"><a>Home</a></Link>
            <Link href="/login"><a>Login</a></Link>
            <Link href="/signup"><a>Sign Up</a></Link>
          </nav>
        </div>
      </header>
      <main className="container py-8">
        <Component {...pageProps} />
      </main>
    </div>
  );
}

export default MyApp;
