import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let registrationFee = web3.utils.toWei('1');

let oracles = [];

web3.eth.getAccounts((error, accounts) => {
  let registrations = [];
  for (let i = 0; i < 25; i++) {
    let oracle = accounts[i];
    console.log('Oracle registration ' + i + '    ' + oracle);
    let registration = flightSuretyApp.methods.registerOracle().send({ from: oracle, value: registrationFee, gas: 200000 }).then(() => {
      return flightSuretyApp.methods.getMyIndexes().call({ from: oracle }).then((indexes) => {
        oracles.push({ oracle: oracle, indexes: indexes });
      });
    });
    registrations.push(registration);
  }

  Promise.all(registrations).then((a) => {

    flightSuretyApp.events.OracleRequest({
      fromBlock: 0
    }, function (error, event) {
      if (error) console.log(error)
      //console.log(event);
      let index = event.returnValues.index;
      let airline = event.returnValues.airline;
      let flight = event.returnValues.flight;
      let timestamp = event.returnValues.timestamp;
      let targets = oracles.filter(oracle => oracle.indexes.find(i => i === index));
      
      

    });
  
  });
});

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

export default app;


