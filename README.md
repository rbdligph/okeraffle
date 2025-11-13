
# Oke Raffle

Oke Raffle is a web-based application designed to streamline the raffle process for events. It allows users to register, receive a unique raffle number, and get a QR code for their entry. Event staff can manage registrations and raffle settings through an admin panel.

## Core Features

- **Registration Form**: Collect user information (email, full name) via a registration form.
- **Unique Number Generation**: Automatically assign a unique raffle number upon successful registration.
- **QR Code Generation**: Generate a QR code linking directly to the registration website.
- **Confirmation Email**: Send a confirmation email containing the user's raffle number.
- **Admin Panel**: A CMS allowing event staff to manage registrations and raffle settings.

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-repository/oke-raffle.git
```

2. Install dependencies:

```bash
npm install
```

## Setting up Local Environment Variables

Create a local environment file by copying the example:
```bash
cp env.example .env.local
```
Open .env.local (which is in your .gitignore and will not be committed) and fill in your Firebase project's "Web App" configuration values.

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-local-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-local-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-local-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-local-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-local-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-local-app-id
```

### Running the Application

```bash
npm run dev
```

This will start the development server at `http://localhost:3000`.

## Deployment

This application is a Next.js application and is deployed using Firebase App Hosting.

### Building the Application

To build the application for production, run the following command:

```bash
npm run build
```

This will create an optimized build of the application in the `.next` directory.

### Deploying to Firebase App Hosting

This project is configured for automated, continuous deployment from the production branch using Firebase App Hosting.

How it works: Pushing to the production branch automatically triggers a new build and deployment. The production environment variables are not pulled from .env.local; they are securely injected from Google Cloud Secret Manager during the build.

Key Configuration File: apphosting.yaml
This file tells App Hosting how to build the app and which secrets to inject.

```YAML
env:
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: NEXT_PUBLIC_FIREBASE_API_KEY
    availability: ['BUILD', 'RUNTIME']

  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    secret: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    availability: ['BUILD', 'RUNTIME']

  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    secret: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    availability: ['BUILD', 'RUNTIME']

  - variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    secret: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    availability: ['BUILD', 'RUNTIME']

  - variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    secret: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    availability: ['BUILD', 'RUNTIME']

  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    secret: NEXT_PUBLIC_FIREBASE_APP_ID
    availability: ['BUILD', 'RUNTIME']
```

### Initial Deployment Setup (One-Time Only)
If you are setting this up for the first time in a new Firebase project:

Connect Repository: In the Firebase Console, go to App Hosting and connect this GitHub repository.

Create Secrets: Run the following commands in your terminal to create the secrets in Google Secret Manager. You will be prompted to paste the secret value for each one.
```bash
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_PROJECT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID
```

Grant Access: You must grant your App Hosting backend permission to access these secrets.
```bash
firebase apphosting:backends:list
```
Using the Backend ID from that command (e.g., my-next-app), run the following:
```bash
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_FIREBASE_API_KEY --backend my-next-app
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN --backend my-next-app
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_FIREBASE_PROJECT_ID --backend my-next-app
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET --backend my-next-app
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --backend my-next-app
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_FIREBASE_APP_ID --backend my-next-app
```
Commit and push the apphosting.yaml file to your branch to trigger the first build.
```bash
git add apphosting.yaml
git commit -m "feat: Add App Hosting config"
git push origin main
```

### Ongoing Deployment
With the setup complete, deployment is fully automated. Just merge your changes to the production branch
