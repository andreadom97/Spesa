import { redirect } from 'next/navigation';

/** La root non ha contenuto suo: l'app comincia da Oggi (come il manifest PWA). */
export default function Home() {
  redirect('/oggi');
}
