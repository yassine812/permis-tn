/* eslint-env browser */
import { useEffect } from 'react';
export function ThemeDocument({ mode, background }) {
  useEffect(() => {
    document.documentElement.style.colorScheme = mode;
    document.documentElement.style.backgroundColor = background;
    document.body.style.backgroundColor = background;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', background);
  }, [mode, background]);
  return null;
}
