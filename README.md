# inspector-proxy

node inspector proxy

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Appveyor status][appveyor-image]][appveyor-url]
[![Coverage Status][coveralls-image]][coveralls-url]

[npm-image]: https://img.shields.io/npm/v/inspector-proxy.svg?style=flat-square
[npm-url]: https://npmjs.org/package/inspector-proxy
[travis-url]: https://travis-ci.org/whxaxes/inspector-proxy
[travis-image]: http://img.shields.io/travis/whxaxes/inspector-proxy.svg
[appveyor-url]: https://ci.appveyor.com/project/whxaxes/inspector-proxy/branch/master
[appveyor-image]: https://ci.appveyor.com/api/projects/status/github/whxaxes/inspector-proxy?branch=master&svg=true
[coveralls-url]: https://coveralls.io/r/whxaxes/inspector-proxy
[coveralls-image]: https://img.shields.io/coveralls/whxaxes/inspector-proxy.svg

## Usage

```bash
$ npm i inspector-proxy -g
```

Inspect

```bash
# base usage
$ inspector-proxy ./test.js

# appoint port
$ inspector-proxy --proxy=9228 --debug=9888 ./test.js
```

Open chrome devtools url

```
chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=127.0.0.1:9228/__ws_proxy__
```

Using in code

```js
const proxy = require('inspector-proxy');
const cfork = require('cfork');

// use cfork to inspect file
cfork({
  exec: './test.js',
  execArgv: [ '--inspect' ],
  silent: false,
  count: 1,
  refork: true,
}).on('fork', worker => {
  let port;
  // match debug port from argv
  worker.process.spawnargs
    .some(arg => {
      let matches;
      // node-6: --inspect=9888
      // node-8: --inspect-port=9888
      if (arg.startsWith('--inspect') && (matches = arg.match(/\d+/))) {
        port = matches[0];
        return true;
      }
      return false;
    });

  proxy(proxyPort, port)
    .then(({ url }) => {
      console.log(`\nproxy url: ${url}\n`);
    });
});
```

