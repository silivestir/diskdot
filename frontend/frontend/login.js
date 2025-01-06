document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            if (data.otpRequired) {
                document.getElementById('login-form').style.display = 'none';
                document.getElementById('otp-section').style.display = 'block';
            } else {
              alert(data.token)
                localStorage.setItem('authToken', data.token);
                window.location.href = data.redirectUrl; // Redirect to homepage
            }
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Error:', err);
    }
});

document.getElementById('otp-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const otp = document.getElementById('otp').value;
    
    try {
        const response = await fetch('/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            window.location.href = data.redirectUrl; // Redirect to homepage
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Error:', err);
    }
});
