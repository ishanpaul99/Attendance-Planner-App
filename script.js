/**
 * Attendance Planner - Main Script
 * Handles profile storage, attendance calculations, and UI interactions.
 */

/* ============================================
   Constants & DOM References
   ============================================ */

const STORAGE_KEY = 'attendancePlannerProfile';

// Navigation
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const navLinkItems = document.querySelectorAll('.nav-link');

// Profile
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const profileDisplayName = document.getElementById('profileDisplayName');
const profileInfo = document.getElementById('profileInfo');
const profileForm = document.getElementById('profileForm');
const profileSuccess = document.getElementById('profileSuccess');
const editProfileBtn = document.getElementById('editProfileBtn');

const studentName = document.getElementById('studentName');
const studentYear = document.getElementById('studentYear');
const studentSection = document.getElementById('studentSection');
const studentRoll = document.getElementById('studentRoll');

// Calculator
const calculatorForm = document.getElementById('calculatorForm');
const classesAttended = document.getElementById('classesAttended');
const totalClasses = document.getElementById('totalClasses');
const targetPercentage = document.getElementById('targetPercentage');
const resetBtn = document.getElementById('resetBtn');
const errorBox = document.getElementById('errorBox');
const errorList = document.getElementById('errorList');
const results = document.getElementById('results');
const currentPercentageEl = document.getElementById('currentPercentage');
const consecutiveClassesEl = document.getElementById('consecutiveClassesNeeded');
const safeAbsenceEl = document.getElementById('safeAbsence');
const statusCard = document.getElementById('statusCard');
const statusTitle = document.getElementById('statusTitle');
const statusMessage = document.getElementById('statusMessage');

/* ============================================
   Profile - localStorage
   ============================================ */

/**
 * Load student profile from localStorage into form and dropdown.
 */
function loadProfile() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    updateProfileDropdown(null);
    return;
  }

  try {
    const profile = JSON.parse(stored);
    studentName.value = profile.name || '';
    studentYear.value = profile.year || '';
    studentSection.value = profile.section || '';
    studentRoll.value = profile.roll || '';
    updateProfileDropdown(profile);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    updateProfileDropdown(null);
  }
}

/**
 * Save student profile to localStorage.
 */
function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  updateProfileDropdown(profile);
}

/**
 * Check if profile has any meaningful data saved.
 */
function hasProfileData(profile) {
  return profile && (profile.name || profile.year || profile.section || profile.roll);
}

/**
 * Update the profile dropdown display.
 */
function updateProfileDropdown(profile) {
  if (!hasProfileData(profile)) {
    profileDisplayName.textContent = 'Guest User';
    profileInfo.innerHTML = '<p class="guest-message">No profile saved yet. Fill in your details below.</p>';
    return;
  }

  profileDisplayName.textContent = profile.name || 'Guest User';
  profileInfo.innerHTML = `
    <p><strong>Name:</strong> ${escapeHtml(profile.name || '—')}</p>
    <p><strong>Year:</strong> ${escapeHtml(profile.year || '—')}</p>
    <p><strong>Section:</strong> ${escapeHtml(profile.section || '—')}</p>
    <p><strong>Roll No:</strong> ${escapeHtml(profile.roll || '—')}</p>
  `;
}

/**
 * Prevent XSS when rendering user-provided profile text.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ============================================
   Attendance Calculations
   ============================================ */

/**
 * Calculate current attendance percentage.
 */
function getCurrentPercentage(attended, total) {
  if (total === 0) return 0;
  return (attended / total) * 100;
}

/**
 * Consecutive future classes to attend (each adds +1 to attended and total)
 * until attendance reaches the target percentage.
 * Solves (attended + n) / (total + n) >= target/100 for minimum n.
 */
function getConsecutiveClassesNeeded(attended, total, target) {
  const targetRatio = target / 100;
  const currentRatio = attended / total;

  if (currentRatio >= targetRatio) {
    return 0;
  }

  // 100% target cannot be reached if attended < total (ratio always stays below 1)
  if (target >= 100) {
    return null;
  }

  const numerator = targetRatio * total - attended;
  const denominator = 1 - targetRatio;
  return Math.ceil(numerator / denominator);
}

/**
 * Safe absence allowance: max classes that can be missed
 * while staying at or above target percentage.
 * Formula: floor(attended / (target/100) - total)
 */
function getSafeAbsence(attended, total, target) {
  if (target <= 0 || target > 100) return 0;
  const maxTotal = attended / (target / 100);
  const allowance = Math.floor(maxTotal - total);
  return Math.max(0, allowance);
}

/**
 * Determine attendance status tier based on current percentage.
 */
function getAttendanceStatus(percentage) {
  if (percentage >= 85) {
    return {
      class: 'good',
      title: 'Good Attendance',
      message: 'You are comfortably above the attendance requirement.'
    };
  }
  if (percentage >= 75) {
    return {
      class: 'risky',
      title: 'Risky Attendance',
      message: 'Monitor your attendance carefully.'
    };
  }
  return {
    class: 'poor',
    title: 'Poor Attendance',
    message: 'Immediate improvement is recommended.'
  };
}

/* ============================================
   Validation
   ============================================ */

/**
 * Validate calculator inputs. Returns array of error strings.
 */
function validateInputs(attended, total, target) {
  const errors = [];

  if (classesAttended.value === '' || isNaN(attended)) {
    errors.push('Please enter a valid number for Classes Attended.');
  } else if (attended < 0) {
    errors.push('Classes Attended cannot be negative.');
  }

  if (totalClasses.value === '' || isNaN(total)) {
    errors.push('Please enter a valid number for Total Classes Conducted.');
  } else if (total < 0) {
    errors.push('Total Classes Conducted cannot be negative.');
  }

  if (targetPercentage.value === '' || isNaN(target)) {
    errors.push('Please enter a valid Target Attendance Percentage.');
  } else if (target < 0 || target > 100) {
    errors.push('Target Attendance Percentage must be between 0 and 100.');
  }

  if (errors.length === 0 && total === 0) {
    errors.push('Total Classes Conducted must be greater than zero.');
  }

  if (errors.length === 0 && attended > total) {
    errors.push('Classes Attended cannot be greater than Total Classes Conducted.');
  }

  return errors;
}

/**
 * Show validation errors in the UI.
 */
function showErrors(errors) {
  errorList.innerHTML = errors.map((e) => `<li>${e}</li>`).join('');
  errorBox.hidden = false;
  results.hidden = true;
}

/**
 * Clear validation errors and invalid field styling.
 */
function clearErrors() {
  errorBox.hidden = true;
  errorList.innerHTML = '';
  [classesAttended, totalClasses, targetPercentage].forEach((el) => {
    el.classList.remove('invalid');
  });
}

/**
 * Mark fields invalid based on error messages.
 */
function markInvalidFields(errors) {
  const text = errors.join(' ').toLowerCase();
  if (text.includes('attended')) classesAttended.classList.add('invalid');
  if (text.includes('total')) totalClasses.classList.add('invalid');
  if (text.includes('target')) targetPercentage.classList.add('invalid');
}

/* ============================================
   Display Results
   ============================================ */

/**
 * Render calculation results and status card.
 */
function displayResults(attended, total, target) {
  clearErrors();

  const currentPct = getCurrentPercentage(attended, total);
  const consecutiveNeeded = getConsecutiveClassesNeeded(attended, total, target);
  const safeAbsence = getSafeAbsence(attended, total, target);
  const status = getAttendanceStatus(currentPct);

  currentPercentageEl.textContent = `${currentPct.toFixed(1)}%`;
  consecutiveClassesEl.textContent =
    consecutiveNeeded === null ? 'N/A' : consecutiveNeeded;
  safeAbsenceEl.textContent = safeAbsence;

  statusCard.className = `status-card ${status.class}`;
  statusTitle.textContent = status.title;
  statusMessage.textContent = status.message;

  results.hidden = false;
  results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Reset calculator form and hide results.
 */
function resetCalculator() {
  calculatorForm.reset();
  clearErrors();
  results.hidden = true;
}

/* ============================================
   Event Listeners
   ============================================ */

// Mobile navigation toggle
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close mobile nav on link click
navLinkItems.forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');

    navLinkItems.forEach((l) => l.classList.remove('active'));
    link.classList.add('active');
  });
});

// Profile dropdown toggle
profileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = profileDropdown.classList.toggle('open');
  profileBtn.setAttribute('aria-expanded', isOpen);
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!profileDropdown.contains(e.target) && e.target !== profileBtn) {
    profileDropdown.classList.remove('open');
    profileBtn.setAttribute('aria-expanded', 'false');
  }
});

// Edit profile — scroll to form and close dropdown
editProfileBtn.addEventListener('click', () => {
  profileDropdown.classList.remove('open');
  profileBtn.setAttribute('aria-expanded', 'false');
  document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
  studentName.focus();
});

// Save profile form
profileForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const profile = {
    name: studentName.value.trim(),
    year: studentYear.value.trim(),
    section: studentSection.value.trim(),
    roll: studentRoll.value.trim()
  };

  saveProfile(profile);

  profileSuccess.hidden = false;
  setTimeout(() => {
    profileSuccess.hidden = true;
  }, 3000);
});

// Calculator form submit
calculatorForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const attended = parseFloat(classesAttended.value);
  const total = parseFloat(totalClasses.value);
  const target = parseFloat(targetPercentage.value);

  const errors = validateInputs(attended, total, target);

  if (errors.length > 0) {
    showErrors(errors);
    markInvalidFields(errors);
    return;
  }

  displayResults(attended, total, target);
});

// Reset button
resetBtn.addEventListener('click', resetCalculator);

// Clear invalid styling on input
[classesAttended, totalClasses, targetPercentage].forEach((input) => {
  input.addEventListener('input', () => {
    input.classList.remove('invalid');
    if (errorList.children.length > 0) {
      errorBox.hidden = true;
    }
  });
});

/* ============================================
   Initialize on page load
   ============================================ */

loadProfile();
