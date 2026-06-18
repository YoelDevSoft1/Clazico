import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { termsContent } from '@/lib/legal-content';

export const metadata: Metadata = {
  title: 'Términos de Uso',
  description:
    'Términos de uso de Clazico Store para pedidos, pagos, entregas, cambios, garantías y reembolsos en Venezuela.',
};

export default function TermsOfUsePage() {
  return <LegalPage content={termsContent} />;
}

