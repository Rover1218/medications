# Medication Tracker

Medication Tracker is a web application designed to help users manage their medications, receive timely reminders, and track their adherence.

## Features

- Add, edit, and delete medications
- Set reminders for medications
- View medication schedule and adherence statistics
- User authentication and authorization
- Push notifications for medication reminders

## Technologies Used

- Node.js
- Express.js
- MongoDB
- EJS
- Tailwind CSS
- Service Workers for push notifications

## Setup Instructions

### Prerequisites

- Node.js and npm installed
- MongoDB instance (local or cloud)

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/your-username/medication-tracker.git
    cd medication-tracker
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory and add the following environment variables:

    ```properties
    MONGO_URI=your-mongodb-uri
    SECRET_KEY=your-secret-key
    PORT=3000
    NODE_ENV=development

    # Email Configuration
    EMAIL_SERVICE=gmail
    EMAIL_USER=your-email@gmail.com
    EMAIL_PASS=your-app-specific-password

    # Web Push Configuration
    VAPID_PUBLIC_KEY=your-vapid-public-key
    VAPID_PRIVATE_KEY=your-vapid-private-key
    ```

4. Start the application:

    ```bash
    npm start
    ```

5. Open your browser and navigate to `http://localhost:3000`.

## Usage

### Adding Medications

1. Log in to your account.
2. Navigate to the "Add Medication" page.
3. Fill in the medication details and set reminders.
4. Click "Add Medication" to save.

### Viewing Medications

1. Log in to your account.
2. Navigate to the "My Medications" page.
3. Use the search and filter options to find specific medications.

### Editing Medications

1. Navigate to the "My Medications" page.
2. Click the edit button next to the medication you want to edit.
3. Update the medication details and save.

### Deleting Medications

1. Navigate to the "My Medications" page.
2. Click the delete button next to the medication you want to delete.
3. Confirm the deletion.

### Receiving Notifications

1. Ensure notifications are enabled in your medication settings.
2. Allow notifications in your browser when prompted.
3. Receive push notifications for medication reminders.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License.