# Login API sample

Implements a small server to serve as a frontend for an application that wants to use the ARTIK Cloud Login.

## Install

- You must have node.js version >= 12 installed
- Copy the archive
- Execute:
```bash
npm install
```

## Configuration

In config.json
- clientId: your application Client ID
- clientSecret: your application Client Secret
- authUrl: ARTIK Cloud accounts API url (https://accounts.artik.cloud)
- apiUrl: ARTIK Cloud'API url (https://api.artik.cloud/v1.1)
- host: your server hostname (localhost)
- port: your server port (4444)
- log: log configuration
- testCSS: true, to set Form CSS in test mode, false, to use approved CSS (or default CSS if no CSS approved yet)

Your application should have the following permission:
- read on User's Profile
- write on User's Profile if you want to modify the user profile

## Usage

```bash
node index.js config.json
```

and

In your browser, visit: http://localhost:4444



