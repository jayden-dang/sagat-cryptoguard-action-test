import { BrowserRouter, useLocation } from "react-router-dom";
import { Header } from "./components/header";
import { AppRouter } from "./components/AppRouter";

function AppContent() {
  const location = useLocation();
  const hideHeaderOnPaths = ['/create'];
  const shouldHideHeader = hideHeaderOnPaths.includes(location.pathname);

  return (
    <>
      {!shouldHideHeader && <Header />}
      <AppRouter />
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
