# Kanjisama Serverless App - Deployment Guide

This guide details the steps to set up and deploy the Kanjisama application, which consists of:

* **Backend:** An AWS Lambda API managed by the Serverless Framework.
* **Frontend:** A static website hosted using AWS Amplify Hosting.

## Prerequisites

Before you begin, ensure you have the following installed and configured:

1.  **Node.js & npm:** [Download Node.js](https://nodejs.org/) (v18.x or later recommended). npm is included.
2.  **Git:** [Download Git](https://git-scm.com/).
3.  **AWS CLI:** [Install and Configure AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html). You need an AWS account and configured credentials (`aws configure`).
4.  **Serverless Framework:** Install globally:
    ```bash
    npm install -g serverless
    ```
5.  **AWS Amplify CLI:** Install globally:
    ```bash
    npm install -g @aws-amplify/cli
    ```
    After installation, configure the Amplify CLI by running:
    ```bash
    amplify configure
    ```
    (This will guide you through signing into your AWS account and creating an IAM user for Amplify).
    https://docs.amplify.aws/gen1/javascript/tools/cli/start/set-up-cli/#configure-the-amplify-cli
    Save the amplify-api-user access key at icloud passwords or any password manager.

## 1. Project Setup

Clone the repository containing the project code:

```bash
git clone <your-repository-url>
cd kanjisama-app
```

## 2. Backend Deployment (Serverless Framework)

The backend consists of Lambda functions and an API Gateway endpoint defined in `backend/serverless.yml`.

1.  **Navigate to Backend Directory:**
    ```bash
    cd backend
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **(Optional) Update Kanji Data:** If you haven't already, replace the placeholder `backend/kanji_data.json` file in the `backend` directory with your actual Kanji data (ensure it's a valid JSON array).
4.  **Deploy:** Run the Serverless Framework deployment command. Replace `ap-northeast-1` if you prefer a different AWS region.
    ```bash
    sls deploy --verbose
    ```
    To remove use `sls remove`.
5.  **Get API Endpoint URL:** After the deployment successfully completes, the command output will show your API Gateway endpoint URL under `endpoints`. It will look something like this:
    `https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com`
    **Copy this URL.** You'll need it for the frontend configuration.

## 3. Frontend Configuration

The frontend needs to know where to send API requests.

1.  **Navigate to Frontend Directory:**
    ```bash
    cd ../frontend
    ```
    (Make sure you are in the `frontend` directory, not `backend`).
2.  **Edit `app.js`:** Open the `frontend/app.js` file in your code editor.
3.  **Update `API_BASE_URL`:** Find the line defining the `API_BASE_URL` constant and **paste** the API Gateway endpoint URL you copied from the backend deployment output:
    ```javascript
    // In frontend/app.js
    const API_BASE_URL = '[https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com](https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com)'; // <-- PASTE YOUR URL HERE
    ```
4.  **Save** the `app.js` file.

## 4. Frontend Deployment (AWS Amplify CLI)

We will use the Amplify CLI to initialize hosting and publish the frontend files.

1.  **Navigate to Project Root:** Ensure you are in the main project directory (`kanjisama-app`), not `frontend` or `backend`.
    ```bash
    cd ..
    ```
2.  **Initialize Amplify (if not already done for this project):**
    ```bash
    amplify init
    ```
    * Follow the prompts. Choose your editor, app type (`javascript`), framework (`none` or `react` if you were using it, but `none` is fine for static HTML/JS), source directory path (`frontend`), distribution directory path (`frontend`), build command (`npm run build` - you can usually accept default even if not building), start command (`npm run start` - accept default).
    * Choose your AWS profile.
3.  **Add Hosting:**
    ```bash
    amplify add hosting
    ```
    * Select `Hosting with Amplify Console (Managed hosting with custom domains, Continuous deployment)`.
    * Choose `Manual deployment`.
4.  **Amplify configure project**
    ```bash
    amplify configure project
    ```
    * This will likely re-run through some of the project configuration questions you answered during `amplify init`.
    * Pay close attention when it asks for the Build Command. Instead of accepting the default npm run-script build, delete the command entirely so the field is blank, or enter something harmless like echo "No build required".
    * Confirm the rest of the settings (like Source Directory Path: frontend, Distribution Directory Path: frontend).
    * Example:
    ```
    ? Which setting do you want to configure? Project information
    ? Enter a name for the project Kanjisama
    ? Choose your default editor: Visual Studio Code
    ✔ Choose the type of app that you're building · javascript
    Please tell us about your project
    ? What javascript framework are you using none
    ? Source Directory Path:  frontend
    ? Distribution Directory Path: frontend
    ? Build Command:  echo "No build required"
    ? Start Command: 
    Using default provider  awscloudformation
    ```
5.  **Publish Frontend:**
    ```bash
    amplify publish
    ```
    * This command will build (if configured) and upload the contents of your `frontend` directory to Amplify Hosting (which uses S3/CloudFront).
    * It will output the URL for your hosted application (e.g., `https://<branch>.<appid>.amplifyapp.com`).

## 5. Accessing the Application

* Use the **Amplify Hosting URL** provided by the `amplify publish` command to access your live Kanjisama application in your web browser.

---

## Updating the Application

* **Backend Changes:** Modify code in the `backend` directory, then run `cd backend && sls deploy`.
* **Frontend Changes:** Modify code in the `frontend` directory. If you changed `app.js` (like updating the API URL again), make sure it's saved. Then, from the project root, run `amplify publish` again.
* **Kanji Data Changes:** Replace `backend/kanji_data.json`, then redeploy the backend (`cd backend && sls deploy`). No frontend redeploy is needed unless the API structure changed.

## Removing the Application

If you want to completely remove all the AWS resources created for this application, follow these steps:

1.  **Remove Backend Resources (Serverless Framework):**
    * Navigate to the backend directory:
        ```bash
        cd backend
        ```
    * Run the remove command. This will delete the CloudFormation stack, including the Lambda functions, API Gateway, and associated IAM roles created by Serverless Framework.
        ```bash
        sls remove
        ```
    * Navigate back to the project root:
        ```bash
        cd ..
        ```

2.  **Remove Frontend Resources (Amplify CLI):**
    * Ensure you are in the project root directory (`kanjisama-app`).
    * Remove the hosting category:
        ```bash
        amplify remove hosting
        ```
    * Push the changes to remove the hosting resources from the cloud:
        ```bash
        amplify push
        ```
        * Confirm the removal when prompted.

3.  **(Optional) Delete the Entire Amplify Project:** If you want to remove *all* backend resources managed by Amplify (including the roles created during `amplify init` and the Amplify App itself in the console), you can run the following command from the project root *instead* of steps 2a and 2b:
    ```bash
    amplify delete
    ```
    * This is a more destructive action and will remove the entire Amplify project configuration from AWS. Use with caution.