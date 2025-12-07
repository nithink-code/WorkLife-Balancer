// Authentication utility for handling token refresh and validation
class AuthUtils {
    static API_URL = 'http://localhost:8080';

    static isAuthenticated() {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        return !!(token && userId);
    }

    static getUserData() {
        if (!this.isAuthenticated()) {
            return null;
        }
        return {
            id: localStorage.getItem('userId'),
            email: localStorage.getItem('userEmail'),
            name: localStorage.getItem('userName')
        };
    }

    static async getValidToken() {
        let token = localStorage.getItem('token');
        let userId = localStorage.getItem('userId');

        if (!token || !userId) {
            console.warn('🚨 No token or userId found in localStorage');
            return null;
        }

        // Try to refresh/validate the token
        try {
            const response = await fetch(`${this.API_URL}/auth/verify`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    // Update token and user data
                    localStorage.setItem('token', data.token);
                    if (data.user) {
                        localStorage.setItem('userId', data.user.id);
                        localStorage.setItem('userEmail', data.user.email);
                        localStorage.setItem('userName', data.user.name);
                    }
                    ('✅ Token refreshed successfully');
                    return data.token;
                }
                return token; // Original token is still valid
            } else if (response.status === 401 || response.status === 403) {
                console.warn('🚨 Token expired, clearing storage');
                this.clearAuth();
                return null;
            } else {
                return token; // Use existing token anyway
            }
        } catch (error) {
            console.error('❌ Token validation error:', error);
            return token; // Use existing token anyway
        }
    }

    static clearAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        ('🗑️ Authentication data cleared');
    }

    static redirectToLogin() {
        this.clearAuth();
        try {
            const overlay = document.createElement('div');
            overlay.setAttribute('style', [
                'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.35)',
                'display:flex', 'align-items:center', 'justify-content:center',
                'z-index:9999', 'backdrop-filter:blur(2px)'
            ].join(';'));
            const spinner = document.createElement('div');
            spinner.setAttribute('style', [
                'width:48px', 'height:48px', 'border:4px solid #fff',
                'border-top-color:transparent', 'border-radius:50%',
                'animation:wlb-spin 0.8s linear infinite'
            ].join(';'));
            const style = document.createElement('style');
            style.textContent = '@keyframes wlb-spin { to { transform: rotate(360deg);} }';
            overlay.appendChild(spinner);
            document.body.appendChild(style);
            document.body.appendChild(overlay);
        } catch (e) { }
        window.location.href = '/';
    }

    static async makeAuthenticatedRequest(url, options = {}) {
        const token = await this.getValidToken();
        if (!token) {
            throw new Error('AUTHENTICATION_REQUIRED');
        }

        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        };

        const response = await fetch(url, authOptions);

        if (response.status === 401 || response.status === 403) {
            throw new Error('AUTHENTICATION_FAILED');
        }

        return response;
    }
}

export default AuthUtils;