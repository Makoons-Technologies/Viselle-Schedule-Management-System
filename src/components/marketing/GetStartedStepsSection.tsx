import { Link } from 'react-router-dom';
import { GET_STARTED_STEPS, trialStartPath } from '@/content/marketing-landing';
import { Button } from '@/components/ui/button';

export function GetStartedStepsSection() {
  return (
    <section
      id="get-started-steps"
      aria-labelledby="get-started-steps-heading"
      className="border-y border-white/10 bg-white/5 py-16 backdrop-blur-[2px] sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-[#fdeb83]">3 steps</p>
          <h2 id="get-started-steps-heading" className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Live booking page today
          </h2>
          <p className="mt-3 text-white/70">
            This is the real get-started path — not a shorter product. The wizard collects your salon,
            account, and plan; the dashboard checklist is what turns the page on.
          </p>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {GET_STARTED_STEPS.map((step) => (
            <li
              key={step.n}
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-6 backdrop-blur-sm"
            >
              <p className="text-sm font-semibold text-[#fdeb83]">Step {step.n}</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link to={trialStartPath}>Start free trial</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
