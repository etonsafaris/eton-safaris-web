'use client';

import { Component, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { SITE_LOGO, SITE } from '@/lib/collections';

type Props = { children: ReactNode };
type State = { hasError: boolean };

class PublicErrorBoundaryInner extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Public] Client render error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 py-20 text-center">
        <div>
          <img src={SITE_LOGO} alt={SITE.name} className="mx-auto mb-6 h-16 w-auto object-contain" />
          <h1 className="font-serif text-3xl font-bold text-gray-900">This page could not be loaded</h1>
          <p className="mt-3 text-gray-600">Please try again. Your data has not been changed.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="rounded-lg bg-[#00A651] px-5 py-2.5 font-semibold text-white"
            >
              Try again
            </button>
            <Link href="/" className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700">
              Go home
            </Link>
          </div>
        </div>
      </main>
    );
  }
}

export default function PublicErrorBoundary({ children }: Props) {
  const pathname = usePathname() || '/';
  return <PublicErrorBoundaryInner key={pathname}>{children}</PublicErrorBoundaryInner>;
}
