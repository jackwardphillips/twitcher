import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

(import.meta.env as Record<string, string>).VITE_MAPTILER_STYLE_URL = 'https://example.test/style.json?key={key}';
(import.meta.env as Record<string, string>).VITE_MAPTILER_API_KEY = 'test-key';

vi.mock('maplibre-gl', () => {
  class MockMap {
    container: HTMLElement;

    constructor(options: { container: HTMLElement }) {
      this.container = options.container;
      this.container.classList.add('maplibregl-map');
    }

    addControl() {
      return this;
    }

    once(_event: string, callback: () => void) {
      callback();
      return this;
    }

    getSource() {
      return undefined;
    }

    setTerrain() {
      return this;
    }

    remove() {
      this.container.replaceChildren();
    }
  }

  class MockMarker {
    element: HTMLElement;

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
      this.element.setAttribute('data-testid', 'marker');
    }

    setLngLat(position: [number, number]) {
      this.element.setAttribute('data-position', JSON.stringify([position[1], position[0]]));
      return this;
    }

    setPopup() {
      return this;
    }

    addTo(map: MockMap) {
      map.container.appendChild(this.element);
      return this;
    }

    remove() {
      this.element.remove();
    }
  }

  class MockPopup {
    setHTML() {
      return this;
    }
  }

  class MockNavigationControl {}

  return {
    default: {
      Map: MockMap,
      Marker: MockMarker,
      Popup: MockPopup,
      NavigationControl: MockNavigationControl,
    },
    Map: MockMap,
    Marker: MockMarker,
    Popup: MockPopup,
    NavigationControl: MockNavigationControl,
  };
});
