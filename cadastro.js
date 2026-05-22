const SUPABASE_URL = (window.CONFIGURACAO_KANBAN && window.CONFIGURACAO_KANBAN.URL) || 'https://uqbybihbwrweznvituxx.supabase.co';
const SUPABASE_KEY = (window.CONFIGURACAO_KANBAN && window.CONFIGURACAO_KANBAN.chave) || 'sb_publishable_prEVrf5nSmiy5LzZnLBG7Q_vhk2BfQx';
const SESSION_KEY = 'sb_session';

function setFeedback(message, type) {
  var feedbackEl = document.getElementById('signup-feedback');
  if (!feedbackEl) return;
  feedbackEl.textContent = message;
  feedbackEl.className = 'signup-feedback ' + (type || 'error');
}

function clearFeedback() {
  var feedbackEl = document.getElementById('signup-feedback');
  if (!feedbackEl) return;
  feedbackEl.textContent = '';
  feedbackEl.className = 'signup-feedback';
}

function persistSession(session) {
  if (!session) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function signupAccount(name, email, password) {
  return fetch(SUPABASE_URL + '/auth/v1/signup', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      password: password,
      data: {
        full_name: name,
        name: name
      }
    })
  }).then(function(response) {
    return response.json().then(function(data) {
      if (!response.ok) {
        throw new Error(data.message || data.error_description || 'Erro ao criar conta.');
      }
      return data;
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', function(event) {
    event.preventDefault();
    clearFeedback();

    var name = (document.getElementById('signup-name').value || '').trim();
    var email = (document.getElementById('signup-email').value || '').trim();
    var password = document.getElementById('signup-password').value || '';
    var confirmPassword = document.getElementById('signup-confirm-password').value || '';
    var submitBtn = document.getElementById('signup-submit');

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

    signupAccount(name, email, password).then(function(result) {
      if (result && result.session && result.session.access_token && result.user) {
        persistSession({
          user: result.user,
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token || null
        });
        window.location.href = 'index.html';
        return;
      }
      setFeedback('Conta criada! Confirme seu email e depois faça login.', 'success');
      document.getElementById('signup-password').value = '';
      document.getElementById('signup-confirm-password').value = '';
    }).catch(function(error) {
      setFeedback(error.message || 'Erro ao criar conta.');
    }).finally(function() {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar conta';
      }
    });
  });
});
