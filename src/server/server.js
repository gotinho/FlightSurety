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

let STATUS_CODE_UNKNOWN = 0;
let STATUS_CODE_ON_TIME = 10;
let STATUS_CODE_LATE_AIRLINE = 20;
let STATUS_CODE_LATE_WEATHER = 30;
let STATUS_CODE_LATE_TECHNICAL = 40;
let STATUS_CODE_LATE_OTHER = 50;

let status = [
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER
];

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

web3.eth.getAccounts((error, accounts) => {
  let registrations = [];
  for (let i = 0; i < 25; i++) {
    let oracle = accounts[i];
    let registration = flightSuretyApp.methods.registerOracle().send({ from: oracle, value: registrationFee, gas: 200000 }).then(() => {
      console.log('Oracle registration ' + i + '    ' + oracle);
      return flightSuretyApp.methods.getMyIndexes().call({ from: oracle }).then((indexes) => {
        console.log(indexes);
        oracles.push({ address: oracle, indexes: indexes });
      });
    });
    registrations.push(registration);
  }

  Promise.all(registrations).then((a) => {

    console.log('Oracles registered');
    console.log('Start event listener');

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

      let oracleStatus = status[getRandomInt(0, status.length)];
      console.log('ORACLE STATUS CODE ' + oracleStatus);
      targets.forEach(oracle => {
        console.log(oracle);
        try {
          flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, oracleStatus).send({ from: oracle.address, gas: 200000 });
        } catch (e) { }
      });

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


