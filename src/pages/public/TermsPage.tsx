import { marketingSeo } from '@/content/marketing-seo';
import termsMarkdown from '@/content/terms.md?raw';
import { LegalDocumentPage } from '@/pages/public/LegalDocumentPage';

export function TermsPage() {
  return (
    <LegalDocumentPage seo={marketingSeo.terms} crumb="Terms & Conditions" markdown={termsMarkdown} />
  );
}
