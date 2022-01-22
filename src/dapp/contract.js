import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';


export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        console.log(Web3.version);
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while (this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }

    registerAirline(asAirline, forAirline) {
        return this.flightSuretyApp.methods.registerAirline(forAirline).send({ from: asAirline, gas: 180000 });
    }

    deposit(asAirline, value) {
        const weiValue = this.web3.utils.toWei(value);
        return this.flightSuretyApp.methods.deposit().send({ from: asAirline, value: weiValue });
    }

    isAirlineRegistered(address) {
        return this.flightSuretyData.methods.isAirline(address).call();
    }

    getAirlineFunds(address) {
        return this.flightSuretyData.methods.getAirlineDepositedValue(address).call();
    }

    registerFlight(airline, flight, timestamp) {
        this.flightSuretyApp.methods.registerFlight(flight, timestamp).send({ from: airline, gas: 180000 });
    }

    subscribeAirlineDeposit(callback) {
        this.flightSuretyApp.events.AirlineDeposit(callback);
    }
    subscribeAirlineRegistered(callback) {
        this.flightSuretyApp.events.AirlineRegistered(callback);
    }
    subscribeAirlineVoted(callback) {
        this.flightSuretyApp.events.AirlineVoted(callback);
    }
}