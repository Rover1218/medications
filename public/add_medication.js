document.getElementById('add-medication-form').addEventListener('submit', function (event) {
    const name = document.querySelector('input[name="name"]').value.trim();
    const dosage = document.querySelector('input[name="dosage"]').value.trim();
    const frequency = document.querySelector('input[name="frequency"]').value.trim();
    const startDate = document.querySelector('input[name="start_date"]').value.trim();

    if (!name || !dosage || !frequency || !startDate) {
        event.preventDefault();
        alert('Please fill in all fields before submitting.');
    }
});
