# ARTIK Cloud Accounts sample web application

This Node.js sample application is a small web server. It demonstrates how to use ARTIK Cloud Accounts to sign in/sign up/sign out a user and reset the user's password. 

An example using an iframe for sign-in is also provided.
For more information on this feature, go to our documentation page:
https://developer.artik.cloud/documentation/introduction/accounts.html

## Prerequisites
* Node v12+

## Setup / Installation:
* Execute the command to install node modules
```bash
npm install
```
* Configure your application in the [Developer Dashboard](https://developer.artik.cloud/dashboard) as following:
  * Set "Redirect URL" to “http://localhost:4444/redirect”.
  * Under "PERMISSIONS", set "Profile" to "Read". You should also set it to "Write" if you want the application to modify the user's profile.
* Set config.json:
  * clientId: your application ID (client ID)
  * clientSecret: your application Client Secret
  * authUrl: ARTIK Cloud Accounts API url (https://accounts.artik.cloud)
  * apiUrl: ARTIK Cloud REST API url (https://api.artik.cloud/v1.1)
  * host: your server hostname (localhost)
  * port: your server port (4444)
  * log: log configuration
  * testCSS: true, to set Form CSS in test mode. false, to use approved CSS (or default CSS if no CSS approved yet)

## Usage

 1. Run the command in the terminal:

  ```bash
  node index.js config.json
  ```

 2. In your browser, load http://localhost:4444

## Content
 - '/' -> link to sign in, connect to Samsung and sign up
 - '/signin' -> example of iframe usage with account form
 - in sign in form, you can test the link to forgot password

More about ARTIK Cloud
---------------

If you are not familiar with ARTIK Cloud, we have extensive documentation at https://developer.artik.cloud/documentation

The full ARTIK Cloud API specification can be found at https://developer.artik.cloud/documentation/api-reference/

Peek into advanced sample applications at https://developer.artik.cloud/documentation/samples/

To create and manage your services and devices on ARTIK Cloud, visit the Developer Dashboard at https://developer.artik.cloud

License and Copyright
---------------------

Licensed under the Apache License. See [LICENSE](LICENSE).

Copyright (c) 2016 Samsung Electronics Co., Ltd.

