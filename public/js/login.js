document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorDiv = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');
    const loginButton = document.getElementById('login-button');

    try {
        // Show loading state
        loadingSpinner.classList.remove('hidden');
        loginButton.disabled = true;

        const response = await fetch('/api/auth/login', { // Changed from /auth/login
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: document.getElementById('login-username').value,
                password: document.getElementById('login-password').value
            })
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = '/';
        } else {
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.classList.remove('hidden');
    } finally {
        loadingSpinner.classList.add('hidden');
        loginButton.disabled = false;
    }
});
