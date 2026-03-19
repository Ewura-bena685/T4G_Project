/**
 * FRAU ROT - Application Script
 * Multi-page navigation, form handling, and user interactions
 */

// ============================================
// PERSISTENCE (LocalStorage + session state)
// ============================================

const STORAGE_KEY = 'frau-rot-state-v1';
let appState = loadState();

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { users: {}, session: {} };

  try {
    return JSON.parse(stored);
  } catch (err) {
    console.warn('Failed to parse local storage state; resetting.', err);
    return { users: {}, session: {} };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function getCurrentUserEmail() {
  return appState.session?.currentUserEmail || null;
}

function setCurrentUserEmail(email) {
  appState.session = { currentUserEmail: email };
  saveState();
}

function clearCurrentUser() {
  appState.session = {};
  saveState();
}

function getCurrentUser() {
  const email = getCurrentUserEmail();
  return email ? appState.users?.[email] : null;
}

function setCurrentUserData(user) {
  if (!user || !user.email) return;
  appState.users = appState.users || {};
  appState.users[user.email] = user;
  saveState();
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createUser(email, password) {
  email = email.trim().toLowerCase();
  if (!email || !validateEmail(email)) {
    throw new Error('Please provide a valid email address.');
  }
  if (!password) {
    throw new Error('Please provide a password.');
  }
  if (appState.users?.[email]) {
    throw new Error('An account with that email already exists.');
  }

  const passwordHash = await hashPassword(password);
  const newUser = {
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
    profile: {
      name: email.split('@')[0] || '',
    },
    preferences: {
      cycleLength: null,
    },
    logs: {
      periods: [],
    },
  };

  setCurrentUserEmail(email);
  setCurrentUserData(newUser);
  return newUser;
}

async function authenticateUser(email, password) {
  email = email.trim().toLowerCase();
  const user = appState.users?.[email];
  if (!user) {
    throw new Error('No account found with that email.');
  }
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) {
    throw new Error('Incorrect password.');
  }

  setCurrentUserEmail(email);
  return user;
}

function logout() {
  clearCurrentUser();
  navigateTo('hero-page');
}

function getUserCycleLength() {
  const user = getCurrentUser();
  return user?.preferences?.cycleLength || null;
}

function saveCycleLength(length) {
  const user = getCurrentUser();
  if (!user) return;
  user.preferences = user.preferences || {};
  user.preferences.cycleLength = Number(length);
  setCurrentUserData(user);
}

function addPeriodEntry(date, flow) {
  const user = getCurrentUser();
  if (!user) return;
  user.logs = user.logs || { periods: [] };
  user.logs.periods = user.logs.periods || [];
  user.logs.periods.push({
    date,
    flow,
    createdAt: new Date().toISOString(),
  });
  setCurrentUserData(user);
}

function getPeriodEntries() {
  const user = getCurrentUser();
  return user?.logs?.periods || [];
}

function renderCurrentUser() {
  const user = getCurrentUser();

  const welcomeName = document.getElementById('dashboard-welcome-name');
  if (welcomeName) {
    welcomeName.textContent = user?.profile?.name || 'Friend';
  }

  const profileNameInput = document.getElementById('profile-name');
  if (profileNameInput) {
    profileNameInput.value = user?.profile?.name || '';
  }

  const profileEmailInput = document.getElementById('profile-email');
  if (profileEmailInput) {
    profileEmailInput.value = user?.email || '';
  }

  const profileCycleLength = document.getElementById('profile-cycle-length');
  if (profileCycleLength && user?.preferences?.cycleLength) {
    profileCycleLength.value = String(user.preferences.cycleLength);
  }

  hydrateCycleLengthSelection();
  renderLogs();
}

function hydrateCycleLengthSelection() {
  const storedLength = getUserCycleLength();
  if (!storedLength) return;

  const container = document.getElementById('cycle-length-chips');
  if (!container) return;

  const chips = container.querySelectorAll('.chip');
  chips.forEach(chip => chip.classList.remove('active'));

  const match = Array.from(chips).find(chip => chip.textContent.trim() === `${storedLength} days`);
  if (match) {
    match.classList.add('active');
    const btn = document.getElementById('cycle-continue-btn');
    if (btn) btn.disabled = false;
  }
}

function renderLogs() {
  const container = document.getElementById('logs-timeline');
  if (!container) return;

  const entries = getPeriodEntries().slice().reverse();
  if (!entries.length) {
    container.innerHTML = '<p class="empty-state">No entries yet. Log a period to see them here.</p>';
    return;
  }

  container.innerHTML = entries.map(entry => `
    <div class="log-entry">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span><strong>Date:</strong> ${entry.date}</span>
        <span><strong>Flow:</strong> ${entry.flow}</span>
      </div>
      <p style="margin: 4px 0 0; font-size: 12px; color: #666;">Recorded ${new Date(entry.createdAt).toLocaleString()}</p>
    </div>
  `).join('');
}

// ============================================
// CALENDAR GENERATION
// ============================================

let currentCalendarMonth = new Date();

function getLastPeriodDate() {
  const entries = getPeriodEntries();
  if (!entries.length) return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days ago
  const lastEntry = entries[entries.length - 1];
  return new Date(lastEntry.date);
}

function getUserCycleInfo() {
  const user = getCurrentUser();
  const cycleLength = user?.preferences?.cycleLength || 28;
  const lastPeriodDate = getLastPeriodDate();
  return { cycleLength, lastPeriodDate };
}

function getPhaseInfo(dateInCycle, cycleLength) {
  // Typical cycle breakdown: menstrual (1-5), follicular (6-13), ovulation (14-15), luteal (16-28)
  const menstrualDays = 5;
  const follicularDays = 8;
  const ovulationDays = 2;

  if (dateInCycle >= 1 && dateInCycle <= menstrualDays) {
    return { phase: 'menstrual', label: 'Menstrual Phase', fertile: false };
  } else if (dateInCycle > menstrualDays && dateInCycle <= menstrualDays + follicularDays) {
    return { phase: 'follicular', label: 'Follicular Phase', fertile: false };
  } else if (dateInCycle > menstrualDays + follicularDays && dateInCycle <= menstrualDays + follicularDays + ovulationDays) {
    return { phase: 'ovulation', label: 'Ovulation (High Fertility)', fertile: true };
  } else {
    return { phase: 'luteal', label: 'Luteal Phase', fertile: false };
  }
}

function getDayInCycle(date, lastPeriodDate, cycleLength) {
  const diff = Math.floor((date - lastPeriodDate) / (1000 * 60 * 60 * 24)) + 1;
  if (diff < 1) return null; // Before cycle started
  return ((diff - 1) % cycleLength) + 1;
}

function generateCalendarHTML(year, month) {
  const { cycleLength, lastPeriodDate } = getUserCycleInfo();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  let html = '<div class="calendar-grid">';

  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdays.forEach(day => {
    html += `<div class="calendar-weekday">${day}</div>`;
  });

  // Empty cells before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    html += '<div></div>';
  }

  // Days of the month
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayInCycle = getDayInCycle(date, lastPeriodDate, cycleLength);
    const isToday = date.toDateString() === today.toDateString();

    let classList = 'calendar-date';
    let phaseHTML = '';
    let title = `${date.toDateString()}`;

    if (dayInCycle !== null) {
      const phaseInfo = getPhaseInfo(dayInCycle, cycleLength);
      classList += ` phase-${phaseInfo.phase}`;
      if (phaseInfo.fertile) {
        classList += ' fertile';
        phaseHTML = '<i class="fas fa-egg" style="font-size: 12px;"></i> ';
      }
      title = `Day ${dayInCycle} - ${phaseInfo.label}`;
    }

    if (isToday) {
      classList += ' today';
    }

    html += `<div class="${classList}" title="${title}">${phaseHTML}${day}</div>`;
  }

  html += '</div>';
  return html;
}

function renderCalendar(year, month) {
  const container = document.getElementById('calendar-grid-container');
  if (!container) return;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const title = document.getElementById('calendar-month-title');
  if (title) {
    title.textContent = `${monthNames[month]} ${year}`;
  }

  const calendarHTML = generateCalendarHTML(year, month);
  container.innerHTML = calendarHTML;
  currentCalendarMonth = new Date(year, month, 1);
}

function goToPreviousMonth() {
  const prevMonth = new Date(currentCalendarMonth);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  renderCalendar(prevMonth.getFullYear(), prevMonth.getMonth());
}

function goToNextMonth() {
  const nextMonth = new Date(currentCalendarMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  renderCalendar(nextMonth.getFullYear(), nextMonth.getMonth());
}

// ============================================
// NAVBAR MOBILE MENU
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Multiple navbars exist across sections, so pair each toggle with its own menu.
  const navbars = document.querySelectorAll('.navbar');
  navbars.forEach(navbar => {
    const navbarToggle = navbar.querySelector('.navbar__toggle');
    const navbarMenu = navbar.querySelector('.navbar__menu');

    if (navbarToggle && navbarMenu) {
      navbarToggle.addEventListener('click', function() {
        const isOpen = navbarMenu.classList.toggle('active');
        navbarToggle.classList.toggle('active', isOpen);
        navbarToggle.setAttribute('aria-expanded', String(isOpen));
      });

      const navLinks = navbarMenu.querySelectorAll('.navbar__link');
      navLinks.forEach(link => {
        link.addEventListener('click', function() {
          navbarMenu.classList.remove('active');
          navbarToggle.classList.remove('active');
          navbarToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  });

  // Keep action links from jumping to top when they are used as JS triggers.
  document.querySelectorAll('a[href="#"][onclick]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
    });
  });

  // Landing page smooth-scrolling for in-page navigation.
  document.querySelectorAll('[data-scroll-target]').forEach(link => {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('data-scroll-target');
      const target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;

      e.preventDefault();
      const heroPage = document.getElementById('hero-page');
      if (heroPage && heroPage.classList.contains('hidden')) {
        navigateTo('hero-page');
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Prevent unexpected submit behavior from buttons without an explicit type.
  document.querySelectorAll('button:not([type])').forEach(button => {
    button.type = 'button';
  });
});

// ============================================
// PAGE NAVIGATION
// ============================================

function navigateTo(pageId) {
  const protectedPages = new Set([
    'dashboard-page',
    'calendar-page',
    'cycle-timeline-page',
    'insights-page',
    'reminders-page',
    'articles-page',
    'logs-page',
    'partner-page',
    'profile-page',
    'add-period-page',
    'welcome-page',
    'cycle-length-page',
  ]);

  const loggedIn = Boolean(getCurrentUser());

  // If a logged-in user returns to the landing page, treat it as a logout action
  if (loggedIn && pageId === 'hero-page') {
    clearCurrentUser();
  }

  // Redirect to login if trying to access a protected page while logged out
  if (protectedPages.has(pageId) && !loggedIn) {
    pageId = 'login-page';
  }

  // Redirect to dashboard if already logged in and trying to access auth pages
  if (loggedIn && (pageId === 'login-page' || pageId === 'signup-page')) {
    pageId = 'dashboard-page';
  }

  // Hide all page sections
  const pages = document.querySelectorAll('.page-section');
  pages.forEach(page => page.classList.add('hidden'));

  // Show target page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  // Update active nav item
  updateActiveNav(pageId);

  // Update data-dependent UI
  renderCurrentUser();

  // Render calendar if on calendar page
  if (pageId === 'calendar-page') {
    renderCalendar(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth());
  }
}

function updateActiveNav(pageId) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  const pageMap = {
    'dashboard-page': 'dashboard',
    'calendar-page': 'calendar',
    'cycle-timeline-page': 'cycle',
    'insights-page': 'insights',
    'reminders-page': 'reminders',
    'articles-page': 'articles',
    'logs-page': 'logs',
    'partner-page': 'partner',
    'profile-page': 'profile'
  };

  const pageType = pageMap[pageId];
  if (pageType) {
    const activeNav = document.querySelector(`[data-page="${pageType}"]`);
    if (activeNav) activeNav.classList.add('active');
  }
}

// ============================================
// CHIP SELECTION
// ============================================

function selectChip(element, category, value) {
  // For single select (cycle-length, add-flow)
  if (category === 'cycle-length' || category === 'add-flow') {
    const siblings = element.parentElement.querySelectorAll('.chip');
    siblings.forEach(chip => chip.classList.remove('active'));
    element.classList.add('active');

    // Enable continue button
    if (category === 'cycle-length') {
      const btn = document.getElementById('cycle-continue-btn');
      if (btn) btn.disabled = false;
      saveCycleLength(value);
    }
  } else {
    // For multi-select (mood, symptoms, etc.)
    element.classList.toggle('active');
  }

  console.log(`Selected ${category}: ${value}`);
}

// ============================================
// FORM HANDLING
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Signup Form
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;
      const passwords = this.querySelectorAll('input[type="password"]');

      if (passwords[0].value !== passwords[1].value) {
        alert('Passwords do not match!');
        return;
      }
      if (!email.trim() || !passwords[0].value.trim() || !passwords[1].value.trim()) {
        alert('Please complete all sign up fields.');
        return;
      }

      try {
        await createUser(email, passwords[0].value);
        console.log('Sign up:', email);
        alert('Account created successfully!');
        navigateTo('welcome-page');
      } catch (err) {
        alert(err.message || 'Unable to create account.');
      }
    });
  }

  // Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;
      const password = this.querySelector('input[type="password"]').value;

      if (!email.trim() || !password.trim()) {
        alert('Please enter both email and password.');
        return;
      }

      try {
        await authenticateUser(email, password);
        console.log('Login:', email);
        alert('Welcome back!');
        navigateTo('dashboard-page');
      } catch (err) {
        alert(err.message || 'Unable to sign in.');
      }
    });
  }

  // Add Period Form
  const addPeriodForm = document.getElementById('add-period-form');
  if (addPeriodForm) {
    addPeriodForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const date = this.querySelector('input[type="date"]').value;
      const flowBtn = this.querySelector('.chip.active');

      if (!flowBtn) {
        alert('Please select a flow level');
        return;
      }

      addPeriodEntry(date, flowBtn.textContent.trim());
      console.log('Period added:', date, flowBtn.textContent.trim());
      alert('Period logged successfully!');
      navigateTo('dashboard-page');
    });
  }

  // Profile Save
  const profileSaveBtn = document.getElementById('profile-save-btn');
  if (profileSaveBtn) {
    profileSaveBtn.addEventListener('click', function() {
      const name = document.getElementById('profile-name')?.value?.trim() || '';
      const cycleLength = Number(document.getElementById('profile-cycle-length')?.value || 0);
      const user = getCurrentUser();
      if (!user) {
        alert('No user is currently signed in.');
        return;
      }

      user.profile = user.profile || {};
      if (name) user.profile.name = name;
      user.preferences = user.preferences || {};
      if (cycleLength) user.preferences.cycleLength = cycleLength;
      setCurrentUserData(user);

      alert('Profile updated successfully.');
      renderCurrentUser();
    });
  }

  // OAuth Handlers
  setupOAuthHandlers();

  // Form input focus effects
  setupFormInteractions();

  // A11y pass for controls that are visually labeled but missing programmatic labels
  enhanceAccessibility();
});

// ============================================
// OAUTH HANDLERS
// ============================================

function setupOAuthHandlers() {
  const googleButtons = document.querySelectorAll('.btn--light');
  googleButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      if (!this.form) return;
      e.preventDefault();
      console.log('Google OAuth initiated');
      alert('Redirecting to Google login...');

      const pageId = this.closest('.page-section')?.id;
      if (pageId === 'login-page') navigateTo('dashboard-page');
      if (pageId === 'signup-page') navigateTo('welcome-page');
    });
  });

  const appleButtons = document.querySelectorAll('.btn--apple');
  appleButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      if (!this.form) return;
      e.preventDefault();
      console.log('Apple OAuth initiated');
      alert('Redirecting to Apple login...');

      const pageId = this.closest('.page-section')?.id;
      if (pageId === 'login-page') navigateTo('dashboard-page');
      if (pageId === 'signup-page') navigateTo('welcome-page');
    });
  });
}

// ============================================
// FORM INTERACTIONS
// ============================================

function setupFormInteractions() {
  const formInputs = document.querySelectorAll('.form-input');
  formInputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });

    input.addEventListener('blur', function() {
      this.parentElement.classList.remove('focused');
    });
  });
}

function enhanceAccessibility() {
  // Associate visible form labels with controls when id/for are missing.
  const groups = document.querySelectorAll('.form-group');
  groups.forEach((group, index) => {
    const label = group.querySelector('label');
    const control = group.querySelector('input, select, textarea');
    if (!label || !control) return;

    if (!control.id) {
      control.id = `field-${index + 1}`;
    }
    if (!label.getAttribute('for')) {
      label.setAttribute('for', control.id);
    }
  });

  // Provide accessible names for toggle checkboxes from nearby text.
  const toggleItems = document.querySelectorAll('.toggle-item');
  toggleItems.forEach((item, index) => {
    const text = item.querySelector('span');
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (!checkbox) return;

    if (!checkbox.id) {
      checkbox.id = `toggle-option-${index + 1}`;
    }
    if (!checkbox.getAttribute('aria-label') && text) {
      checkbox.setAttribute('aria-label', text.textContent.trim());
    }
  });
}

// ============================================
// KEYBOARD NAVIGATION
// ============================================

document.addEventListener('keydown', function(event) {
  if (event.key !== 'Enter') return;

  const activeElement = document.activeElement;
  if (!activeElement) return;

  // Chips are button-like controls; allow Enter to activate them consistently.
  if (activeElement.classList && activeElement.classList.contains('chip')) {
    event.preventDefault();
    activeElement.click();
  }
});

// ============================================
// APP INITIALIZATION
// ============================================

window.addEventListener('load', function() {
  console.log('FRAU ROT Application loaded successfully');
  console.log('Ready for interactions');

  const user = getCurrentUser();
  if (user) {
    navigateTo('dashboard-page');
    return;
  }

  // Default to hero page for unauthenticated visitors
  const firstPage = document.getElementById('hero-page');
  if (firstPage) {
    firstPage.classList.remove('hidden');
  }
});

// ============================================
// EVENT DELEGATION FOR DYNAMIC CONTENT
// ============================================

document.addEventListener('click', function(e) {
  // Handle chip selections via event delegation
  if (e.target.classList.contains('chip')) {
    const category = e.target.parentElement.dataset.category;
    if (category) {
      selectChip(e.target, category, e.target.textContent);
    }
  }
});

// ============================================
// PREFERENCES & STORAGE (Future Enhancement)
// ============================================

function saveUserPreferences(preferences) {
  localStorage.setItem('frau-rot-prefs', JSON.stringify(preferences));
  console.log('Preferences saved');
}

function getUserPreferences() {
  const stored = localStorage.getItem('frau-rot-prefs');
  return stored ? JSON.parse(stored) : null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getFormData(formElement) {
  const formData = new FormData(formElement);
  const data = {};
  for (let [key, value] of formData) {
    data[key] = value;
  }
  return data;
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// ============================================
// DEBUG MODE
// ============================================

window.debugFrauRot = {
  navigateTo,
  getPreferences: getUserPreferences,
  savePreferences: saveUserPreferences,
  getFormData,
  validateEmail
};

console.log('Debug commands available: window.debugFrauRot.*');

