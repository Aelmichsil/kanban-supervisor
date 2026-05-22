/* ================================================================
   KANBAN BOARD COM RAIAS (SWIMLANES) — Vanilla JS + Supabase
   ================================================================

   ARQUITETURA:
   ┌──────────────────────────────────────────────────────────────┐
   │  HEADER (fixo no topo)                                       │
   ├──────────────────────────────────────────────────────────────┤
   │           │ Backlog │ A Fazer │ Em Progresso │ Concluído │   │
   ├────────────┼─────────┼─────────┼──────────────┼───────────┤   │
   │ Suporte N1 │  card   │  card   │    card      │           │   │
   ├────────────┼─────────┼─────────┼──────────────┼───────────┤   │
   │  Cadastro  │         │  card   │              │   card    │   │
   ├────────────┼─────────┼─────────┼──────────────┼───────────┤   │
   │    NOC     │  card   │         │    card      │           │   │
   └────────────┴─────────┴─────────┴──────────────┴───────────┘

   CONCEITOS PRINCIPAIS:
   - "lanes" = raias horizontais (quem faz / categoria do time)
   - "columns" = estágios do fluxo (Backlog, A Fazer, etc.)
   - Cada célula da grade [lane × column] aceita múltiplos cards
   - Cards podem ser movidos entre raias e colunas por drag-and-drop

   CONFIGURAÇÃO DO SUPABASE:
   1. Crie um projeto em https://supabase.com
   2. Vá em Project Settings → API
   3. Cole sua URL e chave "anon public" abaixo
   4. Execute o SQL de criação de tabelas no arquivo README do HTML
   ================================================================ */


/* ================================================================
   0. CONFIGURAÇÃO DO SUPABASE
   ================================================================ */

const SUPABASE_URL  = (window.KANBAN_CONFIG && window.KANBAN_CONFIG.url) || 'COLE_SUA_URL_AQUI';
const SUPABASE_PUBLISHABLE = (window.KANBAN_CONFIG && window.KANBAN_CONFIG.key) || 'COLE_SUA_CHAVE_AQUI';
const DEBUG = false;

const LOCALE = 'pt-BR';

const I18N = {
  'pt-BR': {
    auth: {
      emailNotConfirmed: 'Seu email ainda não foi confirmado. Verifique sua caixa de entrada e confirme antes de fazer login.',
      invalidCredentials: 'Email ou senha incorretos.',
      loginNoSession: 'Login não retornou sessão válida. Tente novamente.',
      loginGeneric: 'Erro ao fazer login.',
      signupGeneric: 'Erro ao criar conta.',
      resendGeneric: 'Não foi possível reenviar o email de confirmação.',
      fillEmailPassword: 'Preencha email e senha',
      signupNeedConfirmation: 'Conta criada. Confirme seu email e depois faça login.',
      askEmailToResend: 'Digite seu email para reenviar a confirmação.',
      resendSent: 'Enviamos um novo link de confirmação para seu email.',
      otpExpired: 'O link de confirmação expirou. Clique em "Reenviar email de confirmação".'
    },
    sync: {
      saveCardError: 'Falha ao salvar card',
      updateCardError: 'Falha ao atualizar card',
      deleteCardError: 'Falha ao remover card',
      moveCardError: 'Falha ao mover card',
      deleteLaneError: 'Falha ao remover raia',
      deleteColumnError: 'Falha ao remover coluna',
      createColumnError: 'Falha ao criar coluna',
      connectError: 'Falha ao conectar'
    },
    app: {
      initError: 'Erro ao inicializar a aplicação. Recarregue a página e tente novamente.'
    }
  },
  'en-US': {
    auth: {
      emailNotConfirmed: 'Your email is not confirmed yet. Please check your inbox before logging in.',
      invalidCredentials: 'Invalid email or password.',
      loginNoSession: 'Login did not return a valid session. Please try again.',
      loginGeneric: 'Unable to sign in.',
      signupGeneric: 'Unable to create account.',
      resendGeneric: 'Unable to resend confirmation email.',
      fillEmailPassword: 'Please provide email and password.',
      signupNeedConfirmation: 'Account created. Confirm your email and then sign in.',
      askEmailToResend: 'Enter your email to resend confirmation.',
      resendSent: 'A new confirmation link has been sent to your email.',
      otpExpired: 'Confirmation link expired. Click "Resend confirmation email".'
    },
    sync: {
      saveCardError: 'Failed to save card',
      deleteCardError: 'Failed to delete card',
      moveCardError: 'Failed to move card',
      deleteLaneError: 'Failed to delete lane',
      deleteColumnError: 'Failed to delete column',
      createColumnError: 'Failed to create column',
      connectError: 'Connection error'
    },
    app: {
      initError: 'Failed to initialize the application. Reload and try again.'
    }
  }
};

const MESSAGES = I18N[LOCALE] || I18N['pt-BR'];

// Essas constantes guardam os dados de conexão com o Supabase.
// `SUPABASE_URL` aponta para o projeto e `SUPABASE_PUBLISHABLE` é a chave pública.

function logDevError(...args) {
  if (DEBUG) console.error(...args);
}

const THEME_STORAGE_KEY = 'kanban-theme';

function setTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-theme', isLight);

  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = isLight
      ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.3" stroke="currentColor" stroke-width="1.4"/><path d="M7 1.2v1.4M7 11.4v1.4M1.2 7h1.4M11.4 7h1.4M2.8 2.8l1 1M10.2 10.2l1 1M11.2 2.8l-1 1M3.8 10.2l-1 1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 7a5 5 0 1 1-5-5 4 4 0 0 0 5 5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    btn.setAttribute('title', isLight ? 'Ativar modo dark' : 'Ativar modo light');
    btn.setAttribute('aria-label', isLight ? 'Ativar modo dark' : 'Ativar modo light');
  }
}

function initTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = storedTheme || (prefersLight ? 'light' : 'dark');
  setTheme(theme);
}

function toggleTheme() {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.classList.remove('theme-toggle-anim');
    // Força reflow para reiniciar animação a cada clique.
    void btn.offsetWidth;
    btn.classList.add('theme-toggle-anim');
  }

  document.body.classList.add('theme-switching');

  const isLight = document.body.classList.contains('light-theme');
  const nextTheme = isLight ? 'dark' : 'light';
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  setTheme(nextTheme);

  setTimeout(() => {
    document.body.classList.remove('theme-switching');
  }, 760);
}


/* ----------------------------------------------------------------
   Helper REST do Supabase — faz requisições HTTP sem SDK externo.
   @param {string} method  - GET | POST | PATCH | DELETE
   @param {string} path    - ex: '/columns' ou '/cards?id=eq.c1'
   @param {Object} [body]  - payload JSON para POST/PATCH
   @returns {Promise<any>}
---------------------------------------------------------------- */
async function sbFetch(method, path, body) {
  async function requestWithCurrentToken() {
    const authToken = (auth.session && auth.session.access_token) || SUPABASE_PUBLISHABLE;
    try {
      return await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        method,
        headers: {
          // Identifica quem está fazendo a requisição.
          'apikey'       : SUPABASE_PUBLISHABLE,
          // O Supabase precisa do token também no header de autorização.
          // Agora usa o access_token da sessão ou a chave anônima.
          'Authorization': `Bearer ${authToken}`,
          // Estamos enviando e recebendo JSON.
          'Content-Type' : 'application/json',
          // Usa retorno mínimo para evitar falso erro de RLS no retorno de representação.
          'Prefer'       : 'return=minimal'
        },
        // Só envia corpo quando existe algo para salvar.
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (_) {
      // Em file:// o navegador costuma bloquear CORS com origin "null".
      if (window.location && window.location.protocol === 'file:') {
        throw new Error('NETWORK_ORIGIN_FILE');
      }
      throw new Error('NETWORK_UNREACHABLE');
    }
  }

  let res = await requestWithCurrentToken();
  if (res.status === 401 && auth.session && auth.session.refresh_token) {
    const refreshed = await authRefreshSession();
    if (refreshed) {
      // Retry único após refresh para evitar loops.
      res = await requestWithCurrentToken();
    }
  }

  if (!res.ok) {
    // Se a resposta não for 2xx, pegamos o texto do erro para depuração.
    const err = await res.text();
    if (res.status === 401) throw new Error('AUTH_EXPIRED');
    if (res.status === 403) throw new Error(`RLS_DENIED:${err}`);
    throw new Error(`Supabase [${method} ${path}]: ${err}`);
  }

  // O Supabase às vezes responde com corpo vazio, então tratamos os dois casos.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function resolveSupabaseConnectMessage(error) {
  const raw = String((error && error.message) || '');

  if (raw === 'NETWORK_ORIGIN_FILE') {
    return 'Abra via servidor local (ex.: Live Server em http://localhost). Evite abrir como file://.';
  }
  if (raw === 'NETWORK_UNREACHABLE') {
    return 'Sem acesso ao Supabase. Verifique internet, firewall ou bloqueio de rede.';
  }
  if (raw === 'AUTH_EXPIRED') {
    return 'Sessão expirada. Faça login novamente.';
  }
  if (raw.startsWith('RLS_DENIED:')) {
    return 'Acesso negado por RLS. Execute SECURITY_SETUP.sql e confirme que o usuário está logado.';
  }

  return MESSAGES.sync.connectError;
}


/* ================================================================
   AUTENTICAÇÃO COM SUPABASE AUTH
   Gerencia login, logout e sessão do usuário.
   ================================================================ */

const auth = {
  session: null  // Armazena { user: {...}, access_token: '...', refresh_token: '...' }
};

/**
 * Persiste a sessão no localStorage.
 */
function persistSession() {
  if (auth.session) {
    localStorage.setItem('sb_session', JSON.stringify(auth.session));
  }
}

/**
 * Renova o access token usando refresh token.
 * @returns {Promise<boolean>} true quando renovou com sucesso
 */
async function authRefreshSession() {
  const refreshToken = auth.session && auth.session.refresh_token;
  if (!refreshToken) return false;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_PUBLISHABLE,
      'Authorization': `Bearer ${SUPABASE_PUBLISHABLE}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!res.ok) return false;

  const data = await res.json();
  if (!data || !data.access_token || !data.user) return false;

  auth.session = {
    user: data.user,
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken
  };
  persistSession();
  return true;
}

/**
 * Faz login com email e senha usando Supabase Auth.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user, access_token}>}
 */
async function authLogin(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_PUBLISHABLE,
      'Authorization': `Bearer ${SUPABASE_PUBLISHABLE}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const err = await res.json();
    if (err.error === 'email_not_confirmed') {
      throw new Error(MESSAGES.auth.emailNotConfirmed);
    }
    throw new Error(err.error === 'invalid_credentials' ? MESSAGES.auth.invalidCredentials : err.error_description || MESSAGES.auth.loginGeneric);
  }

  const data = await res.json();
  if (!data || !data.access_token || !data.user) {
    throw new Error(MESSAGES.auth.loginNoSession);
  }

  auth.session = {
    user: data.user,
    access_token: data.access_token,
    refresh_token: data.refresh_token || null
  };

  // Armazena a sessão no localStorage para persistência
  persistSession();

  return auth.session;
}

/**
 * Faz signup (cria uma conta) com email e senha.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user, access_token}>}
 */
async function authSignup(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_PUBLISHABLE,
      'Authorization': `Bearer ${SUPABASE_PUBLISHABLE}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || MESSAGES.auth.signupGeneric);
  }

  const data = await res.json();
  const accessToken = (data.session && data.session.access_token) || null;

  // Quando confirmação de email está habilitada, o Supabase pode criar usuário sem sessão.
  if (!accessToken) {
    return {
      user: data.user,
      access_token: null,
      requiresEmailConfirmation: true
    };
  }

  auth.session = {
    user: data.user,
    access_token: accessToken,
    refresh_token: (data.session && data.session.refresh_token) || null
  };

  persistSession();

  return {
    ...auth.session,
    requiresEmailConfirmation: false
  };
}

/**
 * Reenvia email de confirmação para um usuário pendente.
 * @param {string} email
 */
async function authResendConfirmation(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_PUBLISHABLE,
      'Authorization': `Bearer ${SUPABASE_PUBLISHABLE}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type: 'signup', email })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || err.error_description || MESSAGES.auth.resendGeneric);
  }
}

/**
 * Faz logout do usuário.
 */
async function authLogout() {
  // Avisa ao Supabase que o token está sendo revogado
  if (auth.session && auth.session.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE,
          'Authorization': `Bearer ${auth.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (_) {
      // Se falhar o logout remoto, continua mesmo assim
    }
  }

  // Limpa a sessão local
  auth.session = null;
  localStorage.removeItem('sb_session');
}

/**
 * Restaura a sessão do localStorage (se existir).
 * Para ser chamado na inicialização da página.
 */
function authRestoreSession() {
  const stored = localStorage.getItem('sb_session');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Só restaura sessão se houver token válido.
      if (!parsed || !parsed.access_token || !parsed.user) {
        localStorage.removeItem('sb_session');
        auth.session = null;
        return false;
      }
      if (!parsed.refresh_token) {
        parsed.refresh_token = null;
      }
      auth.session = parsed;
      return true;  // Sessão restaurada
    } catch (_) {
      localStorage.removeItem('sb_session');
    }
  }
  return false;  // Sem sessão
}

/* ----------------------------------------------------------------
   Indicador de sincronização (canto inferior direito).
   Estados: idle → saving → saved/error
   @param {'idle'|'saving'|'saved'|'error'} status
   @param {string} [msg] - mensagem de erro opcional
---------------------------------------------------------------- */
function setSyncStatus(status, msg) {
  // Busca os elementos visuais do indicador no canto inferior direito.
  const el    = document.getElementById('sync-status');
  const dot   = el.querySelector('.sync-dot');
  const label = el.querySelector('.sync-label');
  // Cada estado recebe uma cor diferente.
  const colors = { idle:'#4a4a58', saving:'#e8ff47', saved:'#86efac', error:'#ff5a5a' };
  // Cada estado também recebe uma mensagem curta.
  const texts  = { idle:'', saving:'Salvando...', saved:'Salvo ✓', error: msg || 'Erro ao salvar' };
  // Atualiza a cor do ponto.
  dot.style.background = colors[status];
  // Atualiza o texto visível.
  label.textContent    = texts[status];
  // Depois de salvar, volta para o estado neutro sozinho.
  if (status === 'saved') setTimeout(() => setSyncStatus('idle'), 2500);
}

let confirmDialogResolver = null;
let textDialogResolver = null;

/**
 * Abre um modal de confirmação e aguarda a resposta do usuário.
 * @param {string} title
 * @param {string} message
 * @param {string} confirmLabel
 * @returns {Promise<boolean>}
 */
function openConfirmDialog(title, message, confirmLabel = 'Sim, excluir') {
  const overlay = document.getElementById('confirm-overlay');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-ok').textContent = confirmLabel;
  overlay.classList.add('active');
  document.body.classList.add('modal-open');

  return new Promise(resolve => {
    confirmDialogResolver = resolve;
  });
}

function closeConfirmDialog(result) {
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.remove('active');
  document.body.classList.remove('modal-open');

  if (confirmDialogResolver) {
    const resolve = confirmDialogResolver;
    confirmDialogResolver = null;
    resolve(Boolean(result));
  }
}

/**
 * Abre um modal de texto e retorna o valor digitado.
 * Retorna null quando o usuário cancela.
 */
function openTextDialog({ title, label, placeholder, confirmLabel, initialValue = '' }) {
  const overlay = document.getElementById('text-modal-overlay');
  const titleEl = document.getElementById('text-modal-title');
  const labelEl = document.getElementById('text-modal-label');
  const inputEl = document.getElementById('text-modal-input');
  const confirmEl = document.getElementById('text-modal-confirm');

  titleEl.textContent = title;
  labelEl.textContent = label;
  inputEl.placeholder = placeholder || '';
  inputEl.value = initialValue;
  confirmEl.textContent = confirmLabel || 'Confirmar';

  overlay.classList.add('active');
  document.body.classList.add('modal-open');
  setTimeout(() => inputEl.focus(), 0);

  return new Promise(resolve => {
    textDialogResolver = resolve;
  });
}

function closeTextDialog(result) {
  const overlay = document.getElementById('text-modal-overlay');
  const inputEl = document.getElementById('text-modal-input');
  overlay.classList.remove('active');
  document.body.classList.remove('modal-open');
  inputEl.style.borderColor = '';

  if (textDialogResolver) {
    const resolve = textDialogResolver;
    textDialogResolver = null;
    resolve(result);
  }
}


/* ================================================================
   1. ESTADO GLOBAL
   Toda a interface é derivada desse objeto.
   Alterar o estado e chamar renderBoard() redesenha tudo.
   ================================================================ */
/*
  Pense no `state` como a memória da aplicação.
  Quando alguma informação muda aqui, a tela é redesenhada
  para mostrar a versão nova do quadro.
*/
const state = {
  // Controla o próximo número usado nos IDs criados localmente.
  nextId: 50,

  /* Controle de interface para a visualização compacta/expandida dos cards. */
  ui: {
    expandedCardId: null
  },

  /* Linhas: status do fluxo — percorrem todos os setores na horizontal.
     No layout transposto, estas são as LINHAS horizontais (antes chamadas de colunas). */
  lanes: [
    { id: 'lane-backlog',  title: 'Backlog',      color: '#5b8cff', collapsed: false },
    { id: 'lane-todo',     title: 'A Fazer',       color: '#a78bfa', collapsed: false },
    { id: 'lane-progress', title: 'Em Progresso',  color: '#fb923c', collapsed: false },
    { id: 'lane-waiting',  title: 'Aguardando',    color: '#f59e0b', collapsed: false },
    { id: 'lane-done',     title: 'Concluído',     color: '#34d399', collapsed: false }
  ],

  /* Colunas: setores/equipes — aparecem no cabeçalho horizontal do board.
     No layout transposto, estas são as COLUNAS verticais (antes chamadas de raias). */
  columns: [
    { id: 'col-n1',        title: 'Suporte N1',  color: '#6ee7f7' },
    { id: 'col-cadastro',  title: 'Cadastro',    color: '#c4b5fd' },
    { id: 'col-sac',       title: 'SAC',         color: '#f9a8d4' },
    { id: 'col-noc',       title: 'NOC / Rede',  color: '#fdba74' },
    { id: 'col-geral',     title: 'Geral',       color: '#86efac' }
  ],

  /* Cards: cada card pertence a uma coluna E a uma raia.
     A combinação [col_id + lane_id] define a célula onde o card aparece. */
  cards: [],

  /* Controle interno do drag-and-drop */
  drag: {
    // ID do card atualmente arrastado.
    cardId    : null,  // ID do card sendo arrastado
    // Guarda a célula de origem para referência no arraste.
    sourceCell: null   // "laneId:colId" da origem
  }
};


/* ================================================================
   2. UTILITÁRIOS
   ================================================================ */

/** Gera ID único com prefixo. Ex: genId('c') → 'c-51' */
function genId(prefix) {
  // Usa e incrementa o contador para evitar IDs repetidos.
  return `${prefix}-${state.nextId++}`;
}

/** Gera um ID estável para registros "owned" sem depender do estado local. */
function genOwnedId(prefix) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`;
}

/** Retorna o ID do usuário autenticado (ou null). */
function getCurrentUserId() {
  return (auth.session && auth.session.user && auth.session.user.id) || null;
}

/** Escapa HTML para evitar XSS ao inserir texto do usuário no DOM */
function escapeHtml(str) {
  // Se não houver texto, devolve vazio para evitar erro.
  if (!str) return '';
  // Troca caracteres especiais por entidades HTML seguras.
  return str
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/** Retorna o rótulo de exibição da tag (chip colorido nos cards) */
function tagLabel(tag) {
  // Traduz o valor interno da tag para um nome legível na interface.
  return {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
    // Compatibilidade com tags antigas já salvas no banco.
    blue: 'Diário',
    purple: 'Semanal',
    green: 'Mensal',
    white: 'Cadastro',
    orange: 'Manutenção',
    yellow: 'NPS'
  }[tag] || '';
}

/** Busca um card pelo ID em state.cards */
function findCard(cardId) {
  // `find` devolve o primeiro card com ID correspondente.
  return state.cards.find(c => c.id === cardId) || null;
}

/** Busca uma raia pelo ID */
function findLane(laneId) {
  return state.lanes.find(l => l.id === laneId) || null;
}

/** Busca uma coluna pelo ID */
function findColumn(colId) {
  return state.columns.find(c => c.id === colId) || null;
}

/** Retorna os cards que pertencem a uma célula específica [lane × col] */
function cardsInCell(laneId, colId) {
  // Filtra todos os cards que pertencem a essa combinação de raia e coluna.
  return state.cards.filter(c => c.lane_id === laneId && c.col_id === colId);
}


/* ================================================================
   3. LÓGICA DE DADOS — operações que alteram o state e persistem
   ================================================================ */

/**
 * Cria um novo card e o insere na célula [laneId × colId].
 * Persiste no Supabase.
 */
async function addCard(laneId, colId, title, desc, tag) {
  // Guarda a data atual para mostrar no card.
  const today   = new Date();
  const dateStr = today.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
  const createdAt = today.toISOString();

  const card = {
    // ID interno criado localmente.
    id      : genId('c'),
    // Raia onde o card vai aparecer.
    lane_id : laneId,
    // Coluna onde o card vai aparecer.
    col_id  : colId,
    // Título digitado pelo usuário.
    title   : title.trim(),
    // Descrição opcional; vira null se estiver vazia.
    desc    : desc.trim() || null,
    // Tag opcional; vira null quando não houver seleção.
    tag     : tag || null,
    // Data exibida no cartão.
    date    : dateStr,
    // Data de criação usada no aviso de periodicidade.
    created_at: createdAt,
    // Posição relativa dentro da célula.
    position: cardsInCell(laneId, colId).length
  };

  // Primeiro atualiza a memória local, depois tenta salvar no banco.
  state.cards.push(card);
  setSyncStatus('saving');

  try {
    /* No banco o campo usa "description" (não "desc") para evitar palavra reservada */
    const userId = getCurrentUserId();
    await sbFetch('POST', '/cards', {
      id         : card.id,
      owner_id   : userId,
      col_id     : card.col_id,
      lane_id    : card.lane_id,
      title      : card.title,
      description: card.desc,
      tag        : card.tag,
      date       : card.date,
      created_at : card.created_at,
      position   : card.position
    });
    setSyncStatus('saved');
  } catch (e) {
    // Alguns cenários de rede/retorno podem acusar erro mesmo com insert concluído.
    // Confirmamos no banco antes de exibir falha ao usuário.
    try {
      const check = await sbFetch('GET', `/cards?id=eq.${card.id}&select=id&limit=1`);
      if (Array.isArray(check) && check.length > 0) {
        setSyncStatus('saved');
      } else {
        setSyncStatus('error', MESSAGES.sync.saveCardError);
      }
    } catch (_) {
      setSyncStatus('error', MESSAGES.sync.saveCardError);
    }
    logDevError(e);
  }

  return card;
}

/**
 * Atualiza os dados de um card existente.
 */
async function updateCard(cardId, title, desc, tag) {
  const card = findCard(cardId);
  if (!card) return false;

  const previous = { title: card.title, desc: card.desc, tag: card.tag };

  card.title = title.trim();
  card.desc  = desc.trim() || null;
  card.tag   = tag || null;

  setSyncStatus('saving');
  try {
    await sbFetch('PATCH', `/cards?id=eq.${cardId}`, {
      title: card.title,
      description: card.desc,
      tag: card.tag
    });
    setSyncStatus('saved');
    return true;
  } catch (e) {
    // Reverte estado local se falhar no banco.
    card.title = previous.title;
    card.desc  = previous.desc;
    card.tag   = previous.tag;
    setSyncStatus('error', MESSAGES.sync.updateCardError);
    logDevError(e);
    return false;
  }
}

/**
 * Remove um card de state.cards e do banco.
 */
async function deleteCard(cardId) {
  const confirmed = await openConfirmDialog(
    'Excluir card',
    'Esta ação não pode ser desfeita.',
    'Excluir card'
  );
  closeConfirmDialog(confirmed);
  if (!confirmed) return false;

  // Encontra a posição do card dentro do array.
  const idx = state.cards.findIndex(c => c.id === cardId);
  if (idx === -1) return false;

  // Remove o card do estado local.
  state.cards.splice(idx, 1);
  setSyncStatus('saving');

  try {
    await sbFetch('DELETE', `/cards?id=eq.${cardId}`);
    setSyncStatus('saved');
  } catch (e) {
    setSyncStatus('error', MESSAGES.sync.deleteCardError);
    logDevError(e);
  }
  return true;
}

/**
 * Move um card para outra célula [targetLaneId × targetColId].
 * Isso é o coração do drag-and-drop entre raias e colunas.
 */
async function moveCard(cardId, targetLaneId, targetColId) {
  // Procura o card que será movido.
  const card = findCard(cardId);
  if (!card) return false;

  /* Não faz nada se a célula destino for a mesma de origem */
  if (card.lane_id === targetLaneId && card.col_id === targetColId) return false;

  // Atualiza o estado local antes de persistir, para a interface responder rápido.
  card.lane_id  = targetLaneId;
  card.col_id   = targetColId;
  card.position = cardsInCell(targetLaneId, targetColId).length - 1;

  setSyncStatus('saving');
  try {
    await sbFetch('PATCH', `/cards?id=eq.${cardId}`, {
      lane_id : targetLaneId,
      col_id  : targetColId,
      position: card.position
    });
    setSyncStatus('saved');
  } catch (e) {
    setSyncStatus('error', MESSAGES.sync.moveCardError);
    logDevError(e);
  }
  return true;
}

/**
 * Adiciona uma nova raia ao estado e persiste no Supabase.
 * (Por simplicidade, raias ficam na tabela "lanes" separada.)
 */
async function addLane(title) {
  // Usa uma paleta simples para variar a cor das novas raias.
  const colors = ['#6ee7f7','#c4b5fd','#f9a8d4','#fdba74','#86efac','#fde68a'];
  const color  = colors[state.lanes.length % colors.length];
  // Cria a nova raia em memória antes de salvar.
  const lane   = { id: genId('lane'), title, color, collapsed: false };
  state.lanes.push(lane);

  // Persistência: salva na tabela "lanes" se existir, senão ignora silenciosamente
  try {
    const userId = getCurrentUserId();
    await sbFetch('POST', '/lanes', { id: lane.id, owner_id: userId, title, color, position: state.lanes.length - 1 });
  } catch (_) { /* tabela opcional */ }

  return lane;
}

/**
 * Remove uma raia e todos os cards que pertencem a ela.
 */
async function deleteLane(laneId) {
  const confirmed = await openConfirmDialog(
    'Excluir linha',
    'Todos os cards desta linha também serão removidos.',
    'Excluir linha'
  );
  closeConfirmDialog(confirmed);
  if (!confirmed) return false;

  // Acha a raia pelo ID para poder removê-la.
  const idx = state.lanes.findIndex(l => l.id === laneId);
  if (idx === -1) return false;

  state.lanes.splice(idx, 1);

  /* Remove todos os cards da raia do state */
  const cardIds = state.cards.filter(c => c.lane_id === laneId).map(c => c.id);
  state.cards   = state.cards.filter(c => c.lane_id !== laneId);

  setSyncStatus('saving');
  try {
    /* Deleta os cards do banco um a um (alternativa: usar RPC ou filtro IN) */
    await Promise.all(cardIds.map(id => sbFetch('DELETE', `/cards?id=eq.${id}`)));
    setSyncStatus('saved');
  } catch (e) {
    setSyncStatus('error', MESSAGES.sync.deleteLaneError);
    logDevError(e);
  }
  return true;
}

/**
 * Remove uma coluna e todos os cards que pertencem a ela.
 */
async function deleteColumn(colId) {
  const confirmed = await openConfirmDialog(
    'Excluir coluna',
    'Todos os cards desta coluna também serão removidos.',
    'Excluir coluna'
  );
  closeConfirmDialog(confirmed);
  if (!confirmed) return false;

  // Acha a coluna pelo ID para poder removê-la.
  const idx = state.columns.findIndex(c => c.id === colId);
  if (idx === -1) return false;

  state.columns.splice(idx, 1);

  /* Remove todos os cards da coluna do state */
  const cardIds = state.cards.filter(c => c.col_id === colId).map(c => c.id);
  state.cards   = state.cards.filter(c => c.col_id !== colId);

  setSyncStatus('saving');
  try {
    /* Deleta a coluna do banco; o cascade remove os cards relacionados */
    await sbFetch('DELETE', `/columns?id=eq.${colId}`);
    setSyncStatus('saved');
  } catch (e) {
    setSyncStatus('error', MESSAGES.sync.deleteColumnError);
    logDevError(e);
  }
  return true;
}


/* ================================================================
   4. RENDERIZAÇÃO
   Funções que transformam o estado em elementos HTML.
   A regra é simples: sempre que o state muda, chamamos renderBoard().
   ================================================================ */

/**
 * Calcula se um card está atrasado baseado na data de criação e periodicidade.
 * @param {string} createdAt - ISO timestamp de criação
 * @param {string} tag - tipo de periodicidade (daily, weekly, monthly)
 * @returns {boolean} true se ultrapassou o período
 */
function isCardOverdue(createdAt, tag) {
  return getOverdueDays(createdAt, tag) > 0;
}

/**
 * Retorna quantos dias um card está em atraso considerando sua periodicidade.
 * @param {string} createdAt - ISO timestamp de criação
 * @param {string} tag - tipo de periodicidade (daily, weekly, monthly)
 * @returns {number} dias em atraso (0 quando não está atrasado)
 */
function getOverdueDays(createdAt, tag) {
  if (!createdAt || !tag) return 0;

  const normalizedTag = normalizePeriodTag(tag);
  if (!normalizedTag) return 0;

  const thresholdDays = {
    daily: 1,
    weekly: 7,
    monthly: 30
  }[normalizedTag];

  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const overdueDays = Math.floor(diffDays - thresholdDays);

  return overdueDays > 0 ? overdueDays : 0;
}

/**
 * Formata a data de criação para exibição.
 * @param {string} createdAt - ISO timestamp
 * @returns {string} data formatada (ex: "3 de maio")
 */
function formatCreatedDate(createdAt) {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

/**
 * Retorna o rótulo de tipo de periodicidade.
 * @param {string} tag - tipo de periodicidade
 * @returns {string} rótulo em português
 */
function getPeriodLabel(tag) {
  const normalizedTag = normalizePeriodTag(tag);
  const labels = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal'
  };
  return labels[normalizedTag] || tag;
}

/** Normaliza tags legadas para periodicidade padrão. */
function normalizePeriodTag(tag) {
  return {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    blue: 'daily',
    purple: 'weekly',
    green: 'monthly',
    orange: 'monthly'
  }[tag] || null;
}

/**
 * Renderiza um card individual (bloco arrastável).
 * @param {Object} card - objeto card do state
 * @returns {HTMLElement}
 */
function renderCard(card) {
  // Cria um elemento HTML vazio que vai virar o card visual.
  const el = document.createElement('div');
  el.className = 'card';
  if (state.ui.expandedCardId === card.id) {
    el.classList.add('is-expanded');
  }
  el.setAttribute('draggable', 'true');
  el.dataset.cardId = card.id;

  /* Faixa lateral colorida para identificar visualmente a tag */
  if (card.tag) {
    // Associa a cor visual do card à tag selecionada.
    const colorMap = {
      daily: 'var(--tag-1)',
      weekly: 'var(--tag-2)',
      monthly: 'var(--tag-3)',
      // Compatibilidade com tags antigas.
      blue: 'var(--tag-1)',
      purple: 'var(--tag-2)',
      green: 'var(--tag-3)',
      orange: 'var(--tag-3)',
      yellow: 'var(--tag-4)'
    };
    el.style.setProperty('--card-color', colorMap[card.tag] || 'transparent');
  }

  const overdueDays = getOverdueDays(card.created_at, card.tag);

  el.innerHTML = `
    ${overdueDays > 0 ? `
      <div class="card-details">
        <div class="card-warning overdue">
          <div class="card-warning-content">
            <div class="card-warning-date">${overdueDays} ${overdueDays === 1 ? 'dia' : 'dias'} em atraso</div>
          </div>
          <div class="card-warning-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l6 11H1L7 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
              <circle cx="7" cy="9" r="0.8" fill="currentColor"/>
              <line x1="7" y1="5" x2="7" y2="7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    ` : ''}
    <div class="card-header">
      <p class="card-title">${escapeHtml(card.title)}</p>
      <div class="card-actions">
        <button class="card-edit" data-id="${card.id}" title="Editar card" aria-label="Editar card">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 10l2.2-.5L9.8 3.9a1 1 0 0 0 0-1.4l-.3-.3a1 1 0 0 0-1.4 0L2.5 7.8 2 10z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7.5 2.8l1.7 1.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="card-delete" data-id="${card.id}" title="Remover card" aria-label="Remover card">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 3h9M2 3v7.5c0 0.83 0.67 1.5 1.5 1.5h5c0.83 0 1.5-0.67 1.5-1.5V3M4 3V1.5c0-0.28 0.22-0.5 0.5-0.5h3c0.28 0 0.5 0.22 0.5 0.5V3M5 5v4M7 5v4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="card-details">
      ${card.desc ? `<p class="card-desc">${escapeHtml(card.desc)}</p>` : ''}
      <div class="card-footer">
        <div class="card-tags">
          ${card.tag ? `<span class="tag tag-${card.tag}">${tagLabel(card.tag)}</span>` : ''}
        </div>
        ${card.date ? `
          <div class="card-date">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="1" y="1.5" width="8" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1"/>
              <path d="M3 1v1M7 1v1M1 4h8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            </svg>
            ${escapeHtml(card.date)}
          </div>` : ''}
      </div>
    </div>
  `;

  /* Drag-and-drop: registra o ID do card no evento de início do arraste */
  el.addEventListener('dragstart', e => {
    // Salva qual card está sendo arrastado para usarmos no drop depois.
    state.drag.cardId = card.id;
    state.ui.expandedCardId = null;
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => el.classList.add('dragging'), 0);
  });

  el.addEventListener('dragend', () => {
    // Remove a aparência de arrasto quando o usuário solta o card.
    el.classList.remove('dragging');
    state.drag.cardId = null;
    /* Remove todos os destaques visuais de drop restantes */
    document.querySelectorAll('.cell.cell-drag-over').forEach(c => c.classList.remove('cell-drag-over'));
  });

  /* Botão de exclusão do card */
  el.querySelector('.card-edit').addEventListener('click', e => {
    e.stopPropagation();
    openModal(card.lane_id, card.col_id, { mode: 'edit', cardId: card.id });
  });

  el.querySelector('.card-delete').addEventListener('click', async e => {
    // Evita que o clique no botão também ative ações do card inteiro.
    e.stopPropagation();
    const removed = await deleteCard(card.id);
    if (removed) renderBoard();
  });

  el.addEventListener('click', e => {
    const clickedButton = e.target.closest('button');
    if (clickedButton) return;

    state.ui.expandedCardId = state.ui.expandedCardId === card.id ? null : card.id;
    renderBoard();
  });

  return el;
}

/**
 * Renderiza uma célula individual da grade [lane × col].
 * Cada célula é um alvo de drop e pode conter N cards.
 * @param {string} laneId
 * @param {string} colId
 * @returns {HTMLElement}
 */
function renderCell(laneId, colId) {
  // Cada célula conhece a sua raia e a sua coluna.
  const el = document.createElement('div');
  el.className = 'cell';
  el.dataset.laneId = laneId;
  el.dataset.colId  = colId;

  const cards = cardsInCell(laneId, colId);

  if (cards.length === 0) {
    /* Área vazia: mostra dica visual de drop */
    const empty = document.createElement('div');
    empty.className = 'cell-empty';
    empty.textContent = 'Solte aqui';
    el.appendChild(empty);
  } else {
    // Quando existem cards, cada um é desenhado dentro da célula.
    cards.forEach(card => el.appendChild(renderCard(card)));
  }

  /* Botão "+" para adicionar card diretamente na célula */
  const addBtn = document.createElement('button');
  addBtn.className = 'cell-add-btn';
  addBtn.innerHTML = `
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
    Adicionar
  `;
  // O botão abre o formulário já apontando para esta célula.
  addBtn.addEventListener('click', () => openModal(laneId, colId));
  el.appendChild(addBtn);

  /* Drag-over: destaca a célula enquanto o card passa por cima */
  el.addEventListener('dragover', e => {
    // Sem preventDefault o navegador não permite receber o drop.
    if (!state.drag.cardId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('cell-drag-over');
  });

  el.addEventListener('dragleave', e => {
    /* Garante que não remove o destaque ao passar por um filho */
    if (!el.contains(e.relatedTarget)) {
      el.classList.remove('cell-drag-over');
    }
  });

  /* Drop: move o card para esta célula e redesenha tudo */
  el.addEventListener('drop', async e => {
    // Quando soltar o card, pegamos o ID guardado no arraste.
    e.preventDefault();
    el.classList.remove('cell-drag-over');

    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    // Atualiza o estado e depois redesenha a tela.
    await moveCard(cardId, laneId, colId);
    renderBoard();
  });

  return el;
}

/**
 * Renderiza uma linha de raia completa:
 * - Label lateral da raia (com cor e nome)
 * - Uma célula para cada coluna existente
 * @param {Object} lane - objeto raia do state
 * @returns {HTMLElement}
 */
function renderLaneRow(lane) {
  // Monta uma linha inteira: a etiqueta da raia à esquerda e as células à direita.
  const row = document.createElement('div');
  row.className = 'lane-row';
  row.dataset.laneId = lane.id;

  /* ── Label lateral ────────────────────────────────────────── */
  const label = document.createElement('div');
  label.className = 'lane-label';

  const totalCards = state.cards.filter(c => c.lane_id === lane.id).length;

  label.innerHTML = `
    <div class="lane-label-bar" style="background:${lane.color}"></div>
    <div class="lane-label-body">
      <div class="lane-label-top">
        <span class="lane-label-title">${escapeHtml(lane.title)}</span>
        <span class="lane-label-count">${totalCards}</span>
      </div>
      <div class="lane-label-actions">
        <button class="lane-btn-collapse" data-lane="${lane.id}" title="${lane.collapsed ? 'Expandir' : 'Recolher'}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="transform:rotate(${lane.collapsed ? '180deg' : '0deg'});transition:transform .2s">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="lane-btn-delete btn-icon danger" data-lane="${lane.id}" title="Remover raia">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  /* Colapsar/expandir a raia inteira */
  label.querySelector('.lane-btn-collapse').addEventListener('click', () => {
    // Inverte o estado de recolhimento da raia.
    lane.collapsed = !lane.collapsed;
    renderBoard();
  });

  /* Excluir a raia (com confirmação se houver cards) */
  label.querySelector('.lane-btn-delete').addEventListener('click', async () => {
    const removed = await deleteLane(lane.id);
    if (removed) renderBoard();
  });

  row.appendChild(label);

  /* ── Células (uma por coluna) ─────────────────────────────── */
  const cells = document.createElement('div');
  cells.className = 'lane-cells';

  if (lane.collapsed) {
    /* Quando recolhida, mostra só um resumo horizontal */
    const summary = document.createElement('div');
    summary.className = 'lane-collapsed-summary';
    summary.textContent = `${totalCards} card${totalCards !== 1 ? 's' : ''} nesta linha — clique em ▾ para expandir`;
    cells.appendChild(summary);
  } else {
    state.columns.forEach(col => cells.appendChild(renderCell(lane.id, col.id)));
  }

  row.appendChild(cells);
  return row;
}

/**
 * Redesenha o board inteiro a partir do state.
 * Estrutura: cabeçalho de colunas + uma linha de raia por lane.
 */
function renderBoard() {
  // Limpa tudo antes de desenhar de novo para evitar duplicações na tela.
  const board = document.getElementById('board');
  board.innerHTML = '';

  /* ── Cabeçalho de colunas (linha fixa no topo do grid) ──── */
  const colHeader = document.createElement('div');
  colHeader.className = 'board-col-header';

  /* Célula fantasma no canto superior esquerdo (alinha com o label das linhas) */
  const cornerCell = document.createElement('div');
  cornerCell.className = 'board-corner';
  cornerCell.innerHTML = '<span class="board-corner-label">Status ↓ / Setor →</span>';
  colHeader.appendChild(cornerCell);

  /* Uma célula de cabeçalho para cada coluna */
  state.columns.forEach(col => {
    // Para cada coluna, criamos a célula de cabeçalho com seu nome e contador.
    const th = document.createElement('div');
    th.className = 'col-header-cell';

    const totalInCol = state.cards.filter(c => c.col_id === col.id).length;

    th.innerHTML = `
      <div class="col-header-inner">
        <span class="column-dot" style="background:${col.color}"></span>
        <span class="col-header-title">${escapeHtml(col.title)}</span>
        <span class="column-count">${totalInCol}</span>
        <button class="col-btn-delete btn-icon danger" data-col="${col.id}" title="Remover coluna" aria-label="Remover coluna">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;

    th.querySelector('.col-btn-delete').addEventListener('click', async () => {
      const removed = await deleteColumn(col.id);
      if (removed) renderBoard();
    });

    colHeader.appendChild(th);
  });

  board.appendChild(colHeader);

  /* ── Linhas de raia ────────────────────────────────────────── */
  state.lanes.forEach(lane => board.appendChild(renderLaneRow(lane)));

  /* ── Atualiza o meta do header ───────────────────────────── */
  const totalCards = state.cards.length;
  document.getElementById('board-meta').textContent =
    `${state.columns.length} colunas · ${state.lanes.length} linhas · ${totalCards} cards`;
}


/* ================================================================
   5. MODAL — ADICIONAR CARD
   ================================================================ */

/**
 * Abre o modal de criação de card.
 * Guarda qual célula [lane × col] receberá o card.
 * @param {string} laneId
 * @param {string} colId
 */
function openModal(laneId, colId, options = {}) {
  // Descobre o nome da raia e da coluna para mostrar isso no título do modal.
  const lane = findLane(laneId);
  const col  = findColumn(colId);
  const isEditMode = options.mode === 'edit';
  const card = isEditMode ? findCard(options.cardId) : null;

  // Guarda a célula escolhida para usar depois no salvamento.
  state.modal = { laneId, colId, mode: isEditMode ? 'edit' : 'create', cardId: options.cardId || null };

  const laneTitle = lane && lane.title ? lane.title : 'Raia';
  const colTitle = col && col.title ? col.title : 'Coluna';
  document.getElementById('modal-title').textContent =
    `${isEditMode ? 'Editar card' : 'Novo card'} · ${laneTitle} / ${colTitle}`;
  document.getElementById('input-title').value = isEditMode ? ((card && card.title) || '') : '';
  document.getElementById('input-desc').value  = isEditMode ? ((card && card.desc) || '') : '';
  document.getElementById('input-tag').value   = isEditMode ? ((card && card.tag) || '') : '';
  document.getElementById('modal-confirm').textContent = isEditMode ? 'Salvar alterações' : 'Adicionar Card';
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById('input-title').focus();
}

function closeModal() {
  // Esconde a janela e limpa a referência da célula ativa.
  document.getElementById('modal-overlay').classList.remove('active');
  document.getElementById('modal-confirm').textContent = 'Adicionar Card';
  state.modal = null;
}

async function confirmModal() {
  // Pega o título digitado pelo usuário e remove espaços extras.
  const titleEl = document.getElementById('input-title');
  const title   = titleEl.value.trim();

  if (!title) {
    titleEl.focus();
    titleEl.style.borderColor = 'var(--danger)';
    return;
  }
  titleEl.style.borderColor = '';

  const desc = document.getElementById('input-desc').value;
  const tag  = document.getElementById('input-tag').value;

  if (state.modal && state.modal.mode === 'edit' && state.modal.cardId) {
    await updateCard(state.modal.cardId, title, desc, tag);
  } else {
    // Cria o card usando a célula salva quando o modal foi aberto.
    await addCard(state.modal.laneId, state.modal.colId, title, desc, tag);
  }
  closeModal();
  renderBoard();
}


/* ================================================================
   6. EVENT LISTENERS GLOBAIS
   ================================================================ */

// Fecha ou confirma o modal pelos botões na janela.
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-confirm').addEventListener('click', confirmModal);

/* Fechar clicando fora do modal */
document.getElementById('modal-overlay').addEventListener('click', e => {
  // Só fecha se o clique for no fundo escuro, não dentro da caixa do modal.
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.getElementById('confirm-cancel').addEventListener('click', () => closeConfirmDialog(false));
document.getElementById('confirm-ok').addEventListener('click', () => closeConfirmDialog(true));

document.getElementById('confirm-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('confirm-overlay')) closeConfirmDialog(false);
});

document.getElementById('text-modal-cancel').addEventListener('click', () => closeTextDialog(null));

document.getElementById('text-modal-confirm').addEventListener('click', () => {
  const inputEl = document.getElementById('text-modal-input');
  const value = inputEl.value.trim();
  if (!value) {
    inputEl.style.borderColor = 'var(--danger)';
    inputEl.focus();
    return;
  }
  closeTextDialog(value);
});

document.getElementById('text-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('text-modal-overlay')) closeTextDialog(null);
});

/* Atalhos de teclado: Escape fecha, Enter confirma */
document.addEventListener('keydown', e => {
  const textOverlay = document.getElementById('text-modal-overlay');
  if (textOverlay.classList.contains('active')) {
    if (e.key === 'Escape') closeTextDialog(null);
    if (e.key === 'Enter') {
      const inputEl = document.getElementById('text-modal-input');
      const value = inputEl.value.trim();
      if (!value) {
        inputEl.style.borderColor = 'var(--danger)';
        inputEl.focus();
      } else {
        closeTextDialog(value);
      }
    }
    return;
  }

  const confirmOverlay = document.getElementById('confirm-overlay');
  if (confirmOverlay.classList.contains('active')) {
    if (e.key === 'Escape') closeConfirmDialog(false);
    return;
  }

  // Primeiro verifica se o modal está aberto.
  const overlay = document.getElementById('modal-overlay');
  if (!overlay.classList.contains('active')) return;
  // Escape fecha a janela.
  if (e.key === 'Escape') closeModal();
  // Enter confirma quando o foco está no campo de título.
  if (e.key === 'Enter' && e.target.id === 'input-title') confirmModal();
});


/* ================================================================
   EVENT LISTENERS: AUTENTICAÇÃO
   ================================================================ */

const loginSubmitBtn = document.getElementById('login-submit');
const loginPasswordInput = document.getElementById('login-password');
const loginSignupToggle = document.getElementById('login-signup-toggle');
const loginResendRow = document.getElementById('login-resend-row');
const loginResendBtn = document.getElementById('login-resend-confirmation');
let pendingConfirmationEmail = '';

function showResendConfirmation(email = '') {
  pendingConfirmationEmail = email || pendingConfirmationEmail;
  if (loginResendRow) loginResendRow.style.display = 'block';
}

function hideResendConfirmation() {
  if (loginResendRow) loginResendRow.style.display = 'none';
}

if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    if (!email || !password) {
      if (errorEl) {
        errorEl.textContent = MESSAGES.auth.fillEmailPassword;
        errorEl.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Entrando...';
    }
    if (errorEl) errorEl.style.display = 'none';
    hideResendConfirmation();

    try {
      await authLogin(email, password);
      // Sessão criada com sucesso — esconde o login e mostra o board
      hideLoginOverlay();
      loadFromSupabase();
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
      if (String(err.message || '').includes('não foi confirmado')) {
        showResendConfirmation(email);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
      }
    }
  });
} else {
}

if (loginPasswordInput) {
  loginPasswordInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      const submitBtn = document.getElementById('login-submit');
      if (submitBtn) submitBtn.click();
    }
  });
}

if (loginSignupToggle) {
  loginSignupToggle.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    if (!email || !password) {
      if (errorEl) {
        errorEl.textContent = MESSAGES.auth.fillEmailPassword;
        errorEl.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Criando conta...';
    }
    if (errorEl) errorEl.style.display = 'none';
    hideResendConfirmation();

    try {
      const signupResult = await authSignup(email, password);

      if (signupResult.requiresEmailConfirmation) {
        if (errorEl) {
          errorEl.textContent = MESSAGES.auth.signupNeedConfirmation;
          errorEl.style.display = 'block';
        }
        showResendConfirmation(email);
        return;
      }

      // Conta criada com sessão ativa — esconde o login e mostra o board
      hideLoginOverlay();
      loadFromSupabase();
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
      }
    }
  });
} else {
}

if (loginResendBtn) {
  loginResendBtn.addEventListener('click', async () => {
    const emailInput = document.getElementById('login-email');
    const errorEl = document.getElementById('login-error');
    const email = ((emailInput ? emailInput.value : '') || pendingConfirmationEmail || '').trim();

    if (!email) {
      if (errorEl) {
        errorEl.textContent = MESSAGES.auth.askEmailToResend;
        errorEl.style.display = 'block';
      }
      return;
    }

    try {
      await authResendConfirmation(email);
      if (errorEl) {
        errorEl.textContent = MESSAGES.auth.resendSent;
        errorEl.style.display = 'block';
      }
      pendingConfirmationEmail = email;
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    }
  });
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await authLogout();
    // Mostra o login novamente
    showLoginOverlay();
    // Limpa o board
    const board = document.getElementById('board');
    if (board) board.innerHTML = '';
  });
} else {
}

const themeToggleBtn = document.getElementById('theme-toggle-btn');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', toggleTheme);
}

function showLoginOverlay() {
  const overlay = document.getElementById('login-overlay');
  const header = document.querySelector('header');
  const mainBoard = document.getElementById('board');
  
  if (!overlay) {
    logDevError('[AUTH] ERRO: login-overlay não encontrado!');
    return;
  }
  
  overlay.style.display = 'flex';
  overlay.style.visibility = 'visible';
  overlay.style.opacity = '1';
  overlay.style.pointerEvents = 'all';
  
  if (header) header.style.display = 'none';
  if (mainBoard) mainBoard.style.display = 'none';
  
  // Limpa os campos
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  
  if (emailInput) emailInput.value = '';
  if (passwordInput) passwordInput.value = '';
  if (errorEl) errorEl.style.display = 'none';
  
  // Foca no email
  if (emailInput) setTimeout(() => emailInput.focus(), 100);
  
}

function hideLoginOverlay() {
  const overlay = document.getElementById('login-overlay');
  const header = document.querySelector('header');
  const mainBoard = document.getElementById('board');
  
  if (overlay) {
    overlay.style.display = 'none';
    overlay.style.visibility = 'hidden';
  }
  
  if (header) header.style.display = 'flex';
  if (mainBoard) mainBoard.style.display = 'block';
  
  // Atualiza o nome do usuário no header
  const userEmail = document.getElementById('user-email');
  if (userEmail && auth.session && auth.session.user && auth.session.user.email) {
    userEmail.textContent = auth.session.user.email;
  }
  
}

async function createColumnFlow() {
  const name = await openTextDialog({
    title: 'Nova Coluna',
    label: 'Nome da nova coluna (setor)',
    placeholder: 'Ex: Financeiro, SAC, NOC',
    confirmLabel: 'Criar Coluna'
  });
  if (!name) return;

  const colors = ['#6ee7f7','#c4b5fd','#fdba74','#86efac','#f9a8d4','#fde68a'];
  const color  = colors[state.columns.length % colors.length];
  const col    = { id: genId('col'), title: name, color };
  state.columns.push(col);

  setSyncStatus('saving');
  try {
    const userId = getCurrentUserId();
    await sbFetch('POST', '/columns', { id: col.id, owner_id: userId, title: col.title, color, position: state.columns.length - 1 });
    setSyncStatus('saved');
  } catch (e) {
    setSyncStatus('error', MESSAGES.sync.createColumnError);
    logDevError(e);
  }
  renderBoard();
}

async function createLaneFlow() {
  const name = await openTextDialog({
    title: 'Nova Linha',
    label: 'Nome da nova linha (status)',
    placeholder: 'Ex: Backlog, Em Progresso, Concluído',
    confirmLabel: 'Criar Linha'
  });
  if (!name) return;

  await addLane(name);
  renderBoard();
}


/* Botão de adição unificado (+) */
const addItemBtn = document.getElementById('add-item-btn');
const addItemMenu = document.getElementById('add-item-menu');
const addItemColumn = document.getElementById('add-item-column');
const addItemLane = document.getElementById('add-item-lane');

if (addItemBtn && addItemMenu) {
  addItemBtn.addEventListener('click', e => {
    e.stopPropagation();
    addItemMenu.classList.toggle('open');
    addItemMenu.setAttribute('aria-hidden', addItemMenu.classList.contains('open') ? 'false' : 'true');
  });

  document.addEventListener('click', e => {
    if (!addItemMenu.classList.contains('open')) return;
    const wrap = document.querySelector('.add-menu-wrap');
    if (wrap && !wrap.contains(e.target)) {
      addItemMenu.classList.remove('open');
      addItemMenu.setAttribute('aria-hidden', 'true');
    }
  });
}

if (addItemColumn) {
  addItemColumn.addEventListener('click', async () => {
    if (addItemMenu) {
      addItemMenu.classList.remove('open');
      addItemMenu.setAttribute('aria-hidden', 'true');
    }
    await createColumnFlow();
  });
}

if (addItemLane) {
  addItemLane.addEventListener('click', async () => {
    if (addItemMenu) {
      addItemMenu.classList.remove('open');
      addItemMenu.setAttribute('aria-hidden', 'true');
    }
    await createLaneFlow();
  });
}


/* ================================================================
   7. INICIALIZAÇÃO — carrega dados do Supabase e monta o board
   ================================================================ */

/**
 * Tenta carregar colunas, raias e cards do Supabase.
 * Se a URL não estiver configurada ou falhar, usa os dados do state.
 */
async function loadFromSupabase() {
  // Se a URL ainda estiver no valor padrão, o app sobe só com os dados locais.
  if (SUPABASE_URL === 'COLE_SUA_URL_AQUI') {
    renderBoard();
    return;
  }

  // Mostra que o carregamento ainda está acontecendo.
  setSyncStatus('saving');
  document.getElementById('board').innerHTML =
    '<div style="padding:40px;color:var(--text-secondary);font-size:.88rem">Carregando...</div>';

  try {
    /* Busca colunas, cards (e raias se a tabela existir) em paralelo */
    const [columns, cards] = await Promise.all([
      sbFetch('GET', '/columns?order=position.asc'),
      sbFetch('GET', '/cards?order=position.asc')
    ]);

    /* Carrega raias (tabela opcional — mantém as padrão se não existir) */
    let lanes = null;
    try {
      lanes = await sbFetch('GET', '/lanes?order=position.asc');
    } catch (_) { /* tabela inexistente → usa lanes do state */ }

    /* Reconstrói as colunas do state com os dados do banco */
    if (columns && columns.length) {
      // Converte os dados do banco para o formato esperado pelo app.
      state.columns = columns.map(col => ({
        id   : col.id,
        title: col.title,
        color: col.color || '#7a7a8c'
      }));
    }

    /* Reconstrói as raias do state com os dados do banco */
    if (lanes && lanes.length) {
      // Recria as raias carregadas do Supabase.
      state.lanes = lanes.map(l => ({
        id       : l.id,
        title    : l.title,
        color    : l.color || '#6ee7f7',
        collapsed: false
      }));
    }

    // Se não houver colunas/raias para este usuário (comum após ativar RLS), cria um conjunto inicial owned.
    if ((!(columns && columns.length) || !(lanes && lanes.length)) && getCurrentUserId()) {
      const userId = getCurrentUserId();

      if (!(columns && columns.length)) {
        const baseCols = [...state.columns];
        const seededCols = baseCols.map((col, index) => ({
          id: genOwnedId('col'),
          owner_id: userId,
          title: col.title,
          color: col.color || '#7a7a8c',
          position: index
        }));

        await Promise.all(seededCols.map(col =>
          sbFetch('POST', '/columns', col)
        ));

        state.columns = seededCols.map(col => ({
          id: col.id,
          title: col.title,
          color: col.color
        }));
      }

      if (!(lanes && lanes.length)) {
        const baseLanes = [...state.lanes];
        const seededLanes = baseLanes.map((lane, index) => ({
          id: genOwnedId('lane'),
          owner_id: userId,
          title: lane.title,
          color: lane.color || '#6ee7f7',
          position: index
        }));

        await Promise.all(seededLanes.map(lane =>
          sbFetch('POST', '/lanes', lane)
        ));

        state.lanes = seededLanes.map(lane => ({
          id: lane.id,
          title: lane.title,
          color: lane.color,
          collapsed: false
        }));
      }
    }

    /* Reconstrói os cards — cada card agora tem lane_id e col_id */
    if (cards && cards.length) {
      // Converte cada card do banco para o formato interno da tela.
      state.cards = cards.map(c => ({
        id     : c.id,
        col_id : c.col_id,
        lane_id: c.lane_id || (state.lanes[0] ? state.lanes[0].id : null), // fallback para primeira raia
        title  : c.title,
        desc   : c.description,  // banco usa "description"; state usa "desc"
        tag    : c.tag,
        date   : c.date,
        created_at: c.created_at
      }));
    }

    /* Garante que novos IDs não colidam com os existentes */
    const allNums = [...(columns||[]), ...(cards||[]), ...(lanes||[])]
      .map(r => parseInt(r.id.replace(/\D/g,''), 10))
      .filter(n => !isNaN(n));
    // Ajusta o contador para que os próximos IDs não repitam valores antigos.
    if (allNums.length) state.nextId = Math.max(...allNums) + 1;

    setSyncStatus('saved');
  } catch (e) {
    // Se a conexão falhar, o app continua usando os dados carregados no state.
    const connectMsg = resolveSupabaseConnectMessage(e);
    setSyncStatus('error', connectMsg);

    logDevError('Erro ao carregar Supabase:', e);
    /* Fallback: usa dados locais do state */
  }

  renderBoard();
}

/* ================================================================
   INICIALIZAÇÃO
   Verifica se há sessão salva; se sim, carrega o board;
   senão, mostra a tela de login.
   ================================================================ */

// Aguarda o DOM estar pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM já foi carregado
  initializeApp();
}

function initializeApp() {
  initTheme();

  try {
    // Verifica se há sessão salva
    if (authRestoreSession()) {
      hideLoginOverlay();
      loadFromSupabase();
    } else {
      // Garante que o board e header estão escondidos
      const board = document.getElementById('board');
      const header = document.querySelector('header');
      if (board) board.style.display = 'none';
      if (header) header.style.display = 'none';
      
      // Mostra o login
      showLoginOverlay();
      handleAuthHashError();
    }
  } catch (err) {
    logDevError('[APP] ERRO na inicialização:', err);
    // Tenta mostrar login mesmo assim
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      overlay.style.display = 'flex' ;
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'all';
    }
    alert(MESSAGES.app.initError);
  }
}

function handleAuthHashError() {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#')) return;

  const params = new URLSearchParams(hash.slice(1));
  const errorCode = params.get('error_code');
  const errorEl = document.getElementById('login-error');

  if (errorCode === 'otp_expired') {
    if (errorEl) {
      errorEl.textContent = MESSAGES.auth.otpExpired;
      errorEl.style.display = 'block';
    }
    showResendConfirmation();
  }

  // Limpa o hash para evitar reapresentar o erro ao recarregar.
  if (errorCode) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
