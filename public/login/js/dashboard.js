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
    window.location.href = '../index.html';
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  document.getElementById('user-name').textContent = profile?.name || user.user_metadata?.full_name || user.email;
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('user-avatar').src = user.user_metadata?.avatar_url || '../img/favicon.png';
}


const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '../index.html';
  });
}

window.addEventListener('DOMContentLoaded', getUserAndProfile);
