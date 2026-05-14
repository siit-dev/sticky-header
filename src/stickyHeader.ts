/**!
 * stickyHeader - JS plugin to create sticky header
 * created by Bogdan Barbu
 * requires IntersectionObserver
 *
 * Author: Bogdan Barbu
 *
 * @format
 */

interface StickyHeaderOptions {
  pinnedClass?: string;
  unpinnedClass?: string;
  mainClass?: string;
  offset?: number;
  positionStickyWorkaround?: boolean;
  addBodyClasses?: boolean;
  insertObserverElementBefore?: boolean;
}

export default class StickyHeader {
  #pinnedClass: string = 'sticky-pinned';
  #unpinnedClass: string = 'sticky-unpinned';
  #mainClass: string = 'sticky';
  #offset: number = 0;
  #positionStickyWorkaround: boolean = true;
  #noNativeSupport: boolean = false;
  #element: HTMLElement | null = null;
  #observer: IntersectionObserver | null = null;
  #heightObserver: ResizeObserver | null = null;
  #addBodyClasses: boolean = true;
  #insertObserverElementBefore: boolean = false;
  #cachedElementHeight: number = 0;
  #intersectionItem: HTMLElement | null = null;
  #parentElement: HTMLElement | null = null;
  #parentInlinePosition: string = '';
  #shouldRestoreParentPosition: boolean = false;
  #windowListeners: Array<{
    type: 'resize' | 'orientationchange';
    handler: () => void;
  }> = [];
  #isPinned: boolean | null = null;
  #stickyTargets: HTMLElement[] = [];

  constructor(
    element: HTMLElement,
    {
      pinnedClass = 'sticky-pinned',
      unpinnedClass = 'sticky-unpinned',
      mainClass = 'sticky',
      offset = 0,
      positionStickyWorkaround = true,
      addBodyClasses = true,
      insertObserverElementBefore = false,
    }: StickyHeaderOptions = {}
  ) {
    this.#element = element;
    this.#pinnedClass = pinnedClass;
    this.#unpinnedClass = unpinnedClass;
    this.#mainClass = mainClass;
    this.#offset = offset;
    this.#positionStickyWorkaround = positionStickyWorkaround;
    this.#addBodyClasses = addBodyClasses;
    this.#insertObserverElementBefore = insertObserverElementBefore;

    // does this have native support (Modernizr test)
    this.#noNativeSupport =
      document.documentElement.classList.contains('no-csspositionsticky');

    // initialize
    this.#init();
  }

  #init() {
    const parent = this.#element.parentElement;
    if (!parent) return;

    this.#parentElement = parent;
    this.#parentInlinePosition = parent.style.position;
    const intersectionItem = document.createElement('div');
    const containerPosition = window
      .getComputedStyle(parent)
      .getPropertyValue('position');
    const stickyPosition = window
      .getComputedStyle(this.#element)
      .getPropertyValue('position');
    this.#cachedElementHeight = this.#element.clientHeight;

    this.#element.classList.add(this.#mainClass);
    // add position: relative if the class doesn't add it
    if (!containerPosition || containerPosition == 'static') {
      parent.style.position = 'relative';
      this.#shouldRestoreParentPosition = true;
    }
    // use the workaround if position is sticky or there's no offset set up
    if (!this.#offset || stickyPosition == 'sticky') {
      this.#positionStickyWorkaround = true;
    }
    let toObserve = intersectionItem;
    // add the intersetion observer item
    intersectionItem.classList.add('sticky-observer');
    intersectionItem.style.pointerEvents = 'none';
    intersectionItem.style.visibility = 'hidden';
    this.#intersectionItem = intersectionItem;
    if (!this.#positionStickyWorkaround) {
      // add the item to the top of the page
      intersectionItem.style.position = 'absolute';
      intersectionItem.style.top = '0';
      intersectionItem.style.left = '0';
      intersectionItem.style.right = '0';
      intersectionItem.style.height = this.#offset + 'px';
      parent.appendChild(intersectionItem);
    } else {
      // as a workaround for position: sticky issues, use an element right under the header
      intersectionItem.style.position = 'relative';
      intersectionItem.style.height = '1px';
      if (this.#offset) {
        // if we are using an offset, adjust the "intersection" object position
        intersectionItem.style.height = '0';
        const intersectionItemOffset = document.createElement('div');
        intersectionItemOffset.classList.add('sticky-observer-offset');
        intersectionItemOffset.style.position = 'absolute';
        intersectionItemOffset.style.height = '1px';
        intersectionItemOffset.style.left = '0';
        intersectionItemOffset.style.right = '0';
        if (this.#insertObserverElementBefore) {
          intersectionItemOffset.style.top = `${this.#offset}px`;
        } else {
          intersectionItemOffset.style.top = `${this.#offset - this.#cachedElementHeight}px`;
        }
        intersectionItem.appendChild(intersectionItemOffset);
        toObserve = intersectionItemOffset;

        // update the offset when the layout changes
        if (!this.#insertObserverElementBefore) {
          const updateOffset = () => {
            intersectionItemOffset.style.top = `${this.#offset - this.#cachedElementHeight}px`;
          };

          const syncCachedHeight = () => {
            if (!this.#element) return;
            const nextHeight = this.#element.clientHeight;
            if (!nextHeight) return;
            this.#cachedElementHeight = nextHeight;
            updateOffset();
          };

          if ('ResizeObserver' in window) {
            this.#heightObserver = new ResizeObserver(syncCachedHeight);
            this.#heightObserver.observe(this.#element);
          } else {
            (['resize', 'orientationchange'] as const).forEach(type => {
              const handler = () => syncCachedHeight();
              window.addEventListener(type, handler);
              this.#windowListeners.push({ type, handler });
            });
          }
        }
      }
      if (this.#insertObserverElementBefore) {
        parent.insertBefore(intersectionItem, this.#element);
      } else {
        parent.insertBefore(intersectionItem, this.#element.nextElementSibling);
      }
    }

    // pre-compute elements to update on sticky state changes
    this.#stickyTargets = [
      this.#element,
      ...(this.#addBodyClasses ? [document.body] : []),
    ];

    // create the observer
    this.#observer = new IntersectionObserver(this.#setSticky);
    this.#observer.observe(toObserve);
  }

  destroy() {
    this.#observer?.disconnect();
    this.#observer = null;

    this.#heightObserver?.disconnect();
    this.#heightObserver = null;

    this.#windowListeners.forEach(({ type, handler }) => {
      window.removeEventListener(type, handler);
    });
    this.#windowListeners = [];

    this.#intersectionItem?.remove();
    this.#intersectionItem = null;

    this.#element?.classList.remove(
      this.#mainClass,
      this.#pinnedClass,
      this.#unpinnedClass
    );

    if (this.#addBodyClasses) {
      document.body.classList.remove(this.#pinnedClass, this.#unpinnedClass);
      if (this.#noNativeSupport) {
        document.body.style.paddingTop = '0';
      }
    }

    if (this.#shouldRestoreParentPosition && this.#parentElement) {
      this.#parentElement.style.position = this.#parentInlinePosition;
    }

    this.#element = null;
  }

  // handle intersection observer events
  #setSticky = (entries: IntersectionObserverEntry[]) => {
    const entry = entries[0];
    if (!entry || !this.#element) return;
    const pinned = !entry.isIntersecting;
    if (pinned === this.#isPinned) return;
    this.#isPinned = pinned;

    if (pinned) {
      this.#stickyTargets.forEach(el => {
        el.classList.remove(this.#unpinnedClass);
        el.classList.add(this.#pinnedClass);
      });
      if (this.#noNativeSupport && this.#addBodyClasses) {
        document.body.style.paddingTop = `${this.#cachedElementHeight}px`;
      }
      // dispatch an event to tell that we're pinned
      this.#element.dispatchEvent(new CustomEvent('stickyIsPinned', { bubbles: true }));
    } else {
      this.#stickyTargets.forEach(el => {
        el.classList.add(this.#unpinnedClass);
        el.classList.remove(this.#pinnedClass);
      });
      if (this.#noNativeSupport && this.#addBodyClasses) {
        document.body.style.paddingTop = '0px';
      }
      // dispatch an event to tell that we're unpinned
      this.#element.dispatchEvent(new CustomEvent('stickyIsUnpinned', { bubbles: true }));
    }
  };
}

if (typeof window !== 'undefined') {
  (window as any).StickyHeader = StickyHeader;

  // register jQuery plugin if jQuery is available
  if ('jQuery' in window) {
    (window as any).jQuery.fn.stickyHeader = function (options) {
      this.each((_i, element) => {
        (element as any).__stickyHeaderInstance?.destroy?.();
        (element as any).__stickyHeaderInstance = new StickyHeader(element, options);
      });
      return this;
    };
  }
}
