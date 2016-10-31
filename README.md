# ARTIK Cloud Accounts Sample Code

This Node.js application is a small web server that provides OAuth2 flow and REST communication with ARTIK Cloud. 
It will demonstrate how to sign in/sign up/sign out a user and reset the user's password. 
An example using an iframe for sign-in is also provided.
For more information on this feature, go to our documentation page:
https://developer.artik.cloud/documentation/introduction/accounts.html

## Install

- You must have node.js version >= 12 installed
- Copy the archive
- Execute:
```bash
npm install
```

## Configuration

In config.json
- clientId: your application ID (client ID)
- clientSecret: your application Client Secret
- authUrl: ARTIK Cloud Accounts API url (https://accounts.artik.cloud)
- apiUrl: ARTIK Cloud REST API url (https://api.artik.cloud/v1.1)
- host: your server hostname (localhost)
- port: your server port (4444)
- log: log configuration
- testCSS: true, to set Form CSS in test mode. false, to use approved CSS (or default CSS if no CSS approved yet)

Your application should have:
- an auth redirect URL set as: “http://localhost:4444/redirect” 
the following permission:
- read on User's Profile
- write on User's Profile if you want to modify the user profile

## Usage

```bash
node index.js config.json
```

and

In your browser, visit: http://localhost:4444


## Content
- '/' -> link to sign in, connect to Samsung and sign up
- '/signin' -> example of iframe usage with account form
- in sign in form, you can test the link to forgot password
