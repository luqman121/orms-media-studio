import { redirect } from 'next/navigation';

// Root → generator. The dashboard layout guards auth and bounces to /auth if needed.
export default function Home() {
  redirect('/generate');
}
