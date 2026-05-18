document.addEventListener('DOMContentLoaded', () => {
  const ALL_DOMAINS = '__all__';
  const ALL_STORAGE_TYPES = 'all';
  const MAX_RENDERED_COOKIES = 500;
  const MAX_RENDERED_STORAGE_ITEMS = 500;
  const STORAGE_EXPORT_FORMAT = 'cookie-storage-toolkit-storage';
  const MIGRATE_EXPORT_FORMAT = 'cookie-storage-toolkit-migration';
  const chromeApi = globalThis.browser || globalThis.chrome;
  const hasChromeApi = Boolean(chromeApi?.tabs?.query && chromeApi?.cookies?.getAll);
  const hasStorageApi = Boolean(
    chromeApi?.tabs?.query &&
    (chromeApi?.scripting?.executeScript || chromeApi?.tabs?.executeScript)
  );

  let activeView = 'cookies';
  let currentTabId = null;
  let currentDomain = '';
  let currentOrigin = '';
  let currentProtocol = 'https:';
  let currentCookies = [];
  let currentStorageItems = [];
  let selectedDomainFilter = ALL_DOMAINS;
  let selectedStorageTypeFilter = ALL_STORAGE_TYPES;
  let selectedCookieKeys = new Set();
  let selectedStorageKeys = new Set();
  let sortState = { field: null, direction: 'asc' };
  let storageSortState = { field: null, direction: 'asc' };
  let cookieFormMode = 'add';
  let storageFormMode = 'add';
  let editingCookie = null;
  let editingStorageItem = null;
  let pendingPasswordResolve = null;
  let textModalImportMode = 'cookies';

  const cookieTableBody = document.getElementById('cookieTableBody');
  const noCookiesMsg = document.getElementById('noCookiesMsg');
  const domainInfo = document.getElementById('domainInfo');
  const toastStack = document.getElementById('toastStack');
  const shownCount = document.getElementById('shownCount');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnAddCookie = document.getElementById('btnAddCookie');
  const btnDeleteSelected = document.getElementById('btnDeleteSelected');
  const tabCookies = document.getElementById('tabCookies');
  const tabStorage = document.getElementById('tabStorage');
  const cookieListContainer = document.getElementById('cookieListContainer');
  const storageListContainer = document.getElementById('storageListContainer');
  const domainFilterWrap = document.getElementById('domainFilterWrap');
  const storageFilterWrap = document.getElementById('storageFilterWrap');
  const domainFilter = document.getElementById('domainFilter');
  const storageTypeFilter = document.getElementById('storageTypeFilter');
  const selectAll = document.getElementById('selectAll');
  const selectAllStorage = document.getElementById('selectAllStorage');
  const sortNameButton = document.getElementById('sortName');
  const sortValueButton = document.getElementById('sortValue');
  const sortStorageKeyButton = document.getElementById('sortStorageKey');
  const sortStorageValueButton = document.getElementById('sortStorageValue');
  const btnExportMenu = document.getElementById('btnExportMenu');
  const btnExportJson = document.getElementById('btnExportJson');
  const btnExportNetscape = document.getElementById('btnExportNetscape');
  const btnExportEncrypted = document.getElementById('btnExportEncrypted');
  const btnExportText = document.getElementById('btnExportText');
  const btnExportJs = document.getElementById('btnExportJs');
  const btnExportMigrate = document.getElementById('btnExportMigrate');
  const exportButtonLabel = document.getElementById('exportButtonLabel');
  const importButtonLabel = document.getElementById('importButtonLabel');
  const btnImportJsonFile = document.getElementById('btnImportJsonFile');
  const btnImportEncryptedFile = document.getElementById('btnImportEncryptedFile');
  const btnImportMigrateFile = document.getElementById('btnImportMigrateFile');
  const btnImportText = document.getElementById('btnImportText');
  const fileInput = document.getElementById('fileImportJson');
  const encryptedFileInput = document.getElementById('fileImportEncrypted');
  const migrateFileInput = document.getElementById('fileImportMigrate');
  const dropdownTriggers = [...document.querySelectorAll('[data-dropdown-trigger]')];
  const dropdownItems = [...document.querySelectorAll('.dropdown-item')];

  const modal = document.getElementById('textModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalTextarea = document.getElementById('modalTextarea');
  const btnModalCopy = document.getElementById('btnModalCopy');
  const btnModalImport = document.getElementById('btnModalImport');
  const spanClose = document.getElementsByClassName('close')[0];
  const cookieModal = document.getElementById('cookieModal');
  const cookieForm = document.getElementById('cookieForm');
  const cookieModalTitle = document.getElementById('cookieModalTitle');
  const btnCookieModalClose = document.getElementById('btnCookieModalClose');
  const btnCookieCancel = document.getElementById('btnCookieCancel');
  const cookieFormName = document.getElementById('cookieFormName');
  const cookieFormValue = document.getElementById('cookieFormValue');
  const cookieFormDomain = document.getElementById('cookieFormDomain');
  const cookieFormPath = document.getElementById('cookieFormPath');
  const cookieFormSameSite = document.getElementById('cookieFormSameSite');
  const cookieFormExpiration = document.getElementById('cookieFormExpiration');
  const cookieFormStoreId = document.getElementById('cookieFormStoreId');
  const cookieFormSession = document.getElementById('cookieFormSession');
  const cookieFormSecure = document.getElementById('cookieFormSecure');
  const cookieFormHttpOnly = document.getElementById('cookieFormHttpOnly');
  const cookieFormHostOnly = document.getElementById('cookieFormHostOnly');
  const storageTableBody = document.getElementById('storageTableBody');
  const noStorageMsg = document.getElementById('noStorageMsg');
  const storageModal = document.getElementById('storageModal');
  const storageForm = document.getElementById('storageForm');
  const storageModalTitle = document.getElementById('storageModalTitle');
  const btnStorageModalClose = document.getElementById('btnStorageModalClose');
  const btnStorageCancel = document.getElementById('btnStorageCancel');
  const storageFormType = document.getElementById('storageFormType');
  const storageFormKey = document.getElementById('storageFormKey');
  const storageFormValue = document.getElementById('storageFormValue');
  const passwordModal = document.getElementById('passwordModal');
  const passwordForm = document.getElementById('passwordForm');
  const passwordModalTitle = document.getElementById('passwordModalTitle');
  const passwordModalDescription = document.getElementById('passwordModalDescription');
  const passwordInput = document.getElementById('passwordInput');
  const btnPasswordToggle = document.getElementById('btnPasswordToggle');
  const btnPasswordModalClose = document.getElementById('btnPasswordModalClose');
  const btnPasswordCancel = document.getElementById('btnPasswordCancel');
  const btnPasswordSubmit = document.getElementById('btnPasswordSubmit');
  const confirmModal = document.getElementById('confirmModal');
  const confirmModalMessage = document.getElementById('confirmModalMessage');
  const btnConfirmModalClose = document.getElementById('btnConfirmModalClose');
  const btnConfirmCancel = document.getElementById('btnConfirmCancel');
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');

  const ENCRYPTED_FILE_FORMAT = 'cookie-storage-toolkit-encrypted';
  const ENCRYPTION_ITERATIONS = 250000;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const iconDefinitions = {
    trash: [
      ['path', { d: 'M3 6h18' }],
      ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }],
      ['path', { d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }],
      ['path', { d: 'M10 11v6' }],
      ['path', { d: 'M14 11v6' }]
    ],
    copy: [
      ['rect', { width: '14', height: '14', x: '8', y: '8', rx: '2' }],
      ['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }]
    ],
    edit: [
      ['path', { d: 'M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }],
      ['path', { d: 'M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z' }]
    ],
    secure: [
      ['rect', { width: '14', height: '10', x: '5', y: '11', rx: '2' }],
      ['path', { d: 'M8 11V7a4 4 0 0 1 8 0v4' }]
    ],
    httponly: [
      ['path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.9a1 1 0 0 1-.68-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.2 1.2 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z' }]
    ],
    session: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['path', { d: 'M12 6v6l4 2' }]
    ],
    samesite: [
      ['path', { d: 'M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.14 1.14' }],
      ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.14-1.14' }]
    ],
    standard: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['path', { d: 'm9 12 2 2 4-4' }]
    ],
    check: [
      ['path', { d: 'm5 12 5 5L20 7' }]
    ]
  };

  spanClose.onclick = () => closeModal();
  window.onclick = (event) => {
    if (event.target === modal) closeModal();
    if (event.target === cookieModal) closeCookieModal();
    if (event.target === storageModal) closeStorageModal();
    if (event.target === passwordModal) closePasswordModal();
    if (event.target === confirmModal) closeConfirmModal();
  };
  btnRefresh.addEventListener('click', () => loadActiveView());
  btnAddCookie.addEventListener('click', () => {
    if (activeView === 'storage') openStorageForm('add');
    else openCookieForm('add');
  });
  btnDeleteSelected.addEventListener('click', () => openDeleteSelectedModal());
  btnCookieModalClose.addEventListener('click', () => closeCookieModal());
  btnCookieCancel.addEventListener('click', () => closeCookieModal());
  cookieForm.addEventListener('submit', saveCookieFromForm);
  tabCookies.addEventListener('click', () => switchView('cookies'));
  tabStorage.addEventListener('click', () => switchView('storage'));
  cookieFormSession.addEventListener('change', () => syncSessionExpirationState());
  cookieFormSameSite.addEventListener('change', () => {
    if (cookieFormSameSite.value === 'no_restriction') cookieFormSecure.checked = true;
  });
  btnStorageModalClose.addEventListener('click', () => closeStorageModal());
  btnStorageCancel.addEventListener('click', () => closeStorageModal());
  storageForm.addEventListener('submit', saveStorageFromForm);
  dropdownTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      if (trigger.disabled) return;
      event.stopPropagation();
      toggleDropdown(trigger);
    });
  });
  dropdownItems.forEach((item) => {
    item.addEventListener('click', () => closeDropdowns());
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.action-dropdown')) closeDropdowns();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDropdowns();
      closeCookieModal();
      closeStorageModal();
      closePasswordModal();
      closeConfirmModal();
    }
  });
  btnPasswordModalClose.addEventListener('click', () => closePasswordModal());
  btnPasswordCancel.addEventListener('click', () => closePasswordModal());
  passwordForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const password = passwordInput.value;
    if (!password) return showStatus('Password is required', 'error');
    closePasswordModal(password);
  });
  btnPasswordToggle.addEventListener('click', () => {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    btnPasswordToggle.classList.toggle('is-visible', !isVisible);
    btnPasswordToggle.setAttribute('aria-pressed', String(!isVisible));
    btnPasswordToggle.title = isVisible ? 'Show password' : 'Hide password';
    btnPasswordToggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    passwordInput.focus();
  });
  btnConfirmModalClose.addEventListener('click', () => closeConfirmModal());
  btnConfirmCancel.addEventListener('click', () => closeConfirmModal());
  btnConfirmDelete.addEventListener('click', () => deleteSelectedCookies());
  domainFilter.addEventListener('change', () => {
    selectedDomainFilter = domainFilter.value;
    renderCookies();
  });
  storageTypeFilter.addEventListener('change', () => {
    selectedStorageTypeFilter = storageTypeFilter.value;
    renderStorage();
  });
  selectAll.addEventListener('change', () => {
    const filteredCookieKeys = getFilteredCookies().map(cookieKey);
    if (selectAll.checked) {
      filteredCookieKeys.forEach((key) => selectedCookieKeys.add(key));
    } else {
      filteredCookieKeys.forEach((key) => selectedCookieKeys.delete(key));
    }
    renderCookies();
  });
  selectAllStorage.addEventListener('change', () => {
    const filteredStorageKeys = getFilteredStorageItems().map(storageItemKey);
    if (selectAllStorage.checked) {
      filteredStorageKeys.forEach((key) => selectedStorageKeys.add(key));
    } else {
      filteredStorageKeys.forEach((key) => selectedStorageKeys.delete(key));
    }
    renderStorage();
  });
  sortNameButton.addEventListener('click', () => toggleSort('name'));
  sortValueButton.addEventListener('click', () => toggleSort('value'));
  sortStorageKeyButton.addEventListener('click', () => toggleStorageSort('key'));
  sortStorageValueButton.addEventListener('click', () => toggleStorageSort('value'));

  function openModal() {
    modal.style.display = 'block';
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  function openCookieForm(mode, cookie = null) {
    cookieFormMode = mode;
    editingCookie = cookie ? { ...cookie } : null;
    cookieModalTitle.textContent = mode === 'edit' ? 'Edit Cookie' : 'Add Cookie';
    populateCookieForm(cookie || createDefaultCookieDraft());
    closeDropdowns();
    cookieModal.style.display = 'block';
    setTimeout(() => cookieFormName.focus(), 0);
  }

  function closeCookieModal() {
    cookieModal.style.display = 'none';
    cookieForm.reset();
    editingCookie = null;
    cookieFormMode = 'add';
  }

  function switchView(view) {
    if (activeView === view) return;

    activeView = view;
    closeDropdowns();
    closeCookieModal();
    closeStorageModal();
    updateViewControls();
    loadActiveView();
  }

  function updateViewControls() {
    const isStorage = activeView === 'storage';
    tabCookies.classList.toggle('is-active', !isStorage);
    tabStorage.classList.toggle('is-active', isStorage);
    tabCookies.setAttribute('aria-selected', String(!isStorage));
    tabStorage.setAttribute('aria-selected', String(isStorage));
    cookieListContainer.hidden = isStorage;
    storageListContainer.hidden = !isStorage;
    domainFilterWrap.hidden = isStorage;
    storageFilterWrap.hidden = !isStorage;
    btnRefresh.title = isStorage ? 'Refresh storage' : 'Refresh cookies';
    btnRefresh.setAttribute('aria-label', btnRefresh.title);
    btnAddCookie.title = isStorage ? 'Add storage item' : 'Add cookie';
    btnAddCookie.setAttribute('aria-label', btnAddCookie.title);
    exportButtonLabel.textContent = 'Export';
    importButtonLabel.textContent = 'Import';
    updateDropdownLabels(isStorage);
    btnExportMenu.closest('.action-dropdown').dataset.disabledTooltip = isStorage
      ? 'Select storage items before exporting'
      : 'Select cookies before exporting';
    btnExportNetscape.hidden = isStorage;
    btnExportEncrypted.hidden = isStorage;
    btnImportEncryptedFile.hidden = isStorage;
    btnExportMigrate.hidden = false;
    btnImportMigrateFile.hidden = false;
    fileInput.accept = isStorage
      ? '.json,.txt,text/plain,application/json'
      : '.json,.txt,.cookies,text/plain,application/json';
    btnImportJsonFile.title = isStorage
      ? 'Accepts Cookie & Storage Toolkit storage JSON exports.'
      : 'Accepts JSON cookie export (.json) or Netscape Cookie File (.txt, .cookies).';
    btnImportJsonFile.setAttribute('aria-label', isStorage
      ? 'Import storage file. Accepts Cookie & Storage Toolkit storage JSON exports.'
      : 'Import file. Accepts JSON cookie export or Netscape Cookie File.');
    btnImportText.title = isStorage
      ? 'Paste Cookie & Storage Toolkit storage JSON data.'
      : 'Paste a JSON cookie array/object or Netscape Cookie File text.';
    btnImportText.setAttribute('aria-label', isStorage
      ? 'Paste storage data. Accepts Cookie & Storage Toolkit storage JSON.'
      : 'Paste data. Accepts JSON cookie array, JSON cookies object, or Netscape Cookie File text.');
  }

  function updateDropdownLabels(isStorage) {
    setDropdownItemLabel(btnExportJson, isStorage ? 'Export Storage JSON' : 'Export Cookie JSON');
    setDropdownItemLabel(btnExportNetscape, 'Export Netscape Cookie File');
    setDropdownItemLabel(btnExportEncrypted, 'Export Encrypted Cookie CMP');
    setDropdownItemLabel(btnExportText, isStorage ? 'Copy Storage JSON' : 'Copy Cookie JSON');
    setDropdownItemLabel(btnExportJs, isStorage ? 'Copy Storage JS' : 'Copy Cookie JS');
    setDropdownItemLabel(btnExportMigrate, 'Export Migrate (.mcmp)');
    setDropdownItemLabel(btnImportJsonFile, isStorage ? 'Import Storage File' : 'Import Cookie File');
    setDropdownItemLabel(btnImportEncryptedFile, 'Import Encrypted Cookie CMP');
    setDropdownItemLabel(btnImportMigrateFile, 'Import Migrate (.mcmp)');
    setDropdownItemLabel(btnImportText, isStorage ? 'Paste Storage Data' : 'Paste Cookie Data');
  }

  function setDropdownItemLabel(button, label) {
    let labelElement = button.querySelector('.dropdown-item-label');

    if (!labelElement) {
      [...button.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.remove();
      });
      labelElement = document.createElement('span');
      labelElement.className = 'dropdown-item-label';
      button.appendChild(labelElement);
    }

    labelElement.textContent = label;
    labelElement.title = label;
  }

  function loadActiveView() {
    return activeView === 'storage' ? loadStorage() : loadCookies();
  }

  function openStorageForm(mode, item = null) {
    storageFormMode = mode;
    editingStorageItem = item ? { ...item } : null;
    storageModalTitle.textContent = mode === 'edit' ? 'Edit Storage Item' : 'Add Storage Item';
    populateStorageForm(item || createDefaultStorageDraft());
    closeDropdowns();
    storageModal.style.display = 'block';
    setTimeout(() => storageFormKey.focus(), 0);
  }

  function closeStorageModal() {
    storageModal.style.display = 'none';
    storageForm.reset();
    editingStorageItem = null;
    storageFormMode = 'add';
  }

  function openPasswordModal(action) {
    passwordModalTitle.textContent = action === 'export'
      ? 'Encrypt Cookie File'
      : 'Decrypt Cookie File';
    passwordModalDescription.textContent = action === 'export'
      ? 'Enter a password to encrypt the selected cookies before download.'
      : 'Enter the password used to encrypt this .cmp cookie file.';
    btnPasswordSubmit.textContent = action === 'export' ? 'Encrypt & Export' : 'Decrypt & Import';
    passwordInput.value = '';
    passwordInput.type = 'password';
    btnPasswordToggle.classList.remove('is-visible');
    btnPasswordToggle.setAttribute('aria-pressed', 'false');
    btnPasswordToggle.title = 'Show password';
    btnPasswordToggle.setAttribute('aria-label', 'Show password');
    passwordModal.style.display = 'block';
    setTimeout(() => passwordInput.focus(), 0);
  }

  function closePasswordModal(password = '') {
    passwordModal.style.display = 'none';
    passwordForm.reset();

    const resolve = pendingPasswordResolve;
    pendingPasswordResolve = null;
    if (resolve) resolve(password);
  }

  function openConfirmModal() {
    confirmModal.style.display = 'block';
  }

  function closeConfirmModal() {
    confirmModal.style.display = 'none';
  }

  function createSvgIcon(name, className = '') {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    if (className) svg.classList.add(...className.split(/\s+/).filter(Boolean));

    const definition = iconDefinitions[name] || iconDefinitions.standard;
    definition.forEach(([tagName, attrs]) => {
      const element = document.createElementNS(SVG_NS, tagName);
      Object.entries(attrs).forEach(([attrName, value]) => {
        element.setAttribute(attrName, value);
      });
      svg.appendChild(element);
    });

    return svg;
  }

  function createDefaultCookieDraft() {
    const domain = getDefaultCookieDomain();

    return {
      name: '',
      value: '',
      domain,
      path: '/',
      secure: currentProtocol === 'https:',
      httpOnly: false,
      hostOnly: !domain.startsWith('.'),
      sameSite: 'lax',
      expirationDate: null,
      storeId: ''
    };
  }

  function getDefaultCookieDomain() {
    if (selectedDomainFilter !== ALL_DOMAINS) return selectedDomainFilter;
    return currentDomain || '';
  }

  function populateCookieForm(cookie) {
    const domain = cookie.domain || currentDomain || '';
    const hostOnly = cookie.hostOnly === undefined
      ? Boolean(domain && !domain.startsWith('.'))
      : Boolean(cookie.hostOnly);
    const isSession = !cookie.expirationDate;

    cookieFormName.value = cookie.name || '';
    cookieFormValue.value = cookie.value || '';
    cookieFormDomain.value = domain;
    cookieFormPath.value = cookie.path || '/';
    cookieFormSameSite.value = cookie.sameSite && cookie.sameSite !== 'unspecified' ? cookie.sameSite : '';
    cookieFormExpiration.value = cookie.expirationDate
      ? toDatetimeLocalValue(cookie.expirationDate)
      : toDatetimeLocalValue(Math.floor(Date.now() / 1000) + 2592000);
    cookieFormStoreId.value = cookie.storeId || '';
    cookieFormSession.checked = isSession;
    cookieFormSecure.checked = Boolean(cookie.secure);
    cookieFormHttpOnly.checked = Boolean(cookie.httpOnly);
    cookieFormHostOnly.checked = hostOnly;
    syncSessionExpirationState();
  }

  function syncSessionExpirationState() {
    cookieFormExpiration.disabled = cookieFormSession.checked;
    if (!cookieFormSession.checked && !cookieFormExpiration.value) {
      cookieFormExpiration.value = toDatetimeLocalValue(Math.floor(Date.now() / 1000) + 2592000);
    }
  }

  function toDatetimeLocalValue(timestampSeconds) {
    const date = new Date(Number(timestampSeconds) * 1000);
    const pad = (value) => String(value).padStart(2, '0');

    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function readCookieForm() {
    const name = cookieFormName.value.trim();
    const value = cookieFormValue.value;
    let rawDomain = cookieFormDomain.value.trim();
    const path = cookieFormPath.value.trim() || '/';
    const hostOnly = cookieFormHostOnly.checked;
    const sameSite = cookieFormSameSite.value;
    const secure = sameSite === 'no_restriction' ? true : cookieFormSecure.checked;
    const storeId = cookieFormStoreId.value.trim();

    if (!name) throw new Error('Cookie name is required.');
    if (/[\s;=]/.test(name)) throw new Error('Cookie name cannot contain whitespace, semicolon, or equals sign.');
    if (/^https?:\/\//i.test(rawDomain)) rawDomain = new URL(rawDomain).hostname;
    if (!rawDomain) throw new Error('Cookie domain is required.');
    if (/[\s/:]/.test(rawDomain)) throw new Error('Cookie domain cannot contain spaces, slashes, or ports.');
    if (!path.startsWith('/')) throw new Error('Cookie path must start with /.');
    if (/[\r\n;]/.test(value)) throw new Error('Cookie value cannot contain semicolons or line breaks.');

    const cookie = {
      name,
      value,
      domain: hostOnly ? rawDomain.replace(/^\./, '') : rawDomain,
      path,
      secure,
      httpOnly: cookieFormHttpOnly.checked,
      hostOnly
    };

    if (sameSite) cookie.sameSite = sameSite;
    if (storeId) cookie.storeId = storeId;

    if (!cookieFormSession.checked) {
      if (!cookieFormExpiration.value) throw new Error('Expiration is required for persistent cookies.');
      const expirationDate = Math.floor(new Date(cookieFormExpiration.value).getTime() / 1000);
      if (!Number.isFinite(expirationDate) || expirationDate <= Math.floor(Date.now() / 1000)) {
        throw new Error('Expiration must be a future date.');
      }
      cookie.expirationDate = expirationDate;
    }

    return cookie;
  }

  async function saveCookieFromForm(event) {
    event.preventDefault();

    try {
      const mode = cookieFormMode;
      const cookie = readCookieForm();

      if (!hasChromeApi) {
        upsertPreviewCookie(cookie, editingCookie);
        closeCookieModal();
        showStatus(mode === 'edit' ? 'Cookie updated in preview' : 'Cookie added in preview');
        return;
      }

      const result = await chromeApi.cookies.set(normalizeImportedCookie(cookie));
      if (!result) throw new Error('Browser rejected the cookie.');

      if (mode === 'edit' && editingCookie && cookieKey(editingCookie) !== cookieKey(cookie)) {
        await removeCookieFromStore(editingCookie);
      }

      selectedCookieKeys.delete(editingCookie ? cookieKey(editingCookie) : cookieKey(cookie));
      closeCookieModal();
      showStatus(mode === 'edit' ? 'Cookie updated' : 'Cookie added');
      loadCookies();
    } catch (err) {
      console.error(err);
      showStatus(err.message || 'Could not save cookie', 'error');
    }
  }

  function upsertPreviewCookie(cookie, originalCookie = null) {
    const originalKey = originalCookie ? cookieKey(originalCookie) : null;
    const nextKey = cookieKey(cookie);
    currentCookies = currentCookies.filter((item) => {
      const key = cookieKey(item);
      return key !== originalKey && key !== nextKey;
    });
    currentCookies.push({ ...cookie });
    selectedCookieKeys.delete(originalKey);
    pruneSelection();
    renderCookies();
  }

  function createDefaultStorageDraft() {
    return {
      type: selectedStorageTypeFilter === 'session' ? 'session' : 'local',
      key: '',
      value: ''
    };
  }

  function populateStorageForm(item) {
    storageFormType.value = normalizeStorageType(item.type);
    storageFormKey.value = item.key || '';
    storageFormValue.value = item.value || '';
  }

  function readStorageForm() {
    const type = normalizeStorageType(storageFormType.value);
    const key = storageFormKey.value.trim();
    const value = storageFormValue.value;

    if (!key) throw new Error('Storage key is required.');

    return { type, key, value };
  }

  async function saveStorageFromForm(event) {
    event.preventDefault();

    try {
      const mode = storageFormMode;
      const item = readStorageForm();

      if (!hasChromeApi) {
        upsertPreviewStorageItem(item, editingStorageItem);
        closeStorageModal();
        showStatus(mode === 'edit' ? 'Storage item updated in preview' : 'Storage item added in preview');
        return;
      }

      if (mode === 'edit' && editingStorageItem && storageItemKey(editingStorageItem) !== storageItemKey(item)) {
        await removeStorageItemFromPage(editingStorageItem);
      }

      await setStorageItemInPage(item);
      selectedStorageKeys.delete(editingStorageItem ? storageItemKey(editingStorageItem) : storageItemKey(item));
      closeStorageModal();
      showStatus(mode === 'edit' ? 'Storage item updated' : 'Storage item added');
      loadStorage();
    } catch (err) {
      console.error(err);
      showStatus(err.message || 'Could not save storage item', 'error');
    }
  }

  function upsertPreviewStorageItem(item, originalItem = null) {
    const originalKey = originalItem ? storageItemKey(originalItem) : null;
    const nextKey = storageItemKey(item);
    currentStorageItems = currentStorageItems.filter((storageItem) => {
      const key = storageItemKey(storageItem);
      return key !== originalKey && key !== nextKey;
    });
    currentStorageItems.push({ ...item });
    selectedStorageKeys.delete(originalKey);
    pruneStorageSelection();
    renderStorage();
  }

  function showStatus(message, type = 'success') {
    const toast = document.createElement('div');
    const normalizedType = type === 'error' ? 'error' : 'success';
    toast.className = `toast ${normalizedType}`;
    toast.textContent = message;
    toastStack.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-visible'));

    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 220);
    }, normalizedType === 'error' ? 5200 : 3600);
  }

  function getPreviewCookies() {
    return [
      {
        name: 'session_token',
        value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.preview.signature',
        domain: '.preview.local',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax'
      },
      {
        name: 'theme',
        value: 'dark',
        domain: '.preview.local',
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'lax',
        expirationDate: 1893456000
      },
      {
        name: 'workspace_id',
        value: 'navy_ai_demo_01',
        domain: '.preview.local',
        path: '/dashboard',
        secure: true,
        httpOnly: false,
        sameSite: 'strict',
        expirationDate: 1893456000
      }
    ];
  }

  function getPreviewStorageItems() {
    return [
      {
        type: 'local',
        key: 'theme',
        value: 'dark'
      },
      {
        type: 'local',
        key: 'workspace_id',
        value: 'navy_ai_demo_01'
      },
      {
        type: 'session',
        key: 'draft_filter',
        value: '{"domain":"preview.local","mode":"storage"}'
      }
    ];
  }

  async function loadCookies() {
    try {
      if (!hasChromeApi) {
        currentTabId = null;
        currentDomain = 'preview.local';
        currentOrigin = 'https://preview.local';
        currentProtocol = 'https:';
        currentCookies = getPreviewCookies();
        domainInfo.textContent = `Domain: ${currentDomain}`;
        pruneSelection();
        renderCookies();
        return;
      }

      const [tab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
      currentTabId = tab?.id || null;
      currentOrigin = '';
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        currentDomain = null;
        currentProtocol = 'https:';
        domainInfo.textContent = 'All accessible cookies';
        currentCookies = await chromeApi.cookies.getAll({});
      } else {
        const url = new URL(tab.url);
        currentDomain = url.hostname;
        currentOrigin = url.origin;
        currentProtocol = url.protocol;
        domainInfo.textContent = `Domain: ${currentDomain}`;
        currentCookies = await getCookiesForTab(tab, url);
      }

      pruneSelection();
      renderCookies();
    } catch (err) {
      console.error(err);
      domainInfo.textContent = 'Error loading context';
      currentCookies = [];
      pruneSelection();
      renderCookies();
      showStatus('Could not load cookies', 'error');
    }
  }

  async function loadStorage() {
    try {
      if (!hasChromeApi) {
        currentTabId = null;
        currentDomain = 'preview.local';
        currentOrigin = 'https://preview.local';
        currentProtocol = 'https:';
        currentStorageItems = getPreviewStorageItems();
        domainInfo.textContent = `Origin: ${currentOrigin}`;
        pruneStorageSelection();
        renderStorage();
        return;
      }

      const [tab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
      currentTabId = tab?.id || null;

      if (!tab || !tab.url || !/^https?:\/\//i.test(tab.url)) {
        currentDomain = null;
        currentOrigin = '';
        currentProtocol = 'https:';
        currentStorageItems = [];
        domainInfo.textContent = 'Storage unavailable on this page';
        pruneStorageSelection();
        renderStorage();
        return;
      }

      if (!hasStorageApi) throw new Error('Browser script injection API is unavailable.');

      const url = new URL(tab.url);
      currentDomain = url.hostname;
      currentOrigin = url.origin;
      currentProtocol = url.protocol;
      domainInfo.textContent = `Origin: ${currentOrigin}`;

      const result = await executeStorageScript(readStorageFromPage);
      currentStorageItems = normalizePageStorageItems(result?.items || []);
      pruneStorageSelection();
      renderStorage();
      if (result?.errors?.length) {
        showStatus(`Storage loaded with warnings: ${result.errors.join('; ')}`, 'error');
      }
    } catch (err) {
      console.error(err);
      domainInfo.textContent = 'Error loading storage';
      currentStorageItems = [];
      pruneStorageSelection();
      renderStorage();
      showStatus(err.message ? `Could not load storage: ${err.message}` : 'Could not load storage', 'error');
    }
  }

  async function executeStorageScript(func, args = []) {
    if (!currentTabId) throw new Error('No active tab is available.');

    let results;
    if (chromeApi.scripting?.executeScript) {
      results = await chromeApi.scripting.executeScript({
        target: { tabId: currentTabId },
        func,
        args
      });
    } else if (chromeApi.tabs?.executeScript) {
      const code = `(${func.toString()})(...${JSON.stringify(args)})`;
      results = await chromeApi.tabs.executeScript(currentTabId, { code });
    } else {
      throw new Error('Browser script injection API is unavailable.');
    }

    const firstResult = Array.isArray(results) ? results[0] : results;
    const result = firstResult && Object.prototype.hasOwnProperty.call(firstResult, 'result')
      ? firstResult.result
      : firstResult;
    if (result?.error) throw new Error(result.error);
    return result;
  }

  function readStorageFromPage() {
    const errors = [];
    const readStore = (type) => {
      const items = [];
      const label = type === 'session' ? 'sessionStorage' : 'localStorage';

      try {
        const store = type === 'session' ? window.sessionStorage : window.localStorage;
        for (let index = 0; index < store.length; index++) {
          const key = store.key(index);
          if (key === null) continue;
          items.push({
            type,
            key,
            value: store.getItem(key) || ''
          });
        }
      } catch (err) {
        errors.push(`${label}: ${err?.message || 'access denied'}`);
      }

      return items;
    };

    return {
      origin: location.origin,
      items: [
        ...readStore('local'),
        ...readStore('session')
      ],
      errors
    };
  }

  function setStorageOnPage(type, key, value) {
    try {
      const store = type === 'session' ? window.sessionStorage : window.localStorage;
      store.setItem(String(key), String(value));
      return { ok: true };
    } catch (err) {
      return { error: err?.message || 'Could not write storage item.' };
    }
  }

  function removeStorageOnPage(type, key) {
    try {
      const store = type === 'session' ? window.sessionStorage : window.localStorage;
      store.removeItem(String(key));
      return { ok: true };
    } catch (err) {
      return { error: err?.message || 'Could not remove storage item.' };
    }
  }

  function renderCookies() {
    cookieTableBody.replaceChildren();

    syncDomainFilterOptions();
    const filteredCookies = getFilteredCookies();
    const displayCookies = getSortedCookies(filteredCookies).slice(0, MAX_RENDERED_COOKIES);
    updateSelectionControls(filteredCookies, displayCookies.length);
    updateSortControls();

    if (filteredCookies.length === 0) {
      noCookiesMsg.style.display = 'flex';
      cookieTableBody.parentElement.style.display = 'none';
      return;
    }

    noCookiesMsg.style.display = 'none';
    cookieTableBody.parentElement.style.display = 'table';

    displayCookies.forEach((cookie) => {
      const tr = document.createElement('tr');
      const key = cookieKey(cookie);
      tr.classList.toggle('is-selected', selectedCookieKeys.has(key));

      const tdSelect = document.createElement('td');
      tdSelect.className = 'select-cell';
      tdSelect.appendChild(createRowCheckbox(cookie, key));

      const tdName = document.createElement('td');
      tdName.className = 'name-cell';
      const cookieMeta = document.createElement('span');
      cookieMeta.className = 'cookie-meta';
      cookieMeta.textContent = `${cookie.domain || currentDomain || 'global'}${cookie.path || '/'}`;
      cookieMeta.title = cookieMeta.textContent;
      tdName.append(createCopyLine(cookie.name || '(unnamed)', 'cookie-name', 'Copy cookie name', 'Cookie name copied'), cookieMeta);

      const tdVal = document.createElement('td');
      tdVal.className = 'value-cell';
      tdVal.appendChild(createCopyLine(cookie.value || '', 'cookie-value', 'Copy cookie value', 'Cookie value copied'));

      const tdFlags = document.createElement('td');
      tdFlags.className = 'flags-cell';
      const flags = document.createElement('div');
      flags.className = 'flags';
      if (cookie.secure) flags.appendChild(createFlagIcon('secure', 'Secure: sent only over HTTPS'));
      if (cookie.httpOnly) flags.appendChild(createFlagIcon('httponly', 'HttpOnly: hidden from client-side JavaScript'));
      if (!cookie.expirationDate) flags.appendChild(createFlagIcon('session', 'Session: expires when browser session ends'));
      if (cookie.sameSite && cookie.sameSite !== 'unspecified') {
        flags.appendChild(createFlagIcon('samesite', `SameSite: ${formatSameSite(cookie.sameSite)}`));
      }
      if (!flags.children.length) flags.appendChild(createFlagIcon('standard', 'Standard cookie'));
      tdFlags.appendChild(flags);

      const tdAction = document.createElement('td');
      const rowActions = document.createElement('div');
      rowActions.className = 'row-actions';
      const editBtn = document.createElement('button');
      editBtn.className = 'row-action-btn edit-btn';
      editBtn.type = 'button';
      editBtn.appendChild(createSvgIcon('edit'));
      editBtn.title = 'Edit cookie';
      editBtn.setAttribute('aria-label', `Edit ${cookie.name || 'cookie'}`);
      editBtn.onclick = () => openCookieForm('edit', cookie);
      const delBtn = document.createElement('button');
      delBtn.className = 'row-action-btn del-btn';
      delBtn.type = 'button';
      delBtn.appendChild(createSvgIcon('trash'));
      delBtn.title = 'Delete cookie';
      delBtn.setAttribute('aria-label', `Delete ${cookie.name || 'cookie'}`);
      delBtn.onclick = () => deleteCookie(cookie);
      rowActions.append(editBtn, delBtn);
      tdAction.appendChild(rowActions);

      tr.append(tdSelect, tdName, tdVal, tdFlags, tdAction);
      cookieTableBody.appendChild(tr);
    });

    if (filteredCookies.length > MAX_RENDERED_COOKIES) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      const more = filteredCookies.length - MAX_RENDERED_COOKIES;
      td.colSpan = 5;
      td.className = 'more-row';
      const moreText = document.createElement('span');
      moreText.textContent = `... and ${more} more cookies`;
      td.appendChild(moreText);
      cookieTableBody.appendChild(tr);
      tr.appendChild(td);
    }
  }

  function renderStorage() {
    storageTableBody.replaceChildren();

    const filteredItems = getFilteredStorageItems();
    const displayItems = getSortedStorageItems(filteredItems).slice(0, MAX_RENDERED_STORAGE_ITEMS);
    updateStorageSelectionControls(filteredItems, displayItems.length);
    updateStorageSortControls();

    if (filteredItems.length === 0) {
      noStorageMsg.style.display = 'flex';
      storageTableBody.parentElement.style.display = 'none';
      return;
    }

    noStorageMsg.style.display = 'none';
    storageTableBody.parentElement.style.display = 'table';

    displayItems.forEach((item) => {
      const tr = document.createElement('tr');
      const key = storageItemKey(item);
      tr.classList.toggle('is-selected', selectedStorageKeys.has(key));

      const tdSelect = document.createElement('td');
      tdSelect.className = 'select-cell';
      tdSelect.appendChild(createStorageRowCheckbox(item, key));

      const tdKey = document.createElement('td');
      tdKey.className = 'name-cell';
      const storageMeta = document.createElement('span');
      storageMeta.className = 'cookie-meta';
      storageMeta.textContent = currentOrigin || currentDomain || 'current page';
      storageMeta.title = storageMeta.textContent;
      tdKey.append(createCopyLine(item.key || '(empty)', 'cookie-name', 'Copy storage key', 'Storage key copied'), storageMeta);

      const tdValue = document.createElement('td');
      tdValue.className = 'value-cell';
      tdValue.appendChild(createCopyLine(item.value || '', 'cookie-value', 'Copy storage value', 'Storage value copied'));

      const tdType = document.createElement('td');
      const typeBadge = document.createElement('span');
      typeBadge.className = `storage-type-badge ${item.type === 'session' ? 'session' : 'local'}`;
      typeBadge.textContent = getStorageTypeShortLabel(item.type);
      typeBadge.dataset.tooltip = getStorageTypeLabel(item.type);
      typeBadge.title = getStorageTypeLabel(item.type);
      tdType.appendChild(typeBadge);

      const tdAction = document.createElement('td');
      const rowActions = document.createElement('div');
      rowActions.className = 'row-actions';
      const editBtn = document.createElement('button');
      editBtn.className = 'row-action-btn edit-btn';
      editBtn.type = 'button';
      editBtn.appendChild(createSvgIcon('edit'));
      editBtn.title = 'Edit storage item';
      editBtn.setAttribute('aria-label', `Edit ${item.key || 'storage item'}`);
      editBtn.onclick = () => openStorageForm('edit', item);
      const delBtn = document.createElement('button');
      delBtn.className = 'row-action-btn del-btn';
      delBtn.type = 'button';
      delBtn.appendChild(createSvgIcon('trash'));
      delBtn.title = 'Delete storage item';
      delBtn.setAttribute('aria-label', `Delete ${item.key || 'storage item'}`);
      delBtn.onclick = () => deleteStorageItem(item);
      rowActions.append(editBtn, delBtn);
      tdAction.appendChild(rowActions);

      tr.append(tdSelect, tdKey, tdValue, tdType, tdAction);
      storageTableBody.appendChild(tr);
    });

    if (filteredItems.length > MAX_RENDERED_STORAGE_ITEMS) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      const more = filteredItems.length - MAX_RENDERED_STORAGE_ITEMS;
      td.colSpan = 5;
      td.className = 'more-row';
      const moreText = document.createElement('span');
      moreText.textContent = `... and ${more} more storage items`;
      td.appendChild(moreText);
      storageTableBody.appendChild(tr);
      tr.appendChild(td);
    }
  }

  function syncDomainFilterOptions() {
    const domainCounts = currentCookies.reduce((counts, cookie) => {
      const domain = cookieDomain(cookie);
      counts.set(domain, (counts.get(domain) || 0) + 1);
      return counts;
    }, new Map());
    const domains = [...domainCounts.keys()].sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    if (selectedDomainFilter !== ALL_DOMAINS && !domains.includes(selectedDomainFilter)) {
      selectedDomainFilter = ALL_DOMAINS;
    }

    domainFilter.replaceChildren();
    domainFilter.appendChild(createDomainOption(ALL_DOMAINS, `-- Show all domains -- (${currentCookies.length})`));
    domains.forEach((domain) => {
      domainFilter.appendChild(createDomainOption(domain, `${domain} (${domainCounts.get(domain) || 0})`));
    });
    domainFilter.value = selectedDomainFilter;
  }

  function createDomainOption(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.title = label;
    return option;
  }

  function cookieDomain(cookie) {
    return cookie.domain || currentDomain || 'global';
  }

  async function getCookiesForTab(tab, url) {
    const storeId = await getCookieStoreIdForTab(tab.id);
    const details = storeId ? { storeId } : {};
    const lookups = getDomainLookupCandidates(url.hostname).map((domain) => {
      return chromeApi.cookies.getAll({ ...details, domain });
    });

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      lookups.push(chromeApi.cookies.getAll({ ...details, url: url.href }));
    }

    const results = await Promise.allSettled(lookups);
    const cookies = [];
    let firstError = null;

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        cookies.push(...result.value);
      } else if (!firstError) {
        firstError = result.reason;
      }
    });

    if (cookies.length === 0 && results.every((result) => result.status === 'rejected')) {
      throw firstError;
    }

    return dedupeCookies(cookies);
  }

  function getDomainLookupCandidates(hostname) {
    const labels = hostname.split('.').filter(Boolean);
    const candidates = [];

    labels.forEach((_, index) => {
      const domain = labels.slice(index).join('.');
      if (domain.includes('.')) candidates.push(domain);
    });

    return candidates;
  }

  async function getCookieStoreIdForTab(tabId) {
    if (!tabId || !chromeApi.cookies.getAllCookieStores) return null;
    const stores = await chromeApi.cookies.getAllCookieStores();
    return stores.find((store) => store.tabIds?.includes(tabId))?.id || null;
  }

  function dedupeCookies(cookies) {
    const unique = new Map();
    cookies.forEach((cookie) => unique.set(cookieKey(cookie), cookie));
    return [...unique.values()];
  }

  function getFilteredCookies() {
    if (selectedDomainFilter === ALL_DOMAINS) return currentCookies;
    return currentCookies.filter((cookie) => cookieDomain(cookie) === selectedDomainFilter);
  }

  function getFilteredStorageItems() {
    if (selectedStorageTypeFilter === ALL_STORAGE_TYPES) return currentStorageItems;
    return currentStorageItems.filter((item) => item.type === selectedStorageTypeFilter);
  }

  function createRowCheckbox(cookie, key) {
    const label = document.createElement('label');
    label.className = 'check-control';
    label.title = `Select ${cookie.name || 'cookie'}`;
    label.setAttribute('aria-label', `Select ${cookie.name || 'cookie'}`);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'sr-only';
    input.checked = selectedCookieKeys.has(key);
    input.addEventListener('change', () => {
      if (input.checked) selectedCookieKeys.add(key);
      else selectedCookieKeys.delete(key);
      renderCookies();
    });

    const box = document.createElement('span');
    box.className = 'check-box';
    box.appendChild(createSvgIcon('check', 'check-icon'));

    label.append(input, box);
    return label;
  }

  function createStorageRowCheckbox(item, key) {
    const label = document.createElement('label');
    label.className = 'check-control';
    label.title = `Select ${item.key || 'storage item'}`;
    label.setAttribute('aria-label', `Select ${item.key || 'storage item'}`);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'sr-only';
    input.checked = selectedStorageKeys.has(key);
    input.addEventListener('change', () => {
      if (input.checked) selectedStorageKeys.add(key);
      else selectedStorageKeys.delete(key);
      renderStorage();
    });

    const box = document.createElement('span');
    box.className = 'check-box';
    box.appendChild(createSvgIcon('check', 'check-icon'));

    label.append(input, box);
    return label;
  }

  function cookieKey(cookie) {
    return [
      cookie.storeId || '',
      cookie.domain || currentDomain || '',
      cookie.path || '/',
      cookie.name || ''
    ].join('\u001f');
  }

  function storageItemKey(item) {
    return [
      normalizeStorageType(item.type),
      item.key || ''
    ].join('\u001f');
  }

  function getSortedCookies(cookies) {
    const sorted = [...cookies];
    if (!sortState.field) return sorted;

    sorted.sort((a, b) => {
      const primary = compareCookieField(a, b, sortState.field);
      if (primary !== 0) return sortState.direction === 'asc' ? primary : -primary;

      return compareCookieField(a, b, 'name')
        || compareCookieField(a, b, 'domain')
        || compareCookieField(a, b, 'path');
    });

    return sorted;
  }

  function compareCookieField(a, b, field) {
    const aValue = String(a[field] || '').toLocaleLowerCase();
    const bValue = String(b[field] || '').toLocaleLowerCase();
    return aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
  }

  function getSortedStorageItems(items) {
    const sorted = [...items];
    if (!storageSortState.field) return sorted;

    sorted.sort((a, b) => {
      const primary = compareCookieField(a, b, storageSortState.field);
      if (primary !== 0) return storageSortState.direction === 'asc' ? primary : -primary;

      return compareCookieField(a, b, 'type')
        || compareCookieField(a, b, 'key');
    });

    return sorted;
  }

  function toggleSort(field) {
    if (sortState.field === field) {
      sortState = {
        field,
        direction: sortState.direction === 'asc' ? 'desc' : 'asc'
      };
    } else {
      sortState = { field, direction: 'asc' };
    }

    renderCookies();
  }

  function toggleStorageSort(field) {
    if (storageSortState.field === field) {
      storageSortState = {
        field,
        direction: storageSortState.direction === 'asc' ? 'desc' : 'asc'
      };
    } else {
      storageSortState = { field, direction: 'asc' };
    }

    renderStorage();
  }

  function updateSortControls() {
    [
      ['name', sortNameButton],
      ['value', sortValueButton]
    ].forEach(([field, button]) => {
      const isActive = sortState.field === field;
      button.classList.toggle('is-active', isActive);
      button.dataset.direction = isActive ? sortState.direction : '';
      button.setAttribute('aria-label', `Sort by ${field}${isActive ? ` (${sortState.direction})` : ''}`);
    });
  }

  function updateStorageSortControls() {
    [
      ['key', sortStorageKeyButton],
      ['value', sortStorageValueButton]
    ].forEach(([field, button]) => {
      const isActive = storageSortState.field === field;
      button.classList.toggle('is-active', isActive);
      button.dataset.direction = isActive ? storageSortState.direction : '';
      button.setAttribute('aria-label', `Sort by ${field}${isActive ? ` (${storageSortState.direction})` : ''}`);
    });
  }

  function pruneSelection() {
    const availableKeys = new Set(currentCookies.map(cookieKey));
    selectedCookieKeys = new Set([...selectedCookieKeys].filter((key) => availableKeys.has(key)));
  }

  function pruneStorageSelection() {
    const availableKeys = new Set(currentStorageItems.map(storageItemKey));
    selectedStorageKeys = new Set([...selectedStorageKeys].filter((key) => availableKeys.has(key)));
  }

  function getSelectedCookies() {
    return getSortedCookies(getFilteredCookies()).filter((cookie) => selectedCookieKeys.has(cookieKey(cookie)));
  }

  function getSelectedStorageItems() {
    return getSortedStorageItems(getFilteredStorageItems()).filter((item) => selectedStorageKeys.has(storageItemKey(item)));
  }

  function updateSelectionControls(filteredCookies, displayCount) {
    const filteredCookieKeys = filteredCookies.map(cookieKey);
    const selectedFilteredCount = filteredCookieKeys.filter((key) => selectedCookieKeys.has(key)).length;
    const selectedCount = getSelectedCookies().length;
    const hasCookies = filteredCookieKeys.length > 0;

    selectAll.disabled = !hasCookies;
    selectAll.checked = hasCookies && selectedFilteredCount === filteredCookieKeys.length;
    selectAll.indeterminate = selectedFilteredCount > 0 && selectedFilteredCount < filteredCookieKeys.length;

    updateSharedSelectionControls(selectedCount, displayCount, 'cookies');
  }

  function updateStorageSelectionControls(filteredItems, displayCount) {
    const filteredStorageKeys = filteredItems.map(storageItemKey);
    const selectedFilteredCount = filteredStorageKeys.filter((key) => selectedStorageKeys.has(key)).length;
    const selectedCount = getSelectedStorageItems().length;
    const hasItems = filteredStorageKeys.length > 0;

    selectAllStorage.disabled = !hasItems;
    selectAllStorage.checked = hasItems && selectedFilteredCount === filteredStorageKeys.length;
    selectAllStorage.indeterminate = selectedFilteredCount > 0 && selectedFilteredCount < filteredStorageKeys.length;

    updateSharedSelectionControls(selectedCount, displayCount, 'storage items');
  }

  function updateSharedSelectionControls(selectedCount, displayCount, subject) {
    updateViewControls();

    const disabled = selectedCount === 0;
    btnExportMenu.disabled = false;
    btnExportJson.disabled = disabled;
    btnExportNetscape.disabled = disabled;
    btnExportEncrypted.disabled = disabled;
    btnExportText.disabled = disabled;
    btnExportJs.disabled = disabled;
    btnExportMigrate.disabled = false;
    btnDeleteSelected.hidden = selectedCount < 2;
    btnDeleteSelected.title = selectedCount >= 2
      ? `Delete ${selectedCount.toLocaleString()} selected ${subject}`
      : `Select at least 2 ${subject} to delete`;
    btnDeleteSelected.setAttribute('aria-label', btnDeleteSelected.title);

    shownCount.textContent = `${selectedCount.toLocaleString()}/${displayCount.toLocaleString()}`;
    shownCount.title = `${selectedCount.toLocaleString()} selected / ${displayCount.toLocaleString()} visible`;
  }

  function toggleDropdown(trigger) {
    const dropdown = trigger.closest('.action-dropdown');
    const isOpen = dropdown.classList.contains('is-open');

    closeDropdowns(dropdown);
    dropdown.classList.toggle('is-open', !isOpen);
    trigger.setAttribute('aria-expanded', String(!isOpen));
  }

  function closeDropdowns(exceptDropdown = null) {
    document.querySelectorAll('.action-dropdown.is-open').forEach((dropdown) => {
      if (dropdown === exceptDropdown) return;

      dropdown.classList.remove('is-open');
      dropdown.querySelector('[data-dropdown-trigger]')?.setAttribute('aria-expanded', 'false');
    });
  }

  function createCopyLine(text, textClassName, ariaLabel, successMessage) {
    const line = document.createElement('div');
    line.className = 'cookie-line';

    const value = String(text);
    const label = document.createElement('span');
    label.className = textClassName;
    label.textContent = value;
    label.title = value;

    const button = document.createElement('button');
    button.className = 'copy-field-btn';
    button.type = 'button';
    button.appendChild(createSvgIcon('copy'));
    button.title = ariaLabel;
    button.setAttribute('aria-label', ariaLabel);
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      try {
        await copyToClipboard(value);
        showStatus(successMessage);
      } catch (err) {
        console.error(err);
        showStatus('Could not copy text', 'error');
      }
    });

    line.append(label, button);
    return line;
  }

  function createFlagIcon(type, tooltip) {
    const flag = document.createElement('span');
    flag.className = `flag-icon ${type}`;
    flag.appendChild(createSvgIcon(type));
    flag.dataset.tooltip = tooltip;
    flag.title = tooltip;
    flag.setAttribute('aria-label', tooltip);
    flag.tabIndex = 0;
    return flag;
  }

  function formatSameSite(value) {
    const labels = {
      lax: 'Lax',
      strict: 'Strict',
      no_restriction: 'None'
    };
    return labels[String(value).toLowerCase()] || value;
  }

  async function deleteCookie(cookie) {
    try {
      if (!hasChromeApi) {
        currentCookies = currentCookies.filter((item) => {
          return !(item.name === cookie.name && item.domain === cookie.domain && item.path === cookie.path);
        });
        selectedCookieKeys.delete(cookieKey(cookie));
        pruneSelection();
        renderCookies();
        showStatus('Cookie removed in preview');
        return;
      }

      await removeCookieFromStore(cookie);
      showStatus('Cookie deleted');
      loadCookies();
    } catch (err) {
      console.error(err);
      showStatus('Could not delete cookie', 'error');
    }
  }

  function openDeleteSelectedModal() {
    if (activeView === 'storage') {
      const selectedItems = getSelectedStorageItems();
      if (selectedItems.length < 2) return showStatus('Select at least 2 storage items to delete', 'error');

      confirmModalMessage.textContent = `This will delete ${selectedItems.length.toLocaleString()} selected storage items. This action cannot be undone.`;
      btnConfirmDelete.textContent = 'Delete Items';
      openConfirmModal();
      return;
    }

    const selectedCookies = getSelectedCookies();
    if (selectedCookies.length < 2) return showStatus('Select at least 2 cookies to delete', 'error');

    confirmModalMessage.textContent = `This will delete ${selectedCookies.length.toLocaleString()} selected cookies. This action cannot be undone.`;
    btnConfirmDelete.textContent = 'Delete Cookies';
    openConfirmModal();
  }

  async function deleteSelectedCookies() {
    if (activeView === 'storage') {
      await deleteSelectedStorageItems();
      return;
    }

    const selectedCookies = getSelectedCookies();
    closeConfirmModal();

    if (selectedCookies.length < 2) return showStatus('Select at least 2 cookies to delete', 'error');

    try {
      if (!hasChromeApi) {
        const selectedKeys = new Set(selectedCookies.map(cookieKey));
        currentCookies = currentCookies.filter((cookie) => !selectedKeys.has(cookieKey(cookie)));
        selectedCookieKeys.clear();
        pruneSelection();
        renderCookies();
        showStatus(`Deleted ${selectedCookies.length.toLocaleString()} cookies in preview`);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const cookie of selectedCookies) {
        try {
          const result = await removeCookieFromStore(cookie);
          if (result) successCount++;
          else failCount++;
        } catch (err) {
          console.error(err);
          failCount++;
        }
      }

      selectedCookieKeys.clear();
      showStatus(
        failCount > 0
          ? `Deleted: ${successCount}. Failed: ${failCount}`
          : `Deleted ${successCount.toLocaleString()} cookies`
      );
      loadCookies();
    } catch (err) {
      console.error(err);
      showStatus('Could not delete selected cookies', 'error');
    }
  }

  async function deleteStorageItem(item) {
    try {
      if (!hasChromeApi) {
        currentStorageItems = currentStorageItems.filter((storageItem) => storageItemKey(storageItem) !== storageItemKey(item));
        selectedStorageKeys.delete(storageItemKey(item));
        pruneStorageSelection();
        renderStorage();
        showStatus('Storage item removed in preview');
        return;
      }

      await removeStorageItemFromPage(item);
      showStatus('Storage item deleted');
      loadStorage();
    } catch (err) {
      console.error(err);
      showStatus('Could not delete storage item', 'error');
    }
  }

  async function deleteSelectedStorageItems() {
    const selectedItems = getSelectedStorageItems();
    closeConfirmModal();

    if (selectedItems.length < 2) return showStatus('Select at least 2 storage items to delete', 'error');

    try {
      if (!hasChromeApi) {
        const selectedKeys = new Set(selectedItems.map(storageItemKey));
        currentStorageItems = currentStorageItems.filter((item) => !selectedKeys.has(storageItemKey(item)));
        selectedStorageKeys.clear();
        pruneStorageSelection();
        renderStorage();
        showStatus(`Deleted ${selectedItems.length.toLocaleString()} storage items in preview`);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of selectedItems) {
        try {
          await removeStorageItemFromPage(item);
          successCount++;
        } catch (err) {
          console.error(err);
          failCount++;
        }
      }

      selectedStorageKeys.clear();
      showStatus(
        failCount > 0
          ? `Deleted: ${successCount}. Failed: ${failCount}`
          : `Deleted ${successCount.toLocaleString()} storage items`
      );
      loadStorage();
    } catch (err) {
      console.error(err);
      showStatus('Could not delete selected storage items', 'error');
    }
  }

  async function setStorageItemInPage(item) {
    if (!hasStorageApi) throw new Error('Browser scripting API is unavailable.');
    await executeStorageScript(setStorageOnPage, [
      normalizeStorageType(item.type),
      String(item.key || ''),
      String(item.value ?? '')
    ]);
  }

  async function removeStorageItemFromPage(item) {
    if (!hasStorageApi) throw new Error('Browser scripting API is unavailable.');
    await executeStorageScript(removeStorageOnPage, [
      normalizeStorageType(item.type),
      String(item.key || '')
    ]);
  }

  async function removeCookieFromStore(cookie) {
    const removeOptions = {
      url: cookieToUrl(cookie),
      name: cookie.name
    };
    if (cookie.storeId) removeOptions.storeId = cookie.storeId;

    return chromeApi.cookies.remove(removeOptions);
  }

  function cookieToUrl(cookie) {
    let domain = cookie.domain || currentDomain;
    if (!domain) throw new Error('Cookie domain is missing.');
    if (domain.startsWith('.')) domain = domain.substring(1);
    const protocol = cookie.secure || currentProtocol === 'https:' ? 'https://' : 'http://';
    return `${protocol}${domain}${cookie.path || '/'}`;
  }

  function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);

    if (chromeApi?.downloads?.download) {
      chromeApi.downloads.download({ url: objectUrl, filename, saveAs: true });
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function createExportFilename(extension, cookieCount, encrypted = false) {
    const domain = sanitizeFilenamePart(currentDomain || 'global');
    const countLabel = `${cookieCount}_${cookieCount === 1 ? 'cookie' : 'cookies'}`;
    const encryptedSuffix = encrypted ? '_encrypted' : '';
    return `hadesker_${domain}_${countLabel}_${formatExportTimestamp()}${encryptedSuffix}.${extension}`;
  }

  function createStorageExportFilename(extension, itemCount) {
    const domain = sanitizeFilenamePart(currentDomain || currentOrigin || 'global');
    const countLabel = `${itemCount}_${itemCount === 1 ? 'storage_item' : 'storage_items'}`;
    return `hadesker_${domain}_${countLabel}_${formatExportTimestamp()}.${extension}`;
  }

  function exportStorageJson() {
    const selectedItems = getSelectedStorageItems();
    if (selectedItems.length === 0) return showStatus('Select storage items to export', 'error');

    const jsonOutput = JSON.stringify(createStorageExportPayload(selectedItems), null, 2);
    const filename = createStorageExportFilename('json', selectedItems.length);
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    downloadBlob(blob, filename);
    showStatus(`Exported ${selectedItems.length} storage items`);
  }

  function createStorageExportPayload(items) {
    return {
      format: STORAGE_EXPORT_FORMAT,
      version: 1,
      origin: currentOrigin || '',
      exportedAt: new Date().toISOString(),
      items: items.map((item) => ({
        type: normalizeStorageType(item.type),
        key: String(item.key || ''),
        value: String(item.value ?? '')
      }))
    };
  }

  function createMigrateExportFilename() {
    const domain = sanitizeFilenamePart(currentDomain || currentOrigin || 'global');
    return `hadesker_${domain}_migrate_${formatExportTimestamp()}.mcmp`;
  }

  async function exportMigrationData() {
    try {
      const snapshot = await collectMigrationSnapshot();
      const payload = createMigrationPayload(snapshot);
      const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/octet-stream' });
      downloadBlob(blob, createMigrateExportFilename());
      showStatus(`Exported migration: ${snapshot.cookies.length} cookies, ${snapshot.storageItems.length} storage items`);
    } catch (err) {
      console.error(err);
      showStatus(err.message ? `Could not export migration: ${err.message}` : 'Could not export migration', 'error');
    }
  }

  async function collectMigrationSnapshot() {
    if (!hasChromeApi) {
      return {
        source: {
          domain: currentDomain || 'preview.local',
          origin: currentOrigin || 'https://preview.local'
        },
        cookies: currentCookies.length ? currentCookies : getPreviewCookies(),
        storageItems: currentStorageItems.length ? currentStorageItems : getPreviewStorageItems(),
        storageErrors: []
      };
    }

    const [tab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !/^https?:\/\//i.test(tab.url)) {
      throw new Error('Open an http/https page before exporting migration data.');
    }

    const url = new URL(tab.url);
    currentTabId = tab.id;
    currentDomain = url.hostname;
    currentOrigin = url.origin;
    currentProtocol = url.protocol;
    domainInfo.textContent = `Origin: ${currentOrigin}`;

    const cookies = await getCookiesForTab(tab, url);
    const storageResult = hasStorageApi
      ? await executeStorageScript(readStorageFromPage)
      : { items: [], errors: ['storage: browser script injection API is unavailable'] };

    return {
      source: {
        domain: currentDomain || '',
        origin: currentOrigin || '',
        url: url.href
      },
      cookies,
      storageItems: normalizePageStorageItems(storageResult?.items || []),
      storageErrors: storageResult?.errors || []
    };
  }

  function createMigrationPayload(snapshot) {
    return {
      format: MIGRATE_EXPORT_FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      source: snapshot.source,
      cookies: snapshot.cookies,
      storage: {
        origin: snapshot.source.origin || '',
        items: snapshot.storageItems
      },
      warnings: snapshot.storageErrors
    };
  }

  function sanitizeFilenamePart(value) {
    const cleaned = String(value || '')
      .trim()
      .replace(/^\.+|\.+$/g, '')
      .replace(/[^a-z0-9.-]+/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    return cleaned || 'global';
  }

  function formatExportTimestamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());

    return `${year}${month}${day}_${hour}${minute}${second}`;
  }

  btnExportJson.addEventListener('click', () => {
    if (activeView === 'storage') {
      exportStorageJson();
      return;
    }

    const selectedCookies = getSelectedCookies();
    if (selectedCookies.length === 0) return showStatus('Select cookies to export', 'error');

    const jsonOutput = JSON.stringify(selectedCookies, null, 2);
    const filename = createExportFilename('json', selectedCookies.length);
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    downloadBlob(blob, filename);
    showStatus(`Exported ${selectedCookies.length} cookies`);
  });

  btnExportMigrate.addEventListener('click', () => {
    exportMigrationData();
  });

  btnExportNetscape.addEventListener('click', () => {
    const selectedCookies = getSelectedCookies();
    if (selectedCookies.length === 0) return showStatus('Select cookies to export', 'error');

    const netscapeOutput = generateNetscapeCookieFile(selectedCookies);
    const filename = createExportFilename('txt', selectedCookies.length);
    const blob = new Blob([netscapeOutput], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, filename);
    showStatus(`Exported ${selectedCookies.length} Netscape cookies`);
  });

  btnExportEncrypted.addEventListener('click', async () => {
    if (activeView === 'storage') return showStatus('Encrypted export is only available for cookies', 'error');

    const selectedCookies = getSelectedCookies();
    if (selectedCookies.length === 0) return showStatus('Select cookies to export', 'error');

    const password = await requestEncryptionPassword('export');
    if (!password) return;

    try {
      const encryptedOutput = await encryptCookieData(JSON.stringify(selectedCookies, null, 2), password);
      const filename = createExportFilename('cmp', selectedCookies.length, true);
      const blob = new Blob([encryptedOutput], { type: 'application/octet-stream' });
      downloadBlob(blob, filename);
      showStatus(`Exported ${selectedCookies.length} encrypted cookies`);
    } catch (err) {
      console.error(err);
      showStatus('Could not encrypt cookie file', 'error');
    }
  });

  btnExportText.addEventListener('click', () => {
    if (activeView === 'storage') {
      const selectedItems = getSelectedStorageItems();
      if (selectedItems.length === 0) return showStatus('Select storage items to copy', 'error');

      modalTitle.textContent = 'Selected Storage (JSON)';
      modalTextarea.value = JSON.stringify(createStorageExportPayload(selectedItems), null, 2);
      modalTextarea.readOnly = true;
      btnModalCopy.style.display = 'inline-flex';
      btnModalImport.style.display = 'none';
      openModal();
      return;
    }

    const selectedCookies = getSelectedCookies();
    if (selectedCookies.length === 0) return showStatus('Select cookies to copy', 'error');

    modalTitle.textContent = 'Selected Cookies (JSON)';
    modalTextarea.value = JSON.stringify(selectedCookies, null, 2);
    modalTextarea.readOnly = true;
    btnModalCopy.style.display = 'inline-flex';
    btnModalImport.style.display = 'none';
    openModal();
  });

  btnExportJs.addEventListener('click', () => {
    if (activeView === 'storage') {
      const selectedItems = getSelectedStorageItems();
      if (selectedItems.length === 0) return showStatus('Select storage items to copy', 'error');

      modalTitle.textContent = 'Browser Console Storage JS';
      modalTextarea.value = generateStorageConsoleImportScript(selectedItems);
      modalTextarea.readOnly = true;
      btnModalCopy.style.display = 'inline-flex';
      btnModalImport.style.display = 'none';
      openModal();
      return;
    }

    const selectedCookies = getSelectedCookies();
    if (selectedCookies.length === 0) return showStatus('Select cookies to copy', 'error');

    modalTitle.textContent = 'Browser Console Import JS';
    modalTextarea.value = generateConsoleImportScript(selectedCookies);
    modalTextarea.readOnly = true;
    btnModalCopy.style.display = 'inline-flex';
    btnModalImport.style.display = 'none';
    openModal();
  });

  function generateNetscapeCookieFile(cookies) {
    const lines = [
      '# Netscape HTTP Cookie File',
      '# Generated by Cookie & Storage Toolkit',
      '# Domain\tIncludeSubdomains\tPath\tSecure\tExpires\tName\tValue',
      ''
    ];

    cookies.forEach((cookie) => {
      const rawDomain = String(cookie.domain || currentDomain || '');
      const includeSubdomains = rawDomain.startsWith('.') || cookie.hostOnly === false;
      const domain = includeSubdomains && rawDomain && !rawDomain.startsWith('.')
        ? `.${rawDomain}`
        : rawDomain;
      const exportedDomain = `${cookie.httpOnly ? '#HttpOnly_' : ''}${toNetscapeField(domain)}`;
      const expires = cookie.expirationDate ? Math.floor(Number(cookie.expirationDate)) : 0;
      const fields = [
        exportedDomain,
        formatNetscapeBoolean(includeSubdomains),
        toNetscapeField(cookie.path || '/'),
        formatNetscapeBoolean(Boolean(cookie.secure)),
        Number.isFinite(expires) && expires > 0 ? String(expires) : '0',
        toNetscapeField(cookie.name || ''),
        toNetscapeField(cookie.value || '')
      ];

      lines.push(fields.join('\t'));
    });

    return `${lines.join('\n')}\n`;
  }

  function formatNetscapeBoolean(value) {
    return value ? 'TRUE' : 'FALSE';
  }

  function toNetscapeField(value) {
    return String(value ?? '').replace(/[\r\n\t]/g, ' ');
  }

  function requestEncryptionPassword(action) {
    closeDropdowns();

    return new Promise((resolve) => {
      pendingPasswordResolve = resolve;
      openPasswordModal(action);
    });
  }

  async function encryptCookieData(content, password) {
    ensureWebCrypto();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveEncryptionKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(content)
    );
    const envelope = {
      format: ENCRYPTED_FILE_FORMAT,
      version: 1,
      cipher: 'AES-GCM',
      kdf: 'PBKDF2-SHA-256',
      iterations: ENCRYPTION_ITERATIONS,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted))
    };

    return `${JSON.stringify(envelope, null, 2)}\n`;
  }

  async function decryptCookieData(content, password) {
    ensureWebCrypto();
    const envelope = JSON.parse(content);

    if (
      envelope.format !== ENCRYPTED_FILE_FORMAT ||
      envelope.version !== 1 ||
      envelope.cipher !== 'AES-GCM' ||
      envelope.kdf !== 'PBKDF2-SHA-256'
    ) {
      throw new Error('Unsupported encrypted cookie file.');
    }

    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const data = base64ToBytes(envelope.data);
    const iterations = Number(envelope.iterations);

    if (!Number.isInteger(iterations) || iterations < 100000) {
      throw new Error('Unsupported encryption settings.');
    }

    const key = await deriveEncryptionKey(password, salt, iterations);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  }

  async function deriveEncryptionKey(password, salt, iterations = ENCRYPTION_ITERATIONS) {
    if (!password) throw new Error('Password is required.');

    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  function ensureWebCrypto() {
    if (!globalThis.crypto?.subtle) {
      throw new Error('WebCrypto is unavailable.');
    }
  }

  function bytesToBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || ''));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  function generateConsoleImportScript(cookies) {
    const payload = cookies.map((cookie) => ({
      name: cookie.name || '',
      value: cookie.value || '',
      domain: cookie.domain || '',
      path: cookie.path || '/',
      secure: Boolean(cookie.secure),
      httpOnly: Boolean(cookie.httpOnly),
      hostOnly: Boolean(cookie.hostOnly),
      sameSite: cookie.sameSite || '',
      expirationDate: cookie.expirationDate || null
    }));
    const payloadJson = JSON.stringify(payload, null, 2).replace(/\n/g, '\n  ');

    return [
      '(() => {',
      '  // Run this on the target domain. document.cookie cannot create HttpOnly cookies.',
      `  const cookies = ${payloadJson};`,
      "  const sameSiteMap = { no_restriction: 'None', lax: 'Lax', strict: 'Strict' };",
      '  const skipped = [];',
      '  let imported = 0;',
      '',
      '  for (const cookie of cookies) {',
      "    const name = String(cookie.name || '');",
      "    const value = String(cookie.value || '');",
      '',
      '    if (cookie.httpOnly) {',
      "      skipped.push((name || '(unnamed)') + ' (HttpOnly)');",
      '      continue;',
      '    }',
      '',
      '    if (!name || /[=;\\s]/.test(name) || /[;\\r\\n]/.test(value)) {',
      "      skipped.push((name || '(unnamed)') + ' (unsupported cookie characters)');",
      '      continue;',
      '    }',
      '',
      "    const parts = [name + '=' + value];",
      "    if (cookie.path) parts.push('Path=' + cookie.path);",
      "    if (cookie.domain && !cookie.hostOnly) parts.push('Domain=' + cookie.domain);",
      '    if (cookie.expirationDate) {',
      "      parts.push('Expires=' + new Date(cookie.expirationDate * 1000).toUTCString());",
      '    }',
      "    if (cookie.secure) parts.push('Secure');",
      "    const sameSite = sameSiteMap[String(cookie.sameSite || '').toLowerCase()];",
      "    if (sameSite) parts.push('SameSite=' + sameSite);",
      '',
      "    document.cookie = parts.join('; ');",
      '    imported += 1;',
      '  }',
      '',
      "  console.log('Cookie import attempted for ' + imported + '/' + cookies.length + ' cookies.');",
      '  if (skipped.length) {',
      "    console.warn('Skipped cookies: ' + skipped.join(', '));",
      "    console.warn('Tip: run on a matching domain/protocol; HttpOnly cookies require an extension/API import.');",
      '  }',
      '})();'
    ].join('\n');
  }

  function generateStorageConsoleImportScript(items) {
    const payload = items.map((item) => ({
      type: normalizeStorageType(item.type),
      key: String(item.key || ''),
      value: String(item.value ?? '')
    }));
    const payloadJson = JSON.stringify(payload, null, 2).replace(/\n/g, '\n  ');

    return [
      '(() => {',
      '  // Run this on the target origin.',
      `  const items = ${payloadJson};`,
      '  let imported = 0;',
      '',
      '  for (const item of items) {',
      "    const store = item.type === 'session' ? sessionStorage : localStorage;",
      "    const key = String(item.key || '');",
      '    if (!key) continue;',
      '    store.setItem(key, String(item.value ?? ""));',
      '    imported += 1;',
      '  }',
      '',
      "  console.log('Storage import completed for ' + imported + '/' + items.length + ' items.');",
      '})();'
    ].join('\n');
  }

  btnModalCopy.addEventListener('click', async () => {
    try {
      await copyToClipboard(modalTextarea.value);
      showStatus('Copied to clipboard');
      closeModal();
    } catch (err) {
      console.error(err);
      showStatus('Could not copy text', 'error');
    }
  });

  async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  btnImportJsonFile.addEventListener('click', () => fileInput.click());
  btnImportEncryptedFile.addEventListener('click', () => encryptedFileInput.click());
  btnImportMigrateFile.addEventListener('click', () => migrateFileInput.click());
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const importMode = activeView;

    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
      if (importMode === 'storage') await processStorageImport(readerEvent.target.result);
      else await processImport(readerEvent.target.result);
      fileInput.value = '';
    };
    reader.onerror = () => showStatus('Error reading file', 'error');
    reader.readAsText(file);
  });

  encryptedFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const password = await requestEncryptionPassword('import');
    if (!password) {
      encryptedFileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
      await processEncryptedImport(readerEvent.target.result, password);
      encryptedFileInput.value = '';
    };
    reader.onerror = () => showStatus('Error reading encrypted file', 'error');
    reader.readAsText(file);
  });

  migrateFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.mcmp')) {
      showStatus('Please choose a .mcmp migration file', 'error');
      migrateFileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
      await processMigrationImport(readerEvent.target.result);
      migrateFileInput.value = '';
    };
    reader.onerror = () => showStatus('Error reading migration file', 'error');
    reader.readAsText(file);
  });

  btnImportText.addEventListener('click', () => {
    textModalImportMode = activeView;
    modalTitle.textContent = activeView === 'storage'
      ? 'Paste Storage JSON'
      : 'Paste JSON or Netscape Cookies';
    modalTextarea.value = '';
    modalTextarea.readOnly = false;
    btnModalCopy.style.display = 'none';
    btnModalImport.style.display = 'inline-flex';
    openModal();
  });

  btnModalImport.addEventListener('click', async () => {
    const content = modalTextarea.value;
    if (!content.trim()) return showStatus('Please enter data to import', 'error');

    closeModal();
    if (textModalImportMode === 'storage') await processStorageImport(content);
    else await processImport(content);
  });

  async function processImport(content) {
    try {
      const cookies = parseCookieImport(content);
      await importCookies(cookies);
    } catch (err) {
      console.error(err);
      showStatus('Import error: Invalid cookie data', 'error');
    }
  }

  async function processEncryptedImport(content, password) {
    try {
      const decryptedContent = await decryptCookieData(content, password);
      const cookies = parseCookieImport(decryptedContent);
      await importCookies(cookies);
    } catch (err) {
      console.error(err);
      showStatus('Encrypted import error: Invalid password or file', 'error');
    }
  }

  async function processStorageImport(content) {
    try {
      const items = parseStorageImport(content);
      await importStorageItems(items);
    } catch (err) {
      console.error(err);
      showStatus('Import error: Invalid storage data', 'error');
    }
  }

  async function processMigrationImport(content) {
    try {
      const migration = parseMigrationImport(content);
      const cookieResult = await importCookies(migration.cookies, { silent: true, reload: false });
      const storageResult = await importStorageItems(migration.storageItems, { silent: true, reload: false });
      selectedCookieKeys.clear();
      selectedStorageKeys.clear();
      showStatus(`Migration imported: ${cookieResult.successCount} cookies, ${storageResult.successCount} storage items`);
      loadActiveView();
    } catch (err) {
      console.error(err);
      showStatus(err.message ? `Migration import error: ${err.message}` : 'Migration import error', 'error');
    }
  }

  async function importCookies(cookies, options = {}) {
    if (!hasChromeApi) {
      currentCookies = cookies.map(normalizeImportedCookie);
      selectedCookieKeys.clear();
      renderCookies();
      if (!options.silent) showStatus(`Imported preview cookies: ${currentCookies.length}`);
      return { successCount: currentCookies.length, failCount: 0 };
    }

    let successCount = 0;
    let failCount = 0;

    for (const cookie of cookies) {
      try {
        const newCookie = normalizeImportedCookie(cookie);
        const result = await chromeApi.cookies.set(newCookie);
        if (result) successCount++;
        else failCount++;
      } catch (err) {
        console.error(err);
        failCount++;
      }
    }

    selectedCookieKeys.clear();
    if (!options.silent) showStatus(`Imported: ${successCount}. Failed: ${failCount}`);
    if (options.reload !== false) loadCookies();
    return { successCount, failCount };
  }

  async function importStorageItems(items, options = {}) {
    const normalizedItems = items.map(normalizeImportedStorageItem);

    if (!hasChromeApi) {
      normalizedItems.forEach((item) => upsertPreviewStorageItem(item));
      selectedStorageKeys.clear();
      renderStorage();
      if (!options.silent) showStatus(`Imported preview storage items: ${normalizedItems.length}`);
      return { successCount: normalizedItems.length, failCount: 0 };
    }

    let successCount = 0;
    let failCount = 0;

    for (const item of normalizedItems) {
      try {
        await setStorageItemInPage(item);
        successCount++;
      } catch (err) {
        console.error(err);
        failCount++;
      }
    }

    selectedStorageKeys.clear();
    if (!options.silent) showStatus(`Imported storage: ${successCount}. Failed: ${failCount}`);
    if (options.reload !== false) loadStorage();
    return { successCount, failCount };
  }

  function parseCookieImport(content) {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Cookie data is empty.');

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.cookies)) return parsed.cookies;
      throw new Error('Expected an array of cookies.');
    }

    return parseNetscapeCookieFile(content);
  }

  function parseStorageImport(content) {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Storage data is empty.');

    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.items)) return parsed.items;

    const items = [];
    collectStorageItems(items, 'local', parsed.localStorage);
    collectStorageItems(items, 'session', parsed.sessionStorage);

    if (items.length > 0) return items;
    throw new Error('Expected storage items.');
  }

  function parseMigrationImport(content) {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Migration file is empty.');

    const parsed = JSON.parse(trimmed);
    if (
      parsed.version !== 1 ||
      parsed.format !== MIGRATE_EXPORT_FORMAT
    ) {
      throw new Error('Unsupported migration file.');
    }

    return {
      cookies: Array.isArray(parsed.cookies) ? parsed.cookies : [],
      storageItems: Array.isArray(parsed.storage?.items)
        ? parsed.storage.items
        : Array.isArray(parsed.storageItems)
          ? parsed.storageItems
          : []
    };
  }

  function collectStorageItems(items, type, value) {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (Array.isArray(entry)) {
          items.push({ type, key: entry[0], value: entry[1] });
        } else {
          items.push({ type, ...entry });
        }
      });
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, itemValue]) => {
        items.push({ type, key, value: itemValue });
      });
    }
  }

  function parseNetscapeCookieFile(content) {
    const cookies = [];
    const lines = content.split(/\n/);

    lines.forEach((rawLine, index) => {
      let line = rawLine.replace(/\r$/, '').trimStart();
      if (!line.trim()) return;

      let httpOnly = false;
      if (line.startsWith('#HttpOnly_')) {
        httpOnly = true;
        line = line.slice('#HttpOnly_'.length);
      } else if (line.startsWith('#')) {
        return;
      }

      const fields = line.split('\t');
      if (fields.length < 7) {
        throw new Error(`Invalid Netscape cookie line ${index + 1}.`);
      }

      const [domainField, includeSubdomainsField, pathField, secureField, expiresField, nameField, ...valueParts] = fields;
      const includeSubdomains = parseNetscapeBoolean(includeSubdomainsField) || domainField.startsWith('.');
      const domain = includeSubdomains
        ? ensureLeadingDot(domainField)
        : domainField.replace(/^\./, '');
      const name = String(nameField || '');

      if (!domain || !name) {
        throw new Error(`Invalid Netscape cookie line ${index + 1}.`);
      }

      const cookie = {
        name,
        value: valueParts.join('\t'),
        domain,
        path: pathField || '/',
        secure: parseNetscapeBoolean(secureField),
        httpOnly,
        hostOnly: !includeSubdomains
      };
      const expires = Number(expiresField);

      if (Number.isFinite(expires) && expires > 0) {
        cookie.expirationDate = Math.floor(expires);
      }

      cookies.push(cookie);
    });

    if (cookies.length === 0) {
      throw new Error('No Netscape cookies found.');
    }

    return cookies;
  }

  function parseNetscapeBoolean(value) {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'TRUE') return true;
    if (normalized === 'FALSE') return false;
    throw new Error(`Invalid Netscape boolean: ${value}`);
  }

  function ensureLeadingDot(domain) {
    const cleanDomain = String(domain || '').trim();
    if (!cleanDomain || cleanDomain.startsWith('.')) return cleanDomain;
    return `.${cleanDomain}`;
  }

  function normalizeImportedCookie(cookie) {
    const normalized = {
      url: cookieToUrl(cookie),
      name: String(cookie.name || ''),
      value: String(cookie.value || ''),
      path: cookie.path || '/',
      secure: Boolean(cookie.secure),
      httpOnly: Boolean(cookie.httpOnly)
    };

    if (cookie.domain && cookie.hostOnly !== true) normalized.domain = cookie.domain;
    if (cookie.sameSite) normalized.sameSite = cookie.sameSite;
    if (cookie.storeId) normalized.storeId = cookie.storeId;
    if (cookie.expirationDate) normalized.expirationDate = cookie.expirationDate;

    return normalized;
  }

  function normalizePageStorageItems(items) {
    return items.map(normalizeImportedStorageItem).filter((item) => item.key);
  }

  function normalizeImportedStorageItem(item) {
    const normalized = {
      type: normalizeStorageType(item.type),
      key: String(item.key || ''),
      value: String(item.value ?? '')
    };

    if (!normalized.key) throw new Error('Storage key is required.');
    return normalized;
  }

  function normalizeStorageType(type) {
    return type === 'session' || type === 'sessionStorage' ? 'session' : 'local';
  }

  function getStorageTypeLabel(type) {
    return normalizeStorageType(type) === 'session' ? 'sessionStorage' : 'localStorage';
  }

  function getStorageTypeShortLabel(type) {
    return normalizeStorageType(type) === 'session' ? 'SS' : 'LS';
  }

  if (hasChromeApi) {
    chromeApi.tabs.onActivated.addListener(() => loadActiveView());
    chromeApi.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'complete') loadActiveView();
    });
  }

  updateViewControls();
  loadActiveView();
});
