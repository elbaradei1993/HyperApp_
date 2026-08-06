const MAP_GESTURE_SELECTOR = '.map-view-shell';
const LOCKED_VIEWPORT =
  'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

export const ensureAppViewportLocked = (): void => {
  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');

  if (viewport) {
    viewport.content = LOCKED_VIEWPORT;
    return;
  }

  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = LOCKED_VIEWPORT;
  document.head.append(meta);
};

export const isMapGestureTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && Boolean(target.closest(MAP_GESTURE_SELECTOR));

export const shouldPreventPinchZoom = (
  target: EventTarget | null,
  touchCount: number,
): boolean => touchCount > 1 && !isMapGestureTarget(target);

/**
 * Prevents accidental browser-page zoom while leaving map gestures to Leaflet.
 * Safari emits proprietary gesture events; other browsers use touch/wheel events.
 */
export const installAppZoomGesturePolicy = (): (() => void) => {
  ensureAppViewportLocked();

  const preventSafariGesture = (event: Event) => {
    if (!isMapGestureTarget(event.target)) {
      event.preventDefault();
    }
  };

  const preventMultiTouchZoom = (event: TouchEvent) => {
    if (shouldPreventPinchZoom(event.target, event.touches.length)) {
      event.preventDefault();
    }
  };

  const preventTrackpadPageZoom = (event: WheelEvent) => {
    if (event.ctrlKey && !isMapGestureTarget(event.target)) {
      event.preventDefault();
    }
  };

  const listenerOptions: AddEventListenerOptions = { passive: false };

  document.addEventListener('gesturestart', preventSafariGesture, listenerOptions);
  document.addEventListener('gesturechange', preventSafariGesture, listenerOptions);
  document.addEventListener('touchmove', preventMultiTouchZoom, listenerOptions);
  document.addEventListener('wheel', preventTrackpadPageZoom, listenerOptions);

  return () => {
    document.removeEventListener('gesturestart', preventSafariGesture, listenerOptions);
    document.removeEventListener('gesturechange', preventSafariGesture, listenerOptions);
    document.removeEventListener('touchmove', preventMultiTouchZoom, listenerOptions);
    document.removeEventListener('wheel', preventTrackpadPageZoom, listenerOptions);
  };
};
