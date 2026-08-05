const MAP_GESTURE_SELECTOR = '.map-view-shell';

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
