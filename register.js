document.getElementById('register-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append('username', document.getElementById('username').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('password', document.getElementById('password').value);
    formData.append('photo', document.getElementById('photo').files[0]);

    try {
        const response = await fetch('/register', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            // Hide registration form and show OTP form
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('otp-container').style.display = 'block';
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, otp })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            // Redirect to homepage or any other page
            window.location.href = result.redirectUrl;
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while verifying the OTP.');
    }
});
