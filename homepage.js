document.addEventListener('DOMContentLoaded', async () => {
    // Retrieve token from local storage
    const token = localStorage.getItem('authToken');

    // Redirect to index.html (login page) if token is not found
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Fetch user profile data from the server
    try {
        const response = await fetch('/user-profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Check if response is okay
        if (response.ok) {
            const user = await response.json();
            
            // Check if user data is valid
            if (user) {
                const profilePhotoElement = document.getElementById('profile-photo');
                const userNameElement = document.getElementById('user-name');
                
                // Set profile photo src
                if (user.photo) {
                    profilePhotoElement.src = `${user.photo}`;
               
                } else {
                    profilePhotoElement.src = '/path/to/default/profile-pic.jpg'; // Use a default image if no photo
                }

                // Set user name
                userNameElement.textContent = user.username || 'Unknown User'; // Fallback if username is not provided
            } else {
                console.error('User data is invalid or empty.');
                window.location.href = '/index.html'; // Redirect if user data is not valid
            }
        } else {
            console.error('Failed to fetch user profile', await response.text()); // Log the error message from the server
            window.location.href = '/index.html'; // Redirect to index.html if fetching user profile fails
        }
    } catch (err) {
        console.error('Error:', err);
        window.location.href = '/index.html'; // Redirect to index.html if there’s a network or server error
    }

    // Logout functionality
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = '/index.html'; // Redirect to index.html after logout
        });
    } else {
        console.error('Logout button not found in the DOM.');
    }
});
