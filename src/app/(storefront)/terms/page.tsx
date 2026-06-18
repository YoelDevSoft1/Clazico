import { permanentRedirect } from 'next/navigation';

export default function LegacyTermsPage() {
  permanentRedirect('/terminos-de-uso');
}
