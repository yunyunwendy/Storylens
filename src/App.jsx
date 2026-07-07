import { useEffect, useState } from "react";
import LandingPage from "./pages/LandingPage.jsx";
import SecondPage from "./pages/SecondPage.jsx";
import UpgradePage from "./pages/UpgradePage.jsx";
import WorkspacePage from "./pages/WorkspacePage.jsx";

const ROUTES = {
  HOME: "/",
  SECOND: "/second",
  PANEL: "/panel",
  PAGE4: "/page4",
};

function normalizeRoute(pathname) {
  if (pathname === ROUTES.SECOND) {
    return ROUTES.SECOND;
  }

  if (pathname === ROUTES.PANEL || pathname === "/workspace") {
    return ROUTES.PANEL;
  }

  if (pathname === ROUTES.PAGE4 || pathname === "/upgrade") {
    return ROUTES.PAGE4;
  }

  return ROUTES.HOME;
}

export default function App() {
  const [route, setRoute] = useState(() => normalizeRoute(window.location.pathname));

  useEffect(() => {
    function handlePopState() {
      setRoute(normalizeRoute(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextRoute) {
    const normalizedRoute = normalizeRoute(nextRoute);
    window.history.pushState(null, "", normalizedRoute);
    window.scrollTo(0, 0);
    setRoute(normalizedRoute);
  }

  if (route === ROUTES.SECOND) {
    return <SecondPage onNavigate={navigate} />;
  }

  if (route === ROUTES.PANEL) {
    return <WorkspacePage onNavigate={navigate} />;
  }

  if (route === ROUTES.PAGE4) {
    return <UpgradePage onNavigate={navigate} />;
  }

  return <LandingPage onNavigate={navigate} />;
}
