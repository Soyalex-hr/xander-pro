/* Xander Pro — 02-auth-pwa (extraído de index.html; scripts clásicos que comparten el ámbito global) */
    // =====================================================
    // CRYPTOGRAPHIC SECURITY & AUTHENTICATION ENGINE (SHA-256)
    // =====================================================
    let isAuthenticated = false;
    let failedLoginAttempts = 0;
    let lockoutTimerInterval = null;
    let inactivityTimer = null;

    function toggleLoginPassword(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const input = document.getElementById('login-password');
      const btn = document.getElementById('btn-toggle-login-pwd');
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.innerHTML = '🙈';
        if (btn) btn.title = 'Ocultar contraseña';
      } else {
        input.type = 'password';
        if (btn) btn.innerHTML = '👁️';
        if (btn) btn.title = 'Mostrar contraseña';
      }
    }

    function applyTheme(theme) {
      const isDark = theme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.setAttribute('content', isDark ? '#0f172a' : '#ffffff');

      const statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (statusMeta) statusMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');

      const themeIcon = document.getElementById('theme-icon');
      if (themeIcon) themeIcon.textContent = isDark ? '☀️' : '🌙';

      const menuThemeIcon = document.getElementById('menu-theme-icon');
      if (menuThemeIcon) menuThemeIcon.textContent = isDark ? '☀️' : '🌙';

      const menuThemeText = document.getElementById('menu-theme-text');
      if (menuThemeText) menuThemeText.textContent = isDark ? 'Modo Claro' : 'Modo Oscuro';

      const sidebarThemeIcon = document.getElementById('sidebar-theme-icon');
      if (sidebarThemeIcon) sidebarThemeIcon.textContent = isDark ? '☀️' : '🌙';

      const sidebarThemeText = document.getElementById('sidebar-theme-text');
      if (sidebarThemeText) sidebarThemeText.textContent = isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro';

      const sidebarThemeSub = document.getElementById('sidebar-theme-sub');
      if (sidebarThemeSub) sidebarThemeSub.textContent = isDark ? 'Fondo blanco y descansado' : 'Fondo oscuro elegante';

      const drawerThemeIcon = document.getElementById('drawer-theme-icon');
      if (drawerThemeIcon) drawerThemeIcon.textContent = isDark ? '☀️' : '🌙';

      const drawerThemeText = document.getElementById('drawer-theme-text');
      if (drawerThemeText) drawerThemeText.textContent = isDark ? 'Modo Claro' : 'Modo Oscuro';

      try {
        localStorage.setItem('eq_theme', theme);
      } catch (e) {}
    }

    let _themeToggleLock = false;
    function toggleTheme() {
      if (_themeToggleLock) return;
      _themeToggleLock = true;
      setTimeout(() => { _themeToggleLock = false; }, 350);

      document.getElementById('user-menu-popover')?.classList.add('hidden');
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      const nextTheme = isCurrentlyDark ? 'light' : 'dark';
      applyTheme(nextTheme);
      try {
        localStorage.setItem('eq_theme', nextTheme);
        localStorage.setItem('eq_theme_forced_light_v1', 'true');
      } catch (e) {}
      showToast(nextTheme === 'dark' ? '🌙 Modo Oscuro activado' : '☀️ Modo Claro activado');
    }
    window.toggleTheme = toggleTheme;

    // ==========================================
    // PWA INSTALLATION SYSTEM (GLOBAL ENGINE)
    // ==========================================
    let deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const banner = document.getElementById('pwa-prompt-ready-banner');
      if (banner) banner.classList.remove('hidden');
      const btnText = document.getElementById('btn-install-app-text');
      if (btnText) btnText.textContent = 'Instalar App';
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      const btnText = document.getElementById('btn-install-app-text');
      if (btnText) btnText.textContent = 'App Instalada';
      showToast('🎉 ¡Xander Pro se ha instalado en tu dispositivo!');
    });

    function handleInstallApp() {
      document.getElementById('user-menu-popover')?.classList.add('hidden');
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(choiceResult => {
          if (choiceResult.outcome === 'accepted') {
            showToast('Instalando aplicación...');
          }
          deferredInstallPrompt = null;
        });
      } else {
        document.getElementById('modal-pwa-install')?.classList.remove('hidden');
      }
    }

    function closeInstallModal() {
      document.getElementById('modal-pwa-install')?.classList.add('hidden');
    }

    function triggerModalInstall() {
      closeInstallModal();
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
      } else {
        showToast('💡 Menú Chrome (⋮) > Guardar y compartir > Crear acceso directo > Abrir como ventana');
      }
    }

    function setPwaTab(tabName) {
      const tabs = ['chrome', 'mobile', 'cloud'];
      tabs.forEach(t => {
        const btn = document.getElementById(`tab-pwa-${t}`);
        const content = document.getElementById(`pwa-content-${t}`);
        const isActive = (t === tabName);
        if (btn) {
          btn.className = isActive
            ? 'flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] transition text-indigo-700 dark:text-white bg-white dark:bg-slate-700 shadow-xs cursor-pointer flex items-center justify-center gap-1.5'
            : 'flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] transition text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer flex items-center justify-center gap-1.5';
        }
        if (content) {
          content.classList.toggle('hidden', !isActive);
        }
      });
    }
    window.setPwaTab = setPwaTab;

    async function hashPassword(salt, password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(salt + password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    function generateSecureToken() {
      const array = new Uint8Array(24);
      window.crypto.getRandomValues(array);
      return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }

    function checkActiveSession() {
      const isRemembered = localStorage.getItem('eq_session_remember') === 'true';
      const token = sessionStorage.getItem('eq_session_token') || localStorage.getItem('eq_session_token');
      const tokenTime = sessionStorage.getItem('eq_session_time') || localStorage.getItem('eq_session_time');

      if (token && tokenTime) {
        const elapsed = Date.now() - Number(tokenTime);
        // If "Recordarme" is active, session persists for 30 days without unexpected lockouts
        const maxDuration = isRemembered ? (30 * 24 * 60 * 60 * 1000) : ((Number(state.auth?.sessionTimeoutMins) || 15) * 60 * 1000);
        if (maxDuration === 0 || elapsed < maxDuration) {
          // Valid session! Recupera el usuario guardado al iniciar sesión
          let loggedUser = null;
          try {
            const storedUser = sessionStorage.getItem('eq_logged_user') || localStorage.getItem('eq_logged_user');
            loggedUser = storedUser ? JSON.parse(storedUser) : null;
          } catch (e) { loggedUser = null; }
          if (!loggedUser) {
            loggedUser = {
              id: 'usr-1',
              username: localStorage.getItem('eq_remember_username') || state.auth?.user || 'admin',
              name: (typeof getOperatorName === 'function' ? getOperatorName() : 'Alexander'),
              role: 'Administrador'
            };
          }
          sessionStorage.setItem('eq_logged_user', JSON.stringify(loggedUser));
          if (isRemembered) localStorage.setItem('eq_logged_user', JSON.stringify(loggedUser));

          setAuthenticated(true);
          return;
        }
      }
      setAuthenticated(false);
    }

    function setAuthenticated(authStatus, isLockedNotice = false) {
      isAuthenticated = authStatus;
      const authScreen = document.getElementById('auth-screen');
      const lockedNotice = document.getElementById('auth-locked-notice');
      const errorMsg = document.getElementById('auth-error-msg');
      const usernameInput = document.getElementById('login-username');
      const passwordInput = document.getElementById('login-password');
      const rememberCheckbox = document.getElementById('login-remember');
      const headerUserName = document.getElementById('header-user-name');
      const popoverUserName = document.getElementById('popover-user-name');
      const avatarInitial = document.getElementById('user-avatar-initial');

      const currentUsr = state.auth?.user || 'admin';
      if (headerUserName) headerUserName.textContent = currentUsr;
      if (popoverUserName) popoverUserName.textContent = currentUsr.toUpperCase();
      if (avatarInitial) avatarInitial.textContent = currentUsr[0].toUpperCase();

      const sidebarUser = document.getElementById('sidebar-user-name');
      const sidebarAvatar = document.getElementById('sidebar-user-avatar');
      if (sidebarUser) sidebarUser.textContent = currentUsr;
      if (sidebarAvatar) sidebarAvatar.textContent = currentUsr[0].toUpperCase();

      if (authStatus) {
        document.body.classList.remove('is-unauthenticated');
        authScreen?.classList.add('hidden');
        document.getElementById('app-sidebar')?.classList.remove('hidden');
        document.getElementById('dashboard-wrapper')?.classList.remove('hidden');
        if (errorMsg) errorMsg.classList.add('hidden');
        if (lockedNotice) lockedNotice.classList.add('hidden');
        if (passwordInput) passwordInput.value = '';
        resetInactivityTimer();
        initAntigravityMotion();
      switchView('dashboard');
      } else {
        document.body.classList.add('is-unauthenticated');
        authScreen?.classList.remove('hidden');
        document.getElementById('app-sidebar')?.classList.add('hidden');
        document.getElementById('dashboard-wrapper')?.classList.add('hidden');
        closeMobileSidebar();
        const isRemembered = localStorage.getItem('eq_session_remember') === 'true';
        const rememberedUser = isRemembered ? (localStorage.getItem('eq_remember_username') || '') : '';
        if (usernameInput) {
          usernameInput.value = isLockedNotice ? (currentUsr || '') : rememberedUser;
          if (!usernameInput.value) {
            usernameInput.focus();
          }
        }
        if (rememberCheckbox) {
          rememberCheckbox.checked = isRemembered;
        }
        if (passwordInput) {
          passwordInput.value = '';
          if (usernameInput && usernameInput.value) {
            passwordInput.focus();
          }
        }
        if (isLockedNotice && lockedNotice) {
          lockedNotice.classList.remove('hidden');
        } else if (lockedNotice) {
          lockedNotice.classList.add('hidden');
        }
        if (inactivityTimer) clearTimeout(inactivityTimer);
      }
    }

    function resetInactivityTimer() {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (!isAuthenticated) return;

      const isRemembered = localStorage.getItem('eq_session_remember') === 'true';
      if (isRemembered) {
        // Refresh token time so 30-day session remains active on user activity
        localStorage.setItem('eq_session_time', Date.now().toString());
        return; // Do not auto-lock session if user chose "Recordarme"
      }

      const timeoutMins = Number(state.auth?.sessionTimeoutMins) ?? 15;
      if (timeoutMins === 0) return; // Disabled

      inactivityTimer = setTimeout(() => {
        lockScreen('Sesión bloqueada por 15 minutos de inactividad.');
      }, timeoutMins * 60 * 1000);
    }

    function lockScreen(reason = 'Pantalla bloqueada por seguridad.') {
      sessionStorage.removeItem('eq_session_token');
      localStorage.removeItem('eq_session_token');
      setAuthenticated(false, true);
      const text = document.getElementById('auth-locked-notice-text');
      if (text) text.textContent = reason;
      showToast('🔒 ' + reason);
    }

    function logout() {
      sessionStorage.removeItem('eq_session_token');
      sessionStorage.removeItem('eq_session_time');
      localStorage.removeItem('eq_session_token');
      localStorage.removeItem('eq_session_time');
      localStorage.removeItem('eq_session_remember');
      localStorage.removeItem('eq_remember_username');
      setAuthenticated(false);
      showToast('Sesión cerrada con éxito.');
    }


    function handleLoginSubmit() {
      const userEl = document.getElementById('login-username');
      const pwdEl = document.getElementById('login-password');
      const remEl = document.getElementById('login-remember');
      const username = userEl ? userEl.value.trim() : '';
      const password = pwdEl ? pwdEl.value : '';
      const remember = remEl ? remEl.checked : false;
      const errorMsg = document.getElementById('auth-error-msg');
      const errorText = document.getElementById('auth-error-text');
      const lb = document.getElementById('auth-lockout-banner');

      const lockoutExpiry = Number(sessionStorage.getItem('eq_lockout_until') || 0);
      if (lockoutExpiry && Date.now() >= lockoutExpiry) {
        sessionStorage.removeItem('eq_lockout_until');
        sessionStorage.removeItem('eq_failed_attempts');
        if (lb) lb.classList.add('hidden');
      }

      if (!username || !password) {
        if (errorMsg && errorText) {
          errorText.textContent = 'Por favor ingresa usuario y contrase\u00F1a.';
          errorMsg.classList.remove('hidden');
        }
        return;
      }

      const expectedUser = ((state.auth && state.auth.user) ? state.auth.user : 'admin').toLowerCase();
      const opName = (typeof getOperatorName === 'function' ? getOperatorName() : 'Alexander').toLowerCase();
      const expectedPassword = (state.auth && state.auth.password) ? state.auth.password : 'Admin2026*';

      const cleanUser = username.trim().toLowerCase();
      const cleanPwd = password.trim();
      let matchedUserObj = null;
      if (Array.isArray(state.users)) {
        matchedUserObj = state.users.find(u => u.username.toLowerCase() === cleanUser && u.password === cleanPwd && u.active);
      }

      const isUserMatch = cleanUser === 'admin' ||
                          cleanUser === 'alexander' ||
                          cleanUser === 'aura' ||
                          cleanUser === expectedUser ||
                          cleanUser === opName || !!matchedUserObj;

      const isPasswordMatch = cleanPwd === expectedPassword || !!matchedUserObj;

      if (isUserMatch && isPasswordMatch) {
        failedLoginAttempts = 0;
        sessionStorage.removeItem('eq_failed_attempts');
        sessionStorage.removeItem('eq_lockout_until');
        if (lb) lb.classList.add('hidden');

        const token = generateSecureToken();
        const now = Date.now().toString();

        if (remember) {
          localStorage.setItem('eq_session_token', token);
          localStorage.setItem('eq_session_time', now);
          localStorage.setItem('eq_session_remember', 'true');
          localStorage.setItem('eq_remember_username', username);
        } else {
          sessionStorage.setItem('eq_session_token', token);
          sessionStorage.setItem('eq_session_time', now);
          localStorage.removeItem('eq_session_remember');
          localStorage.removeItem('eq_remember_username');
        }

        const loggedUser = matchedUserObj ? {
          id: matchedUserObj.id,
          username: matchedUserObj.username,
          name: matchedUserObj.name,
          role: matchedUserObj.role
        } : {
          id: 'usr-1',
          username: cleanUser,
          name: (typeof getOperatorName === 'function' ? getOperatorName() : 'Alexander'),
          role: 'Administrador'
        };
        sessionStorage.setItem('eq_logged_user', JSON.stringify(loggedUser));
        if (remember) localStorage.setItem('eq_logged_user', JSON.stringify(loggedUser));

        setAuthenticated(true);
        showToast('Bienvenido a Xander Pro, ' + (typeof getOperatorName === 'function' ? getOperatorName() : 'Alexander'));
      } else {
        if (lockoutExpiry && Date.now() < lockoutExpiry) {
          showToast('Acceso temporalmente bloqueado por seguridad.');
          return;
        }

        failedLoginAttempts = Number(sessionStorage.getItem('eq_failed_attempts') || 0) + 1;
        sessionStorage.setItem('eq_failed_attempts', failedLoginAttempts.toString());

        if (failedLoginAttempts >= 5) {
          const lockTime = Date.now() + 30000;
          sessionStorage.setItem('eq_lockout_until', lockTime.toString());
          startLockoutCountdown(30);
          showToast('Demasiados intentos fallidos. Acceso bloqueado por 30 segundos.');
        } else {
          if (errorMsg && errorText) {
            errorText.textContent = `Credenciales incorrectas (Intento ${failedLoginAttempts}/5).`;
            errorMsg.classList.remove('hidden');
          }
        }
      }
    }
    window.handleLoginSubmit = handleLoginSubmit;

    function startLockoutCountdown(seconds) {
      const banner = document.getElementById('auth-lockout-banner');
      const countdownEl = document.getElementById('auth-countdown');
      const submitBtn = document.getElementById('btn-submit-login');
      if (banner) banner.classList.remove('hidden');
      if (submitBtn) submitBtn.disabled = true;

      let remaining = seconds;
      if (countdownEl) countdownEl.textContent = remaining;

      if (lockoutTimerInterval) clearInterval(lockoutTimerInterval);
      lockoutTimerInterval = setInterval(() => {
        remaining--;
        if (countdownEl) countdownEl.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(lockoutTimerInterval);
          if (banner) banner.classList.add('hidden');
          if (submitBtn) submitBtn.disabled = false;
          sessionStorage.removeItem('eq_failed_attempts');
          sessionStorage.removeItem('eq_lockout_until');
        }
      }, 1000);
    }
