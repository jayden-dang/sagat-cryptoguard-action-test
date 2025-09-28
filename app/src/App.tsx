import { BrowserRouter } from "react-router-dom";
import { Header } from "./components/header";
import { AppRouter } from "./components/AppRouter";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <div className="container mx-auto p-4">
        <AppRouter />
      </div>
    </BrowserRouter>
  );
}

export default App;
