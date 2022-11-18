# UCSD.IT URL Shortener Version 1.0.0

## Quick Links

* [Request form](https://docs.google.com/forms/d/e/1FAIpQLSf-C59wLslm_sH1QUTWoM7siMHHEzJ_Vha3bZ_Hx4LnsJI9ug/viewform)
* [Shortcuts branch (GitHub Pages backend)](https://github.com/stassinopoulosari/ucsd.it/tree/shortcuts)

## Current shortcuts

+ **Manage SSO tool**: ucsd.it/newad --> https://itsweb.ucsd.edu/manage-sso/applicant
+ **CSR**: ucsd.it/csr --> https://act.ucsd.edu/telecom/csr
+ **Business Systems Info Page**: ucsd.it/sso --> https://blink.ucsd.edu/technology/network/access/business-systems/index.html
+ **Business Systems Password Reset**: ucsd.it/sso/reset --> https://iam.ucsd.edu/ResetPassword/
+ **Business Systems Self-Registration**: ucsd.it/sso/register --> https://a4.ucsd.edu/selfreg/supplyemail.do
+ **Global Password Reset Tool**: ucsd.it/gpr --> https://sdacs.ucsd.edu/~icc/password.php
+ **Business Systems DSA Search**: ucsd.it/dsasearch --> https://iam.ucsd.edu/dsasearch/
+ **Speedtest.net**: ucsd.it/speed --> https://speedtest.net
+ **UCSD OWA**: ucsd.it/x --> https://mail.ucsd.edu
+ **UCSD Gmail**: ucsd.it/g --> https://gmail.ucsd.edu
+ **UC Learning Login**: ucsd.it/ucl --> https://uc.sumtotal.host/Broker/Account/Login.aspx?wtrealm=https%3a%2f%2fuc.sumtotal.host%2fcore%2f&ReturnUrl=http%3a%2f%2fuc.sumtotal.host%2fBroker%2fToken%2fSaml11.ashx%3fwa%3dwsignin1.0%26wtrealm%3dhttps%3a%2f%2fuc.sumtotal.host%2fcore%2f%26wreply%3dhttp%3a%2f%2fuc.sumtotal.host%2fcore%2f%26whr%3durn%3asumtotalsystems.com&whr=urn%3asumtotalsystems.com&domainid=52160A28FC58BBBE7D714E075077AC76
+ **The Homepage**: ucsd.it/ --> https://github.com/stassinopoulosari/ucsd.it#readme

## About this branch

This branch contains the source code for a (semi)-automated flat-file URL shortener that I wrote for this project.

The files of note are:

* index.js — The entry point; `node index.js`.
  * You can run UCSD.IT in Verbose Mode as `node index.js -v` or `node index.js --verbose` for full logs.
  * You can also run it in Force Mode, which will skip confirming file deletions with `-f` or `--force`.
  * For the unholy combination of Force Mode and Verbose Mode, `node index.js -fv`.
* config.json — The configuration file; this contains all configuration for the URL shortener.
* README_template.md — The README template; this allows the README.md to be updated automatically when running.
  * Note — do not directly edit README.md, it **will** be overwritten when running the tool.
* redirectPage.html — This is the default redirect page template, though the path for that is configurable in config.json.
* package.json — The version on the redirect page as well as the README are pulled from here, so it must be present.

## Filesystem setup

Run these commands to set up your file system like mine is currently set up:

```
mkdir ucsd.it && cd ucsd.it
git clone https://github.com/stassinopoulosari/ucsd.it.git main
git clone https://github.com/stassinopoulosari/ucsd.it.git gh_pages
cd gh_pages && git checkout shortcuts
cd ../main
node index.js --verbose
cd ..
```

## Configuration notes

### `config.json`

- You can delete the `notes` section if you'd like, it's not read or checked for in the code.
- The `lastRun` in the `data` section is updated automatically every time you run the tool.
- `configuration`
  - `configuration.path`: Required. `path` must be an existing directory which can begin with `..`, `~`, or `/`. It cannot be the root directory and should not be a subdirectory.
    - **Important: all files in this path will be deleted when running the command except for hidden files, `.gitignore`, `404.html`, and `README.md`!**
  - `configuration.template`: Required. `template` must be an existing file.
  - `configuration.shortcuts`: Required. This must be a list.
    - Each shortcut must take the following form:
      ```
      {
          "shortcut": "/newad",
          "url": "https://itsweb.ucsd.edu/manage-sso/applicant",
          "title": "Manage SSO"
      }
      ```
    - `shortcut.shortcut`: Required. The path of the shortcut. Think `ucsd.it` + `shortcut`. e.g. `/`, `/sso`, `/sso/reset`. Should not end with a `/` unless it is `/`.
    - `shortcut.url`: Required. This should be a URL, but nobody's checking.
    - `shortcut.title`: Required. It's important that this is a descriptive title.

### `redirectPage.html`

- This has 3 templatable strings:
  - `{{title}}`: The title of the shortcut (think `shortcut.title` from the section above)
  - `{{url}}`: The URL of the shortcut (think `shortcut.url` from the section above)
  - `{{​ver}}`: The version of the UCSD.IT utility (pulled from `package.json`)
  - It is important to leave in the redirect JavaScript at the bottom of the page, since this is what makes the utility actually work.

### `README_template.md`

- This has 2 templatable strings:
  - `{{​shortcutList}}`: The list of shortcuts (markdown-formatted)
  - `{{​ver}}`: The version of the utility.
