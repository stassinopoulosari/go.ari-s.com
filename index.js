const fs = require("fs"),
  prettyjson = require('prettyjson'),
  readline = require('readline');

const args = process.argv.map((arg) => arg.toLowerCase()),
  isQuiet = ['-q', '--quiet'].some(
    (argument) => args.includes(argument)
  )

const log = (string) => {
  if (isQuiet) {
    return;
  }
  console.log(string);
}

const getVersion = () => {
  return new Promise((resolve, reject) => {
    fs.readFile('./package.json', 'utf-8', (err, data) => {
      if (err) {
        return reject(new Error('Could not find package.json.'));
      }
      const package = JSON.parse(data);
      if (package.version === undefined) {
        return reject(new Error('`version` must be set in package.json.'));
      }

      return resolve(package.version);
    });
  });
};

const loadConfiguration = () => {
  return new Promise((resolve, reject) => {
    log('Loading configuration from `./config.json`...');
    fs.readFile('./config.json', 'utf-8', (err, data) => {
      if (err) {
        return reject(new Error('Could not find config.json.'));
      }

      log('Loaded!');

      var allConfiguration = JSON.parse(data);

      if (allConfiguration.configuration === undefined || typeof allConfiguration.configuration !== 'object') {
        return reject(new Error('`configuration` object in `./config.json` missing or malformed.'))
      }

      const path = allConfiguration.configuration.path,
        shortcuts = allConfiguration.configuration.shortcuts,
        template = allConfiguration.configuration.template;

      log('Checking path...');

      if (path === undefined || typeof path !== "string") {
        return reject(new Error('Configured path is malformed or missing.'));
      } else if (!fs.existsSync(path) || !fs.lstatSync(path).isDirectory()) {
        return reject(new Error(
          'Configured path ' +
          path +
          '` does not exist or if not a folder.'
        ));
      } else if (path.slice(0, 2) != '..' && path[0] != '~' && path[0] != '/' || path === '/') {
        return reject(new Error(
          'Path must not be a subfolder. Must be either a relative path beginning with `..`, `/`, or `~`. It must not be the root directory.'
        ));
      }

      log('Valid!');
      log('Checking shortcuts...');

      if (shortcuts === undefined || !Array.isArray(shortcuts)) {
        return reject(new Error('Configured `shortcuts` array is malformed or missing'));
      }

      const numShortcuts = shortcuts.length;

      for (var shortcutKey in shortcuts) {
        log('  Checking shortcut (' + (parseInt(shortcutKey) + 1) + '/' + numShortcuts + ')');

        const shortcut = shortcuts[shortcutKey];
        if (!(shortcut instanceof Object)) {
          return reject(new Error('Shortcut ' + String(shortcut) + ' is not an object.'));
        }
        const shortcutKeys = Object.keys(shortcut);
        if (
          !['shortcut', 'url', 'title']
          .every((key => shortcutKeys.includes(key)))
        ) {
          return reject(
            new Error(
              'Shortcut ' +
              JSON.stringify(shortcut) +
              ' does not include all required keys `shortcut`, `url`, and `title`'
            )
          );
        }
        const sPath = shortcut.shortcut,
          sURL = shortcut.url,
          sTitle = shortcut.title;
        if (![sPath, sURL, sTitle].every(value => typeof value === 'string')) {
          return reject(
            new Error(
              'Shortcut ' +
              JSON.stringify(shortcut) +
              ' includes a required property with a non-string value.' +
              ' `shortcut`, `url`, and `title` must be strings.'
            )
          );
        }
        if (sPath[0] != '/' || sPath.indexOf('//') != -1 || sPath !== encodeURI(sPath)) {
          return reject(
            new Error(
              'Shortcut ' +
              JSON.stringify(shortcut) +
              ' includes an invalid path. The path must start with `/`.' +
              ' It must not contain `//`. It must be a valid URI.'
            )
          );
        }
        log('  Valid!');
      }
      log('All shortcuts are valid.');
      log('Checking template...');
      if (template === undefined || typeof template !== 'string') {
        return reject(new Error('`template` is undefined or malformed.'));
      }
      if (!fs.existsSync(template)) {
        return reject(new Error('Template `' + template + '` does not exist.'));
      } else if (!fs.lstatSync(template).isFile()) {
        return reject(new Error('Template `' + template + '` is not a file.'));
      }
      log('Valid!');
      return resolve(allConfiguration);
    });
  });
};

const clearOutTemplates = (path) => {
  return new Promise((resolve, reject) => {
    log('Clearing out `' + path + '`...')

    const rl = readline.createInterface(process.stdin, process.stdout);
    const paths = fs.readdirSync(path).filter(fileName => fileName[0] != '.' && fileName !== 'CNAME').map(fileName => path + '/' + fileName);
    console.log('Confirm you would like to delete the following files:')
    paths.forEach((path) => console.log('  - ' + path))
    console.log('');
    rl.question("Y/(N): ", (answer) => {
      if (answer.trim().toUpperCase() !== 'Y') {
        rl.close();
        return reject(new Error('User rejected deletion'));
      }
      rl.close();
      log('Deleting...');
      paths.forEach((path) => fs.rmSync(path, {
        'recursive': true
      }));
      log('Files deleted.');
      return resolve(true);
    });
  });
}

Promise.all([getVersion(), loadConfiguration()]).then((returnedValues) => {
  const version = returnedValues[0],
    allConfiguration = returnedValues[1];

  const config = allConfiguration.configuration,
    path = config.path,
    templatePath = config.template,
    shortcuts = config.shortcuts;

  log('Loading template...');
  fs.readFile(templatePath, 'utf-8', (err, data) => {
    if (err) {
      throw err;
      return;
    }
    const runTemplate = (shortcut) => {
      return data
        .replaceAll('{{url}}', shortcut.url)
        .replaceAll('{{title}}', shortcut.title)
        .replaceAll('{{ver}}', version);
    };

    clearOutTemplates(path).then(() => {
      log('Writing new shortcuts...');
      const numShortcuts = shortcuts.length;
      for(var shortcutKey in shortcuts) {
        const shortcut = shortcuts[shortcutKey],
        sPath = shortcut.shortcut,
        sURL = shortcut.url,
        sTitle = shortcut.title,
        sPathComponents = sPath.split('/').filter((component) => component != '');

        log('  Writing shortcut ' + sPath + ' (' + (parseInt(shortcutKey) + 1) + '/' + numShortcuts + ')...')

        var workingPath = path;
        sPathComponents.forEach(component => {
          workingPath += '/' + component;
          if(!fs.existsSync(workingPath)) {
            fs.mkdirSync(workingPath);
          }
        });

        const fileURL = workingPath + '/index.html';
        fs.writeFileSync(fileURL, runTemplate(shortcut));

        log('    Written!');

      }
      log('New shortcuts written! Exiting...');
    });
  });
})
