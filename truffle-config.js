const Web3 = require('web3');
var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "bounce rabbit write palm celery fat sand solar frown swarm unfair human";

const wsProvider = new Web3.providers.WebsocketProvider('http://127.0.0.1:8545/')
HDWalletProvider.prototype.on = wsProvider.on.bind(wsProvider)

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, wsProvider, 0, 50);
      },
      network_id: '*',
      gas: 0,
      websockets: true
    }
  },
  compilers: {
    solc: {
      version: "^0.4.25"
    }
  }
};