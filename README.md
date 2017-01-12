# ARTIK Cloud Accounts sample web application

The Node.js web application demonstrates how to sign in/sign up/sign out a user and reset the user's password with and without an IFrame. In addition, blank.css demonstrates how to customize the forms when using ARTIK Cloud Account as the identity provider.

For more information on this feature, go to our documentation page:
https://developer.artik.cloud/documentation/introduction/accounts.html

## Prerequisites
* Node v0.12.x or above

## Setup / Installation:
* Execute the command to install node modules
```bash
npm install
```
* Configure your application in the [Developer Dashboard](https://developer.artik.cloud/dashboard) as following:
  * Set "Redirect URL" to “http://localhost:4444/redirect”.
  * Set "AUTHORIZATION METHODS" to "Client Credentials, auth code", which is sufficient since the app does not use Implicit Method.
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

 2. In your browser, load http://localhost:4444 . Then you will be able to play with sign in/sign up/sign out et al.
 3. File html/blank.css is an example of form customization. To see the customized pages, set 'testCSS' in config.json to true as mentioned in the *Setup / Installation*. Navigate to a sign in/sign up/sign out page, and then apply the content of html/blank.css to the local blank.css in your browser. Now you should see the customized page. Consult the browser documentation to learn how to override local blank.css file.  

## Content

 - "localhost:4444/": provide a page where you can sign in with four identity providers (with or without iFrame).
 - "localhost:4444/signin": sign in using ARTIK Cloud Account as the identity provider with IFrame. In the form, you can go to "forgot password" and "sign up".

## More examples

Peek into "Android OAuth starter" in [Tutorials](https://developer.artik.cloud/documentation/tutorials/) for more examples.

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

