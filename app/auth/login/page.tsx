import Link from 'next/link';
import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';

const highlights = [
  {
    title: 'Smart automation',
    description: 'AI-powered expense categorization and policy compliance checks.',
    icon: Sparkles,
  },
  {
    title: 'Real-time tracking',
    description: 'Monitor spending patterns and budget utilization instantly.',
    icon: BarChart3,
  },
  {
    title: 'Secure & compliant',
    description: 'Bank-level security with audit trails and compliance reporting.',
    icon: ShieldCheck,
  },
];

const stats = [
  { value: '2 min', label: 'average expense submission' },
  { value: '85%', label: 'faster approval workflows' },
  { value: '99.9%', label: 'uptime guarantee' },
];

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950" />
        <div className="absolute -top-32 -left-40 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-3xl" />
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
                href="/auth/signup"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-slate-100 transition hover:border-white hover:text-white"
              >
                Sign up
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-16 pt-4 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div className="order-2 space-y-10 text-slate-100 lg:order-1">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
                  <Users className="h-3.5 w-3.5" />
                  Welcome back
                </span>
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                  Continue managing your expenses with confidence.
                </h1>
                <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
                  Access your expense dashboard, submit receipts, and track approvals. 
                  Your team's financial workflow continues seamlessly.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {highlights.map(({ title, description, icon: Icon }) => (
                  <div
                    key={title}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-blue-300/40 hover:bg-white/10"
                  >
                    <Icon className="h-6 w-6 text-blue-300 transition group-hover:text-blue-200" />
                    <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
                    <p className="mt-2 text-sm text-slate-300">{description}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                    Trusted by finance teams
                  </h3>
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
            </div>

            <div className="order-1 lg:order-2">
              <LoginForm appearance="dark" />
              <p className="mt-6 text-center text-xs text-slate-400">
                Need help?{' '}
                <Link href="/support" className="text-blue-200 underline-offset-4 hover:underline">
                  Contact Support
                </Link>{' '}
                or{' '}
                <Link href="/auth/forgot-password" className="text-blue-200 underline-offset-4 hover:underline">
                  Reset Password
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