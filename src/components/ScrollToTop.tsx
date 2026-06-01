import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const initialPathname = useRef(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // If the path changes from the original load path, trigger a fresh page reload
    if (pathname !== initialPathname.current) {
      window.location.reload();
    }
  }, [pathname]);

  return null;
}
