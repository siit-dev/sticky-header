import { beforeEach, describe, expect, test, vi } from 'vitest';

const intersectionObservers = [];
const resizeObservers = [];

class IntersectionObserverMock {
  constructor(callback) {
    this.callback = callback;
    this.target = null;
    this.disconnect = vi.fn();
    intersectionObservers.push(this);
  }

  observe(target) {
    this.target = target;
  }
}

class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback;
    this.target = null;
    this.disconnect = vi.fn();
    resizeObservers.push(this);
  }

  observe(target) {
    this.target = target;
  }
}

const loadStickyHeader = async () => {
  vi.resetModules();
  return (await import('../../src/stickyHeader.ts')).default;
};

const loadIndex = async () => {
  vi.resetModules();
  return await import('../../src/index.js');
};

const setupDom = ({
  headerPosition = 'sticky',
  height = 72,
  rootId = 'root',
  withSibling = true,
} = {}) => {
  document.body.innerHTML = `
    <div id="${rootId}">
      <header class="page-header" style="position: ${headerPosition}; top: 0;">Header</header>
      ${withSibling ? '<div class="content">Content</div>' : ''}
    </div>
  `;

  const parent = document.querySelector(`#${rootId}`);
  const header = parent.querySelector('header');
  let currentHeight = height;

  Object.defineProperty(header, 'clientHeight', {
    configurable: true,
    get: () => currentHeight,
  });

  return {
    parent,
    header,
    setHeight: nextHeight => {
      currentHeight = nextHeight;
    },
  };
};

const emitIntersection = isIntersecting => {
  const observer = intersectionObservers.at(-1);
  observer.callback([
    {
      isIntersecting,
      target: observer.target,
    },
  ]);
};

const emitResize = height => {
  const observer = resizeObservers.at(-1);
  observer.callback([
    {
      contentRect: {
        height,
      },
    },
  ]);
};

beforeEach(() => {
  intersectionObservers.length = 0;
  resizeObservers.length = 0;
  document.documentElement.className = '';
  document.body.className = '';
  document.body.style.paddingTop = '';

  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: IntersectionObserverMock,
  });

  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: ResizeObserverMock,
  });

  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: callback => {
      callback();
      return 1;
    },
  });

  delete window.jQuery;
  delete window.$;
});

describe('StickyHeader', () => {
  test('adds the main class and observer marker on init', async () => {
    const StickyHeader = await loadStickyHeader();
    const { parent, header } = setupDom();

    new StickyHeader(header);

    expect(header.classList.contains('sticky')).toBe(true);
    expect(parent.style.position).toBe('relative');
    expect(parent.querySelector('.sticky-observer')).not.toBeNull();
    expect(intersectionObservers).toHaveLength(1);
  });

  test('pins and unpins the element and body classes', async () => {
    const StickyHeader = await loadStickyHeader();
    const { header } = setupDom();

    new StickyHeader(header);

    emitIntersection(false);
    expect(header.classList.contains('sticky-pinned')).toBe(true);
    expect(document.body.classList.contains('sticky-pinned')).toBe(true);

    emitIntersection(true);
    expect(header.classList.contains('sticky-unpinned')).toBe(true);
    expect(document.body.classList.contains('sticky-unpinned')).toBe(true);
  });

  test('skips body class changes when addBodyClasses is disabled', async () => {
    const StickyHeader = await loadStickyHeader();
    const { header } = setupDom();

    new StickyHeader(header, { addBodyClasses: false });
    emitIntersection(false);

    expect(header.classList.contains('sticky-pinned')).toBe(true);
    expect(document.body.className).toBe('');
  });

  test('honors custom class names', async () => {
    const StickyHeader = await loadStickyHeader();
    const { header } = setupDom();

    new StickyHeader(header, {
      mainClass: 'is-sticky',
      pinnedClass: 'is-pinned',
      unpinnedClass: 'is-unpinned',
    });

    emitIntersection(false);
    expect(header.classList.contains('is-sticky')).toBe(true);
    expect(header.classList.contains('is-pinned')).toBe(true);
  });

  test('computes offset observer placement after the header by default', async () => {
    const StickyHeader = await loadStickyHeader();
    const { parent, header } = setupDom({ height: 72 });

    new StickyHeader(header, { offset: 24 });

    const offsetMarker = parent.querySelector('.sticky-observer-offset');
    expect(offsetMarker.style.top).toBe('-48px');
  });

  test('computes offset observer placement before the header when requested', async () => {
    const StickyHeader = await loadStickyHeader();
    const { parent, header } = setupDom({ height: 72 });

    new StickyHeader(header, {
      offset: 24,
      insertObserverElementBefore: true,
    });

    const observer = parent.querySelector('.sticky-observer');
    const offsetMarker = parent.querySelector('.sticky-observer-offset');
    expect(parent.firstElementChild).toBe(observer);
    expect(offsetMarker.style.top).toBe('24px');
  });

  test('updates the offset when ResizeObserver reports a new height', async () => {
    const StickyHeader = await loadStickyHeader();
    const { parent, header, setHeight } = setupDom({ height: 72 });

    new StickyHeader(header, { offset: 24 });
    setHeight(104);
    emitResize(104);

    const offsetMarker = parent.querySelector('.sticky-observer-offset');
    expect(offsetMarker.style.top).toBe('-80px');
  });

  test('emits sticky lifecycle events', async () => {
    const StickyHeader = await loadStickyHeader();
    const { header } = setupDom();
    const pinned = vi.fn();
    const unpinned = vi.fn();

    header.addEventListener('stickyIsPinned', pinned);
    header.addEventListener('stickyIsUnpinned', unpinned);

    new StickyHeader(header);

    emitIntersection(false);
    emitIntersection(true);

    expect(pinned).toHaveBeenCalledTimes(1);
    expect(unpinned).toHaveBeenCalledTimes(1);
  });

  test('applies body padding when native sticky support is unavailable', async () => {
    const StickyHeader = await loadStickyHeader();
    document.documentElement.classList.add('no-csspositionsticky');
    const { header } = setupDom({ height: 88 });

    new StickyHeader(header);

    emitIntersection(false);
    expect(document.body.style.paddingTop).toBe('88px');

    emitIntersection(true);
    expect(document.body.style.paddingTop).toBe('0px');
  });

  test('registers the jQuery bridge when jQuery is already on window', async () => {
    const { header } = setupDom();
    const { default: jQuery } = await import('jquery');

    window.jQuery = jQuery;
    window.$ = jQuery;
    await loadIndex();

    expect(typeof window.jQuery.fn.stickyHeader).toBe('function');

    window.jQuery(header).stickyHeader({
      addBodyClasses: false,
    });

    emitIntersection(false);
    expect(header.classList.contains('sticky-pinned')).toBe(true);
  });

  test('destroy removes observers, classes, and helper elements', async () => {
    const StickyHeader = await loadStickyHeader();
    const { parent, header } = setupDom();

    const stickyHeader = new StickyHeader(header, { offset: 24 });
    emitIntersection(false);

    stickyHeader.destroy();

    expect(intersectionObservers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(resizeObservers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(parent.querySelector('.sticky-observer')).toBeNull();
    expect(header.classList.contains('sticky')).toBe(false);
    expect(document.body.classList.contains('sticky-pinned')).toBe(false);
  });
});
