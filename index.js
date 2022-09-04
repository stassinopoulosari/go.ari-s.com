const fs = require("fs"),
  readline = require('readline');

const args = process.argv.map((arg) => arg.toLowerCase()),
  isQuiet = ['-v', '--verbose'].every(
    (argument) => !args.includes(argument)
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
        return reject(new Error('Could not find `./package.json`.'));
      }
      const package = JSON.parse(data);
      if (package.version === undefined) {
        return reject(new Error('`version` must be set in `./package.json.`'));
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
      }
      if (!fs.existsSync(path) || !fs.lstatSync(path).isDirectory()) {
        return reject(new Error(
          'Configured path ' +
          path +
          '` does not exist or if not a folder.'
        ));
      } else if (path.slice(0, 2) != '..' && path[0] != '~' && path[0] != '/' || path.trim() === '/') {
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
          return reject(new Error('Shortcut `' + String(shortcut) + '` is not an object.'));
        }
        const shortcutKeys = Object.keys(shortcut);
        if (
          !['shortcut', 'url', 'title']
          .every((key => shortcutKeys.includes(key)))
        ) {
          return reject(
            new Error(
              'Shortcut `' +
              JSON.stringify(shortcut, null, 4) +
              '` does not include all required keys `shortcut`, `url`, and `title`'
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
    const paths = fs.readdirSync(path).filter(fileName => fileName[0] != '.' && fileName !== 'CNAME' && fileName !== '404.html' && fileName !== 'README.md').map(fileName => path + '/' + fileName);
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
};

const writeShortcuts = (path, shortcuts, template, version) => {
  const runTemplate = (shortcut) => {
    return template
      .replaceAll('{{url}}', shortcut.url)
      .replaceAll('{{title}}', shortcut.title)
      .replaceAll('{{ver}}', version);
  };

  return new Promise((resolve, reject) => {
    log('Writing new shortcuts...');
    const numShortcuts = shortcuts.length;
    var promises = [];
    for (var shortcutKey in shortcuts) {
      const shortcut = shortcuts[shortcutKey],
        sPath = shortcut.shortcut,
        sURL = shortcut.url,
        sTitle = shortcut.title,
        sPathComponents = sPath.split('/').filter((component) => component != '');
      var workingPath = path;
      sPathComponents.forEach(component => {
        workingPath += '/' + component;
        if (!fs.existsSync(workingPath)) {
          fs.mkdirSync(workingPath);
        }
      });
      const fileURL = workingPath + '/index.html';
      promises.push(new Promise((fResolve, fReject) => {
        fs.writeFile(fileURL, runTemplate(shortcut), (err) => {
          if (err) {
            return fReject(err);
          }
          log('    Wrote `' + fileURL + '`');
          return fResolve();
        });
      }));
    }
    Promise.all(promises).then(() => {
      log('New shortcuts written!');
      return resolve();
    });
  });

};

const updateConfiguration = (allConfiguration) => {
  allConfiguration.data = {
    lastRun: new Date().toString()
  };
  const configurationString = JSON.stringify(allConfiguration, null, 4);
  return new Promise((resolve, reject) => {
    fs.writeFile('./config.json', configurationString, (err) => {
      if (err) return reject();
      log('Updated `./config.json`!');
      return resolve();
    });
  });
};

const updateREADME = (shortcuts, version) => {
  return new Promise((resolve, reject) => {
    fs.readFile('./README_template.md', 'utf-8', (err, readmeTemplate) => {
      if (err) {
        return reject(err);
      }

      const readmeFilledIn = readmeTemplate
        .replaceAll('{{ver}}', version)
        .replaceAll('{{shortcutList}}', shortcuts.map(
          (shortcut) => '+ **' +
          shortcut.title +
          '**: ucsd.it' +
          shortcut.shortcut +
          ' --> ' +
          shortcut.url
        ).join('\n'));

      fs.writeFile('./README.md', readmeFilledIn, (err) => {
        if(err) return reject(err);

        log('Updated configuration!');

        return resolve();
      })
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
  fs.readFile(templatePath, 'utf-8', (err, template) => {
    if (err) {
      throw err;
      return;
    }

    clearOutTemplates(path).then(() => {
      writeShortcuts(path, shortcuts, template, version).then(() => {
        Promise.all(
          [updateConfiguration(allConfiguration), updateREADME(shortcuts, version)]
        ).then(() => {
          log('Done!');
        })
      });
    });
  });
})
