const SUPABASE_URL = window.KANBAN_CONFIG && window.KANBAN_CONFIG.url;
const SUPABASE_KEY = window.KANBAN_CONFIG && window.KANBAN_CONFIG.key;
const SESSION_KEY = 'sb_session';

const form = document.getElementById('signup-form');
const nameInput = document.getElementById('signup-name');
const emailInput = document.getElementById('signup-email');
const passwordInput = document.getElementById('signup-password');
const confirmPasswordInput = document.getElementById('signup-confirm-password');
const submitBtn = document.getElementById('signup-submit');
const feedbackEl = document.getElementById('signup-feedback');

function setFeedback(message, type = 'error') {
  if (!feedbackEl) return;
  feedbackEl.textContent = message;
  feedbackEl.className = `signup-feedback ${type}`;
}

function clearFeedback() {
  if (!feedbackEl) return;
  feedbackEl.textContent = '';
  feedbackEl.className = 'signup-feedback';
}

function persistSession(session) {
  if (!session) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function signupAccount({ name, email, password }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Configuração do Supabase não encontrada.');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name
        }
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error_description || 'Erro ao criar conta.');
  }

  return data;
}

if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    clearFeedback();

    const name = ((nameInput && nameInput.value) || '').trim();
    const email = ((emailInput && emailInput.value) || '').trim();
    const password = passwordInput ? passwordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

    if (!name || !email || !password || !confirmPassword) {
      setFeedback('Preencha nome, email, senha e confirmação da senha.');
      return;
    }

    if (password !== confirmPassword) {
      setFeedback('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setFeedback('Use uma senha com pelo menos 6 caracteres.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Criando conta...';
    }

    try {
      const result = await signupAccount({ name, email, password });

      if (result && result.session && result.session.access_token && result.user) {
        persistSession({
          user: result.user,
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token || null
        });
        window.location.href = 'index.html';
        return;
      }

      setFeedback('Conta criada. Confirme seu email e depois faça login.', 'success');
      if (passwordInput) passwordInput.value = '';
      if (confirmPasswordInput) confirmPasswordInput.value = '';
    } catch (error) {
      setFeedback(error.message || 'Erro ao criar conta.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar conta';
      }
    }
  });
}
