const SUPABASE_URL = window.ENV?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY;
const REDIRECT_TO = window.ENV?.REDIRECT_TO || (window.location.origin + '/login/dashboard.html');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  alert('Supabase environment variables are not set. Please check your Netlify configuration.');
  throw new Error('Missing Supabase environment variables');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getUserAndProfile() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    window.location.href = '/login/';
    return;
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  document.getElementById('user-name').textContent = profile?.name || user.user_metadata?.full_name || user.email;
  document.getElementById('user-email').textContent = profile?.email || user.email;
  document.getElementById('user-avatar').src = profile?.avatar_url || user.user_metadata?.avatar_url || '../img/favicon.png';

  document.getElementById('profile-detail-name').textContent = profile?.name || user.user_metadata?.full_name || user.email;
  document.getElementById('profile-detail-email').textContent = profile?.email || user.email;

  const createdAtEl = document.getElementById('created-at-value');
  if (createdAtEl && user.created_at) {
    const date = new Date(user.created_at);
    createdAtEl.textContent = date.toLocaleString();
  } else if (createdAtEl) {
    createdAtEl.textContent = '-';
  }

  const lastLoginEl = document.getElementById('last-login-value');
  if (lastLoginEl && user.last_sign_in_at) {
    const date = new Date(user.last_sign_in_at);
    lastLoginEl.textContent = date.toLocaleString();
  } else if (lastLoginEl) {
    lastLoginEl.textContent = '-';
  }

  const profileStatusEl = document.getElementById('profile-status');
  if (profileStatusEl) {
    if (profile && profile.name) {
      profileStatusEl.textContent = 'Active';
      profileStatusEl.className = 'th-text-success';
    } else {
      profileStatusEl.textContent = 'Incomplete';
      profileStatusEl.className = 'th-text-warning';
    }
  }

  const roleEl = document.getElementById('profile-role-value');
  if (roleEl) {
    if (user.role === 'authenticated') {
      roleEl.textContent = 'Account is protected';
    } else {
      roleEl.textContent = user.role || '-';
    }
  }
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/login/';
  });
}

async function handleDeleteAccount() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    alert('User not found');
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.SUPABASE_ANON_KEY;

  const response = await fetch('https://tcjxrlsebxdyoohcugsr.supabase.co/functions/v1/smart-task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ user_id: user.id })
  });
  const result = await response.json();
  if (result.success) {
    await supabase.auth.signOut();
    window.location.href = '/login/';
  } else {
    alert('Error deleting account: ' + (result.error || 'Unknown error'));
  }
}

document.getElementById('confirm-delete-btn').addEventListener('click', handleDeleteAccount);

window.addEventListener('DOMContentLoaded', getUserAndProfile);
