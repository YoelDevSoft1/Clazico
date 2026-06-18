import { permanentRedirect } from 'next/navigation';

export default function LegacyPrivacyPage() {
  permanentRedirect('/politicas-de-privacidad');
}
