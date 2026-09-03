/** FAQ copy only — no path aliases, so Vite config / JSON-LD inject can import it. */
export interface MarketingFaqItem {
  question: string;
  answer: string;
}

export const MARKETING_FAQ: MarketingFaqItem[] = [
  {
    question: 'How much does Viselle cost?',
    answer:
      'Starter is $20/month, Professional is $49/month, and Business is $99/month. Every plan includes scheduling and a free online booking page. Starter is owner-only; Professional includes up to 10 staff; Business has unlimited staff accounts.',
  },
  {
    question: 'Does Viselle have a free trial?',
    answer:
      'Yes. The public trial is 14 days. On the live homepage offer, signup does not require a credit card — your account is created immediately, then you can add a service, set hours, and turn on booking.',
  },
  {
    question: 'Do I get a booking page with Viselle?',
    answer:
      'Yes. Every plan includes a public page at viselle.net/book/your-business. After signup, add a service, set hours, and turn the page on from your dashboard. Hosted subdomains and custom sites are optional and priced separately.',
  },
  {
    question: 'Does Viselle send text (SMS) reminders?',
    answer:
      'Email reminders are on every plan and send today. Text reminders are a Professional and Business feature. Outbound texts on viselle.net are paused until the phone number finishes carrier (A2P) review — this is not a marketing or campaign text product.',
  },
  {
    question: 'Who is Viselle for?',
    answer:
      'Viselle is for salons, spas, nail studios, barbershops, and similar beauty and wellness shops that take appointments. It is scheduling software with an online booking page — not a general POS and not a blast-SMS tool.',
  },
];

export function marketingFaqEntities(items: MarketingFaqItem[] = MARKETING_FAQ) {
  return items.map((item) => ({
    '@type': 'Question' as const,
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer' as const,
      text: item.answer,
    },
  }));
}
