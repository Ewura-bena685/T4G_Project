/**
 * FRAU ROT - Application Script
 * Multi-page navigation, form handling, and user interactions
 */

// ============================================
// NAVBAR MOBILE MENU
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  const navbarToggle = document.getElementById('navbar-toggle');
  const navbarMenu = document.querySelector('.navbar__menu');
  
  if (navbarToggle) {
    navbarToggle.addEventListener('click', function() {
      navbarMenu.classList.toggle('active');
      navbarToggle.classList.toggle('active');
    });
  }

  // Close menu when a link is clicked
  if (navbarMenu) {
    const navLinks = navbarMenu.querySelectorAll('.navbar__link');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        navbarMenu.classList.remove('active');
        navbarToggle.classList.remove('active');
      });
    });
  }
});

// ============================================
// PAGE NAVIGATION
// ============================================

function navigateTo(pageId) {
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
}

function updateActiveNav(pageId) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  const pageMap = {
    'dashboard-page': 'dashboard',
    'calendar-page': 'calendar',
    'cycle-timeline-page': 'cycle',
    'insights-page': 'insights',
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
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;
      const passwords = this.querySelectorAll('input[type="password"]');
      
      if (passwords[0].value !== passwords[1].value) {
        alert('Passwords do not match!');
        return;
      }

      console.log('Sign up:', email);
      alert('Account created successfully!');
      navigateTo('welcome-page');
    });
  }

  // Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;
      
      console.log('Login:', email);
      alert('Welcome back!');
      navigateTo('dashboard-page');
    });
  }

  // Add Period Form
  const addPeriodForm = document.getElementById('add-period-form');
  if (addPeriodForm) {
    addPeriodForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const date = this.querySelector('input[type="date"]').value;
      const flow = document.querySelector('.chip.active');
      
      if (!flow) {
        alert('Please select a flow level');
        return;
      }

      console.log('Period added:', date, flow.textContent);
      alert('Period logged successfully!');
      navigateTo('dashboard-page');
    });
  }

  // OAuth Handlers
  setupOAuthHandlers();

  // Form input focus effects
  setupFormInteractions();
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
    });
  });

  const appleButtons = document.querySelectorAll('.btn--apple');
  appleButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      if (!this.form) return;
      e.preventDefault();
      console.log('Apple OAuth initiated');
      alert('Redirecting to Apple login...');
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

// ============================================
// KEYBOARD NAVIGATION
// ============================================

document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    const activeElement = document.activeElement;

    if (activeElement.tagName === 'BUTTON' && !activeElement.hasAttribute('disabled')) {
      activeElement.click();
    }

    if (activeElement.tagName === 'INPUT' && activeElement.form) {
      const inputs = Array.from(activeElement.form.querySelectorAll('input'));
      const isLastInput = inputs[inputs.length - 1] === activeElement;
      if (isLastInput && !event.ctrlKey) {
        activeElement.form.submit();
      }
    }
  }
});

// ============================================
// APP INITIALIZATION
// ============================================

window.addEventListener('load', function() {
  console.log('FRAU ROT Application loaded successfully');
  console.log('Ready for interactions');

  // Default to hero page
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

