function setTheme(theme) {
    console.log('[setTheme] theme:', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme-mode', theme);
    const icon = document.getElementById('theme-icon');
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}
function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'light';
    console.log('[toggleTheme] current:', current);
    setTheme(current === 'dark' ? 'light' : 'dark');
}
window.addEventListener('DOMContentLoaded', function() {
    let theme = localStorage.getItem('theme-mode');
    console.log('[DOMContentLoaded] theme from localStorage:', theme);
    if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    setTheme(theme);
    document.getElementById('theme-toggle').onclick = toggleTheme;
    document.getElementById('logout-btn').onclick = async () => {
        console.log('[logout-btn] Clicked');
        await supabase.auth.signOut();
        showToast('You have been signed out.');
        setTimeout(() => { window.location.href = '/login/'; }, 1200);
    };
    if (window.location.hash && window.location.hash.includes('access_token')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    loadUser();
});
function showToast(msg) {
    let toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.position = 'fixed';
    toast.style.bottom = '32px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'var(--th-primary)';
    toast.style.color = '#23272f';
    toast.style.padding = '0.9em 2em';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 2px 12px #00ff4133';
    toast.style.fontWeight = '600';
    toast.style.zIndex = 9999;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 1100);
}
const SUPABASE_URL = window.ENV?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY;
const REDIRECT_TO = window.ENV?.REDIRECT_TO || (window.location.origin + '/login/dashboard.html');
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    document.getElementById('dashboard-loading').style.display = 'none';
    document.getElementById('dashboard-alert').style.display = 'block';
    document.getElementById('dashboard-alert').className = 'th-alert th-alert-danger';
    document.getElementById('dashboard-alert').textContent = 'Supabase environment variables are not set. Please check your Netlify configuration.';
    throw new Error('Missing Supabase environment variables');
}
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function loadUser() {
    try {
        console.log('[loadUser] called');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[loadUser] session:', session, 'error:', error);
        if (!session) {
            console.warn('[loadUser] No session, will redirect to /login/');
            window.location.href = '/login/';
            return;
        }
        const user = session.user;
        const avatar = document.getElementById('user-avatar');
        if (user.user_metadata && user.user_metadata.avatar_url) {
            avatar.src = user.user_metadata.avatar_url;
        } else {
            avatar.src = '../img/favicon.png';
        }
        document.getElementById('user-name').textContent = user.user_metadata.full_name || user.email;
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('created-at').textContent = user.created_at ? new Date(user.created_at).toLocaleString() : '-';
        let lastLogin = user.last_sign_in_at || user.user_metadata?.last_sign_in_at;
        if (!lastLogin && session.expires_at) lastLogin = new Date(session.expires_at * 1000).toISOString();
        document.getElementById('last-login').textContent = lastLogin ? new Date(lastLogin).toLocaleString() : '-';
        document.getElementById('dashboard-loading').style.display = 'none';
        upsertProfile(user);
    } catch (err) {
        console.error('[loadUser] error:', err);
        document.getElementById('dashboard-loading').style.display = 'none';
        document.getElementById('dashboard-alert').style.display = 'block';
        document.getElementById('dashboard-alert').className = 'th-alert th-alert-danger';
        document.getElementById('dashboard-alert').textContent = 'Error loading user session: ' + (err.message || err);
    }
}
async function upsertProfile(user) {
    if (!user) return;
    try {
        console.log('[upsertProfile] user:', user);
        const { error } = await supabase
            .from('profiles')
            .upsert([
                {
                    user_id: user.id,
                    name: user.user_metadata.full_name || user.email,
                    updated_at: new Date().toISOString()
                }
            ], { onConflict: ['user_id'] });
        if (error && error.code !== '42P01') {
            console.error('[upsertProfile] error:', error);
        }
    } catch (e) {
        console.error('[upsertProfile] exception:', e);
    }
} 
