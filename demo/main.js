import jQuery from 'jquery';

window.jQuery = jQuery;
window.$ = jQuery;

const { default: StickyHeader } = await import('../src/index.js');

const controls = document.querySelector('#controls');
const offsetInput = document.querySelector('#offset');
const offsetValue = document.querySelector('#offset-value');
const offsetHelp = document.querySelector('#offset-help');
const vanillaStatus = document.querySelector('#vanilla-status');
const jqueryStatus = document.querySelector('#jquery-status');
const demoStage = document.querySelector('.demo-stage');

const roots = {
  vanilla: document.querySelector('[data-demo-root="vanilla"]'),
  jquery: document.querySelector('[data-demo-root="jquery"]'),
};

const headerTemplates = {
  vanilla: roots.vanilla.innerHTML,
  jquery: roots.jquery.innerHTML,
};

const statusTargets = {
  vanilla: vanillaStatus,
  jquery: jqueryStatus,
};

const currentInstances = {
  vanilla: null,
  jquery: null,
};

let applyFrame = 0;

const parseOptions = () => {
  const formData = new FormData(controls);
  const offset = Number(formData.get('offset') || 0);
  const addBodyClasses = formData.has('addBodyClasses');
  const insertObserverElementBefore = formData.has('insertObserverElementBefore');
  const simulateNativeOff = formData.has('simulateNativeOff');
  const expandedHeader = formData.has('expandedHeader');

  offsetValue.textContent = `${offset}px`;
  offsetHelp.textContent =
    offset === 0
      ? 'The header sticks as soon as it reaches the top edge.'
      : `The header sticks when it reaches ${offset}px below the top edge.`;

  return {
    offset,
    addBodyClasses,
    insertObserverElementBefore,
    simulateNativeOff,
    expandedHeader,
  };
};

const updateOffsetGuidePosition = () => {
  const rect = demoStage.getBoundingClientRect();
  document.documentElement.style.setProperty('--offset-guide-left', `${rect.left}px`);
  document.documentElement.style.setProperty(
    '--offset-guide-right',
    `${Math.max(window.innerWidth - rect.right, 0)}px`
  );
};

const wireStatus = (header, statusEl) => {
  header.addEventListener('stickyIsPinned', () => {
    statusEl.textContent = 'pinned';
  });

  header.addEventListener('stickyIsUnpinned', () => {
    statusEl.textContent = 'unpinned';
  });
};

const renderRoot = (rootName, expandedHeader) => {
  const root = roots[rootName];
  root.innerHTML = headerTemplates[rootName];
  const header = root.querySelector('.demo-header');
  header.classList.toggle('is-expanded', expandedHeader);
  return header;
};

const destroyCurrentInstances = () => {
  Object.values(currentInstances).forEach(instance => instance?.destroy?.());
  currentInstances.vanilla = null;
  currentInstances.jquery = null;
};

const applyDemo = () => {
  applyFrame = 0;
  const options = parseOptions();
  destroyCurrentInstances();
  document.documentElement.style.setProperty('--demo-offset', `${options.offset}px`);
  document.documentElement.classList.toggle(
    'no-csspositionsticky',
    options.simulateNativeOff
  );
  document.body.classList.remove('sticky-pinned', 'sticky-unpinned');

  const vanillaHeader = renderRoot('vanilla', options.expandedHeader);
  const jqueryHeader = renderRoot('jquery', options.expandedHeader);

  currentInstances.vanilla = new StickyHeader(vanillaHeader, {
    offset: options.offset,
    addBodyClasses: options.addBodyClasses,
    insertObserverElementBefore: options.insertObserverElementBefore,
  });

  window.jQuery(jqueryHeader).stickyHeader({
    offset: options.offset,
    addBodyClasses: options.addBodyClasses,
    insertObserverElementBefore: options.insertObserverElementBefore,
    pinnedClass: 'sticky-pinned',
    unpinnedClass: 'sticky-unpinned',
  });
  currentInstances.jquery = jqueryHeader.__stickyHeaderInstance ?? null;

  wireStatus(vanillaHeader, statusTargets.vanilla);
  wireStatus(jqueryHeader, statusTargets.jquery);
  statusTargets.vanilla.textContent = 'unpinned';
  statusTargets.jquery.textContent = 'unpinned';
  updateOffsetGuidePosition();
};

const scheduleApplyDemo = () => {
  if (applyFrame) cancelAnimationFrame(applyFrame);
  applyFrame = requestAnimationFrame(() => {
    applyDemo();
  });
};

offsetInput.addEventListener('input', () => {
  offsetValue.textContent = `${offsetInput.value}px`;
  scheduleApplyDemo();
});

controls.addEventListener('change', scheduleApplyDemo);
window.addEventListener('resize', updateOffsetGuidePosition);

applyDemo();
