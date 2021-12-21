var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "bounce rabbit write palm celery fat sand solar frown swarm unfair human";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: '*',
      gas: 0
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};