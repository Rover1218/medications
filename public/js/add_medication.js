function addNotificationTime() {
    const container = document.getElementById('notification-container');
    const timeInputs = container.getElementsByTagName('input');
    const frequency = parseInt(document.querySelector('input[name="frequency"]').value);

    if (timeInputs.length >= frequency) {
        showError('Maximum notification times reached based on frequency');
        return;
    }

    const newTimeDiv = document.createElement('div');
    newTimeDiv.className = 'd-flex align-items-center mb-2';
    newTimeDiv.innerHTML = `
        <input type="time" name="notification_times[]" class="form-control" required>
        <button type="button" class="btn btn-danger ms-2" onclick="removeNotificationTime(this)">-</button>
    `;

    container.appendChild(newTimeDiv);
}

function showError(message) {
    const errorDiv = document.getElementById('notification-error');
    errorDiv.textContent = message;
    setTimeout(() => errorDiv.textContent = '', 3000);
}

function removeNotificationTime(button) {
    button.parentElement.remove();
}

document.getElementById('add-medication-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const formData = new FormData(this);
    const notificationTimes = Array.from(document.querySelectorAll('input[name="notification_times[]"]'))
        .map(input => input.value)
        .filter(time => time);

    // Basic validation
    if (!formData.get('name') || !formData.get('dosage') || !formData.get('frequency') ||
        !formData.get('start_date') || !formData.get('end_date')) {
        showError('Please fill in all required fields');
        return;
    }

    // Convert form data to JSON
    const data = {
        name: formData.get('name'),
        dosage: formData.get('dosage'),
        frequency: parseInt(formData.get('frequency')),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date'),
        notifications_enabled: formData.get('notifications_enabled') === 'on',
        notification_email: formData.get('notification_email') === 'on',
        notification_push: formData.get('notification_push') === 'on',
        reminder_before: formData.get('reminder_before'),
        reminder_repeat: formData.get('reminder_repeat'),
        notification_times: notificationTimes
    };

    // Submit form data as JSON
    fetch('/add_medication', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                window.location.href = '/';
            } else {
                showError(result.message || 'Error adding medication');
            }
        })
        .catch(error => {
            showError('Error submitting form: ' + error.message);
        });
});

// Update max notification times when frequency changes
document.querySelector('input[name="frequency"]').addEventListener('change', function (event) {
    const frequency = parseInt(this.value);
    const container = document.getElementById('notification-container');
    const timeInputs = container.getElementsByTagName('input');

    while (timeInputs.length > frequency) {
        container.removeChild(container.lastChild);
    }
});
