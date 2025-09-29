import { BrowserRouter, useLocation } from "react-router-dom";
import { Header } from "./components/header";
import { AppRouter } from "./components/AppRouter";
import { TestModeBanner } from "./components/TestModeBanner";

function AppContent() {
  const location = useLocation();
  const hideHeaderOnPaths = ['/create'];
  const hideBannerOnPaths = ['/create'];
  const shouldHideHeader = hideHeaderOnPaths.includes(location.pathname);
  const shouldHideBanner = hideBannerOnPaths.includes(location.pathname);

  return (
    <>
      {!shouldHideHeader && <Header />}
      <AppRouter />
      {!shouldHideBanner && <TestModeBanner />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
