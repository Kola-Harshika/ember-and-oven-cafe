import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AmbienceProvider } from '@/context/AmbienceContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Toaster } from '@/components/layout/Toaster';
import { HomePage } from '@/pages/HomePage';
import { MenuPage } from '@/pages/MenuPage';
import { ItemPage } from '@/pages/ItemPage';
import { TrayPage } from '@/pages/TrayPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrderPage } from '@/pages/OrderPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AdminPage } from '@/pages/AdminPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/** Every route change starts at the top of the page, like walking back to the counter. */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Auth wraps the order context: an order is scoped either to the signed-in
          customer or to the guest token kept on this device. */}
      <AuthProvider>
        <AmbienceProvider>
          <ToastProvider>
            <CartProvider>
              <OrderProvider>
                <ScrollToTop />
                <a className="skip-link" href="#main">
                  Skip to content
                </a>
                <SiteHeader />
                <main id="main" className="site-main">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/menu" element={<MenuPage />} />
                    <Route path="/menu/:itemId" element={<ItemPage />} />
                    <Route path="/tray" element={<TrayPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order/:orderId" element={<OrderPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </main>
                <SiteFooter />
                <Toaster />
              </OrderProvider>
            </CartProvider>
          </ToastProvider>
        </AmbienceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
