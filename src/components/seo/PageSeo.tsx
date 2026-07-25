import { useEffect } from 'react';
import { applyPageSeo, type PageSeoInput, removeHeadNode } from '@/lib/seo';

/**
 * Client-side document head for marketing and auth public routes.
 * Google and major crawlers that execute JS pick these up; static defaults also live in index.html.
 */
export function PageSeo({
  title,
  description,
  path,
  robots,
  ogType,
  image,
  jsonLd,
  jsonLdId = 'page-jsonld',
}: PageSeoInput) {
  useEffect(() => {
    const previousTitle = document.title;
    applyPageSeo({
      title,
      description,
      path,
      robots,
      ogType,
      image,
      jsonLd,
      jsonLdId,
    });

    return () => {
      document.title = previousTitle;
      removeHeadNode(jsonLdId);
    };
    // jsonLd is typically a stable module export; stringify avoids identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional JSON compare
  }, [title, description, path, robots, ogType, image, jsonLdId, JSON.stringify(jsonLd)]);

  return null;
}
