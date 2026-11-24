import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, SessionWatcher } from './admin/auth';
import { AdminI18nOutlet } from './admin/i18n';
import { NotFound, PageView } from './public/PageView';
import { FullPageSpinner, PublicLayout } from './public/PublicLayout';

/** Admin screens are code-split so website visitors never download the editor. */
function lazyNamed<M extends Record<string, unknown>>(loader: () => Promise<M>, name: keyof M) {
  return lazy(() => loader().then((m) => ({ default: m[name] as ComponentType })));
}

const AdminLayout = lazyNamed(() => import('./admin/AdminLayout'), 'AdminLayout');
const LoginPage = lazyNamed(() => import('./admin/LoginPage'), 'LoginPage');
const DashboardPage = lazyNamed(() => import('./admin/DashboardPage'), 'DashboardPage');
const MenusPage = lazyNamed(() => import('./admin/MenusPage'), 'MenusPage');
const PageEditor = lazyNamed(() => import('./admin/PageEditor'), 'PageEditor');
const ApplicationsPage = lazyNamed(() => import('./admin/ApplicationsPage'), 'ApplicationsPage');
const SettingsPage = lazyNamed(() => import('./admin/SettingsPage'), 'SettingsPage');
const PublishPage = lazyNamed(() => import('./admin/PublishPage'), 'PublishPage');
const UsersPage = lazyNamed(() => import('./admin/UsersPage'), 'UsersPage');
const TranslationsPage = lazyNamed(() => import('./admin/TranslationsPage'), 'TranslationsPage');
const LanguagesPage = lazyNamed(() => import('./admin/LanguagesPage'), 'LanguagesPage');
const HelpPage = lazyNamed(() => import('./admin/HelpPage'), 'HelpPage');

export default function App() {
  return (
    <>
      <SessionWatcher />
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          {/* Admin (with the staff member's admin-panel language) */}
          <Route element={<AdminI18nOutlet />}>
            <Route path="/admin/login" element={<LoginPage />} />
            <Route
              path="/admin/preview"
              element={
                <RequireAuth>
                  <PublicLayout mode="preview" />
                </RequireAuth>
              }
            >
              <Route index element={<PageView />} />
              <Route path=":slug" element={<PageView />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="menus" element={<MenusPage />} />
              <Route path="menus/:id" element={<PageEditor />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="translations" element={<TranslationsPage />} />
              <Route path="languages" element={<LanguagesPage />} />
              <Route path="publish" element={<PublishPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>

          {/* Public website (published content only) */}
          <Route element={<PublicLayout mode="live" />}>
            <Route index element={<PageView />} />
            <Route path=":slug" element={<PageView />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
