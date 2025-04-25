# Kanjisama Serverless App

A personalized dictionary application for learning Kanji, inspired by "Remembering The Kanji" (RTK), migrated to a serverless AWS architecture.

## Description

This application provides a simple web interface to:
* Search a personalized Kanji dataset (based on keywords, components, etc.).
* Compose Kanji strings.
* Look up composed strings via Google Translate.
* Look up composed strings via Jisho.org (using a backend proxy).

The application runs with a static frontend hosted on AWS Amplify (or S3/CloudFront) and a serverless backend using AWS API Gateway and AWS Lambda. The personalized Kanji data is stored as a JSON file bundled directly within a Lambda function for fast, database-less access.

## Features

* **Personal Kanji Search:** Dynamically search your Kanji data (stored in `backend/kanji_data.json`).
* **Jisho.org Proxy:** Look up terms on Jisho.org via a secure backend proxy (circumvents browser CORS limitations).
* **Google Translate Link:** Quickly open Google Translate with the composed Kanji.
* **Kanji Composer:** Input field to build Kanji sequences.
* **Serverless & Scalable:** Built using modern AWS serverless services.

## Architecture

```
+-------------------+      +---------------------+      +-------------------+
| User's Browser    | ---> | AWS Amplify Hosting | ---> | index.html, JS, CSS|
| (Frontend)        |      | (or S3/CloudFront)  |      +-------------------+
+-------------------+      +---------------------+
       | ▲
       │ │ API Calls (HTTPS)
       ▼ │
+-------------------+      +---------------------+      +-----------------------+
| API Gateway       | ---> | Lambda: queryKanji  | ---> | bundled kanji_data.json |
| (HTTP API)        |      +---------------------+      +-----------------------+
+-------------------+      |                     |
       │                   +---------------------+      +-------------------+
       └-----------------> | Lambda: proxyJisho  | ---> | Jisho.org API     |
                           +---------------------+      +-------------------+
```

## Project Structure

```
kanjisama-app/
├── frontend/           # Static website files (HTML, CSS, JS)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── backend/            # Serverless backend service (Node.js)
│   ├── serverless.yml  # Serverless Framework config
│   ├── handler.js      # Lambda function handlers
│   ├── kanji_data.json # Your personalized Kanji data!
│   ├── package.json
│   └── node_modules/   # (generated)
└── README.md           # This file
└── .gitignore          # Git ignore rules
```

## Prerequisites

* [Node.js](https://nodejs.org/) (v18.x or later recommended for Lambda runtime)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
* [AWS CLI](https://aws.amazon.com/cli/) configured with your AWS credentials (`aws configure`)
* [Serverless Framework](https://www.serverless.com/framework/docs/getting-started) (`npm install -g serverless`)
* [AWS Amplify CLI](https://docs.amplify.aws/cli/start/install/) (Optional, if using Amplify for frontend hosting) (`npm install -g @aws-amplify/cli`)

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd kanjisama-app
    ```
2.  **Install backend dependencies:**
    ```bash
    cd backend
    npm install
    cd ..
    ```

## Configuration

1.  **Kanji Data:**
    * Replace the placeholder `backend/kanji_data.json` with your actual Kanji data exported as a JSON array. Ensure the format matches what `backend/handler.js` expects (e.g., keys like `kanji`, `palabra`, `comp1`, `historia`, `similares`).
    * To update the data later, replace this file and redeploy the backend.
2.  **API Endpoint in Frontend:**
    * After deploying the backend (see below), copy the API Gateway endpoint URL.
    * Open `frontend/app.js` and update the `API_BASE_URL` constant:
        ```javascript
        const API_BASE_URL = 'YOUR_API_GATEWAY_ENDPOINT_URL'; // Replace with your actual URL
        ```

## Local Development (Optional)

1.  **Backend:**
    * You can simulate the API Gateway and Lambda functions locally using the Serverless Offline plugin.
    * `cd backend`
    * `npm install serverless-offline --save-dev` (if not already in `package.json`)
    * `sls offline start`
    * The backend API will be available at `http://localhost:3000` (by default). Update `API_BASE_URL` in `frontend/app.js` temporarily for local testing.
2.  **Frontend:**
    * You can serve the `frontend` directory using a simple local HTTP server (like `npx serve frontend/`) or VS Code's Live Server extension.
    * Ensure the frontend calls the correct local backend URL (`http://localhost:3000`).

## Deployment

1.  **Deploy Backend:**
    * Navigate to the backend directory:
        ```bash
        cd backend
        ```
    * Deploy using the Serverless Framework:
        ```bash
        sls deploy
        ```
    * **Important:** Copy the `endpoint` URL shown in the output. This is your API Gateway endpoint.
    * Update `API_BASE_URL` in `frontend/app.js` with this deployed endpoint URL.

2.  **Deploy Frontend (Choose one):**

    * **Using AWS Amplify:**
        1.  Navigate to the project root: `cd ..`
        2.  Initialize Amplify (if not already): `amplify init` (follow prompts)
        3.  Add hosting: `amplify add hosting` (select Hosting with Amplify Console)
        4.  Configure publish settings (usually point to `frontend` directory).
        5.  Publish: `amplify publish`
        6.  Amplify will provide the URL for your hosted frontend.

    * **Using S3 + CloudFront (Manual):**
        1.  Create an S3 bucket in your desired AWS region.
        2.  Configure the bucket for static website hosting (set index document to `index.html`).
        3.  Upload the contents of the `frontend` directory to the S3 bucket root.
        4.  (Recommended) Create a CloudFront distribution pointing to the S3 bucket origin (use the website endpoint, not the REST endpoint, or configure OAI for private buckets).
        5.  Use the S3 website URL or the CloudFront domain name to access the app.

## Usage

Once both backend and frontend are deployed:

1.  Navigate to the frontend URL provided by Amplify or CloudFront/S3.
2.  Use the search box (`#caja-busqueda`) to search your Kanji data.
3.  Use the composer box (`#caja-componer`) and the Jisho/Google buttons for lookups.

```