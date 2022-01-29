import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

let flights = [
    {
        flight: 'NP1212',
        timestamp: 1642860000
    },
    {
        flight: 'MA2311',
        timestamp: 1642960000
    },
    {
        flight: 'KL5501',
        timestamp: 1642960000
    },
    {
        flight: 'KL5502',
        timestamp: 1642987000
    },
    {
        flight: 'TR0067',
        timestamp: 1642987500
    }
];

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

            this.getAirlineFunds(this.airlines[0]).then(async funds => {
                let value = new Number(this.web3.utils.fromWei(funds, 'ether'));

                if (value < 10) {
                    await this.deposit(this.airlines[0], '10');
                }
                flights.forEach(async flight => {
                    try {
                        await this.registerFlight(this.airlines[0], flight.flight, flight.timestamp);
                    } catch (e) { }
                });
            });

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    async fetchFlightStatus(flight, callback) {
        let flights = await this.getRegisteredFlights();
        let f = flights.find(f => f.flight === flight);
        let self = this;
        let payload = {
            airline: f.airline,
            flight: flight,
            timestamp: f.timestamp
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
        return this.flightSuretyApp.methods.registerFlight(flight, timestamp).send({ from: airline, gas: 300000 });
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
    subscribeFlightRegistered(callback) {
        this.flightSuretyApp.events.FlightRegistered(callback);
    }
    subscribePurchasedInsurance(callback) {
        this.flightSuretyApp.events.PurchasedInsurance(callback);
    }
    subscribeOracleReport(callback) {
        this.flightSuretyApp.events.OracleReport(callback);
    }
    subscribeFlightStatusInfo(callback) {
        this.flightSuretyApp.events.FlightStatusInfo(callback);
    }

    async getRegisteredFlights() {
        let count = await this.flightSuretyData.methods.getFlightsCount().call();
        let flights = [];
        for (let i = 0; i < count; i++) {
            try {
                let result = await this.flightSuretyData.methods.getFlight(i).call();
                flights.push({
                    isRegistered: result[0],
                    statusCode: result[1],
                    airline: result[2],
                    flight: result[3],
                    timestamp: result[4],
                });
            } catch (error) {
                console.log(error);
            }
        }
        return flights;
    }

    getPessengerBalance(pessenger) {
        return this.flightSuretyData.methods.getBalance(pessenger).call();
    }

    buyInsurance(pessenger, value, airline, flight, timestamp) {
        const wei = this.web3.utils.toWei(value);
        return this.flightSuretyApp.methods.purchaseInsurance(airline, flight, timestamp).send({ from: pessenger, value: wei, gas: 200000 });
    }

    withdraw(pessenger) {
        return this.flightSuretyApp.methods.withdraw().send({ from: pessenger });
    }
}