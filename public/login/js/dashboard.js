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
  console.log('Fetched user:', user);
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
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/login/';
  });
}

window.addEventListener('DOMContentLoaded', getUserAndProfile);
