import { useLayoutEffect } from "react";
import { useLocation } from "react-router";

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    const scrollToPageTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const frameId = window.requestAnimationFrame(scrollToPageTop);
    const timeoutId = window.setTimeout(scrollToPageTop, 0);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [pathname, search]);

  return null;
}