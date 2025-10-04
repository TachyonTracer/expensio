import Link from 'next/link';

import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Users } from 'lucide-react';

import { SignupForm } from '@/components/auth/signup-form';

const highlights = [
  {
    title: 'Automated approvals',
    description: 'Design multi-level workflows that adapt to policy changes automatically.',
    icon: Sparkles,
  },
  {
    title: 'Real-time insights',
    description: 'Spot trends instantly with AI-powered analytics tuned for finance teams.',
    icon: BarChart3,
  },
  {
    title: 'Enterprise-grade security',
    description: 'SOC 2-ready architecture, SSO, and granular role controls keep data safe.',
    icon: ShieldCheck,
  },
];

const stats = [
  { value: '14 days', label: 'free trial, no card required' },
  { value: '7 min', label: 'avg. time to first approval' },
  { value: '62%', label: 'fewer manual reviews reported' },
];

const steps = [
  {
    title: 'Create your workspace',
    description: 'Set your company context and expense categories in minutes.',
  },
  {
    title: 'Invite your team',
    description: 'Add employees and approvers, or sync from your HRIS.',
  },
  {
    title: 'Automate your flow',
    description: 'Publish rules, schedule reports, and stay audit-ready from day one.',
  },
];

export default function SignupPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950" />
        <div className="absolute -top-32 -left-40 h-96 w-96 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 py-6 sm:px-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link href="/" className="text-lg font-semibold text-white">
              Expensio
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link href="/features" className="hidden text-slate-300 transition hover:text-white md:inline">
                Features
              </Link>
              <Link href="/pricing" className="hidden text-slate-300 transition hover:text-white md:inline">
                Pricing
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-slate-100 transition hover:border-white hover:text-white"
              >
                Sign in
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-16 pt-4 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div className="order-2 space-y-10 text-slate-100 lg:order-1">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                  <Users className="h-3.5 w-3.5" />
                  Free 14-day pilot
                </span>
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                  Automate spending, approvals, and audits in one modern workspace.
                </h1>
                <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
                  Expensio helps finance and operations teams close the books faster with intelligent receipt capture,
                  policy-aware approvals, and real-time analytics that keep everyone on budget.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {highlights.map(({ title, description, icon: Icon }) => (
                  <div
                    key={title}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-300/40 hover:bg-white/10"
                  >
                    <Icon className="h-6 w-6 text-emerald-300 transition group-hover:text-emerald-200" />
                    <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
                    <p className="mt-2 text-sm text-slate-300">{description}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                    Launch in three simple steps
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {steps.map((step, idx) => (
                      <div key={step.title} className="rounded-xl bg-slate-900/70 p-4">
                        <span className="text-xs font-semibold uppercase text-slate-400">Step {idx + 1}</span>
                        <p className="mt-2 text-sm font-medium text-white">{step.title}</p>
                        <p className="mt-2 text-xs text-slate-400">{step.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 text-left text-sm text-slate-300">
                  {stats.map(({ value, label }) => (
                    <div key={value} className="min-w-[120px]">
                      <p className="text-2xl font-semibold text-white">{value}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <SignupForm appearance="dark" />
              <p className="mt-6 text-center text-xs text-slate-400">
                By creating an account you agree to our{' '}
                <Link href="/terms" className="text-emerald-200 underline-offset-4 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-emerald-200 underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}