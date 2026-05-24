import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { DashboardLayout } from '@/layouts/dashboard-layout';

// Lazy-loaded pages
const LandingPage = lazy(() => import('@/pages/landing'));
const LoginPage = lazy(() => import('@/pages/login'));
const RegisterPage = lazy(() => import('@/pages/register'));
const DashboardPage = lazy(() => import('@/pages/dashboard/index'));
const ChatPage = lazy(() => import('@/pages/dashboard/chat'));
const DocumentsPage = lazy(() => import('@/pages/dashboard/documents'));
const SettingsPage = lazy(() => import('@/pages/dashboard/settings'));
const ToolPage = lazy(() => import('@/pages/dashboard/tools'));
const ToolPreviewPage = lazy(() => import('@/pages/dashboard/tool-preview'));
const HelpPage = lazy(() => import('@/pages/dashboard/help'));

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="relative h-12 w-12 mx-auto">
          <div className="absolute inset-0 rounded-full gradient-bg opacity-30 animate-ping" />
          <div className="relative flex items-center justify-center h-12 w-12 rounded-full gradient-bg">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="white" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Memuat...</p>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/register',
    element: (
      <Suspense fallback={<PageLoader />}>
        <RegisterPage />
      </Suspense>
    ),
  },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'chat',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChatPage />
          </Suspense>
        ),
      },
      {
        path: 'documents',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DocumentsPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'tools/:toolId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ToolPage />
          </Suspense>
        ),
      },
      {
        path: 'tools/:toolId/preview',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ToolPreviewPage />
          </Suspense>
        ),
      },
      {
        path: 'help',
        element: (
          <Suspense fallback={<PageLoader />}>
            <HelpPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
