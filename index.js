'use strict';

const TCPProxy = require('tcp-proxy.js');
const urllib = require('urllib');
const co = require('co');
const EventEmitter = require('events').EventEmitter;
const KEY = '__ws_proxy__';
const linkPrefix = 'chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=127.0.0.1:';

module.exports = class InterceptorProxy extends EventEmitter {
  constructor(options = {}) {
    super();
    const port = options.port;
    if (!port) {
      throw new Error('proxy port is needed!');
    }
    this.timeout;
    this.attached = false;
    this.inspectInfo = null;
    this.proxyPort = port;
    this.proxy = new TCPProxy({ port });
    this.proxy.on('close', () => {
      clearTimeout(this.timeout);
    });
  }

  start({ debugPort }) {
    return co.call(this, function* () {
      yield this.end();

      this.watchingInspect(debugPort);

      // wait for inspectInfo
      yield new Promise(resolve =>
        this.once('attached', resolve)
      );

      yield this.proxy.createProxy({
        forwardPort: debugPort,
        interceptor: {
          client: chunk => {
            if (
              !this.inspectInfo ||
              chunk[0] !== 0x47 || // G
              chunk[1] !== 0x45 || // E
              chunk[2] !== 0x54 || // T
              chunk[3] !== 0x20 // space
            ) {
              return;
            }

            const content = chunk.toString();

            // replace key to websocket id
            if (content.includes(KEY)) {
              return content.replace(KEY, this.inspectInfo.id);
            }
          },
        },
      });

      return {
        proxy: this.proxy,
        url: `${linkPrefix}${this.proxy.port}/${KEY}`,
      };
    });
  }

  end() {
    return this.proxy.end();
  }

  watchingInspect(debugPort, delay = 0) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      urllib
        .request(`http://127.0.0.1:${debugPort}/json`, {
          dataType: 'json',
        })
        .then(({ data }) => {
          if (!this.attached) {
            console.log(`attached debug port ${debugPort}`);
          }

          this.attached = true;
          this.emit('attached', this.inspectInfo = data[0]);
          this.watchingInspect(debugPort, 1000);
        })
        .catch(() => {
          if (this.attached) {
            this.emit('detached');
            console.log(`${debugPort} closed`);
          }

          this.attached = false;
          this.watchingInspect(debugPort, 1000);
        });
    }, delay);
  }
};
