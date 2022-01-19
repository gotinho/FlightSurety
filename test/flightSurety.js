
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const { default: Web3 } = require('web3');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSurety.setTestingMode(true);
        }
        catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

        // ARRANGE
        let newAirline = accounts[2];

        // ACT
        try {
            await config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline });
        }
        catch (e) {
            //console.log(e);
        }
        let result = await config.flightSuretyData.isAirline.call(newAirline);

        // ASSERT
        assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

    });

    it('(airline) fund contract', async () => {

        let ethValue = web3.utils.toWei("10", "ether");
        await config.flightSuretyApp.deposit({ from: config.firstAirline, value: ethValue });

        let value = await config.flightSuretyData.getAirlineDepositedValue(config.firstAirline);
        assert.equal(value, ethValue);

        let contractBalance = await web3.eth.getBalance(config.flightSuretyData.address)
        assert.equal(contractBalance, ethValue);
    });

    it('(Multiparty Consensus not required) regiter firts 4 arilines', async () => {
        let ethValue = web3.utils.toWei("10", "ether");
        let airline2 = accounts[2];
        let airline3 = accounts[3];
        let airline4 = accounts[4];

        let result = await config.flightSuretyApp.registerAirline(airline2, { from: config.firstAirline });
        await config.flightSuretyApp.deposit({ from: airline2, value: ethValue });

        await config.flightSuretyApp.registerAirline(airline3, { from: airline2 });
        await config.flightSuretyApp.deposit({ from: airline3, value: ethValue });

        await config.flightSuretyApp.registerAirline(airline4, { from: airline3 });
        await config.flightSuretyApp.deposit({ from: airline4, value: ethValue });

        let airlineCount = await config.flightSuretyData.airlinesCount();
        assert.equal(airlineCount, 4);

    });

    it('(Multiparty Consensus required) regiter fifth ariline requires multi-party consensus of 50%', async () => {
        let airline2 = accounts[2];

        let airline5 = accounts[5];

        await config.flightSuretyApp.registerAirline(airline5, { from: config.firstAirline });
        let isAirline = await config.flightSuretyData.isAirline(airline5);
        let airlineCount = await config.flightSuretyData.airlinesCount();
        let votes = await config.flightSuretyData.getVotesCount(airline5);

        assert.equal(votes, 1);
        assert.equal(isAirline, false, "Airline shouldn't be registered.");
        assert.equal(airlineCount, 4);

        await config.flightSuretyApp.registerAirline(airline5, { from: airline2 });
        isAirline = await config.flightSuretyData.isAirline(airline5);
        airlineCount = await config.flightSuretyData.airlinesCount();
        votes = await config.flightSuretyData.getVotesCount(airline5);

        assert.equal(votes, "2", "2 vote for airline");
        assert.equal(isAirline, true, "Airline shoud be registered now.");
        assert.equal(airlineCount, 5);
    });


    it('(airline) register flight', async () => {
        let airline = config.firstAirline;
        let flight = 'TE1921';
        let timestamp = 1642265173;

        await config.flightSuretyApp.registerFlight(flight, timestamp, { from: airline });
    });

    it('(airline) cannot register duplicate flight', async () => {
        let airline = config.firstAirline;
        let flight = 'TE1921';
        let timestamp = 1642265173;

        let registered = false;
        try {
            await config.flightSuretyApp.registerFlight(flight, timestamp, { from: airline });
            registered = true;
        } catch (error) { }
        assert.isFalse(registered, 'duplicate flight registered');
    });

    it('(passenger) cannot purchase insurance greater then 1 eather', async () => {
        let airline = config.firstAirline;
        let flight = 'TE1921';
        let timestamp = 1642265173;

        let passenger = accounts[6];
        let value = web3.utils.toWei('1.1', 'ether');
        let bought = false;

        try {
            await config.flightSuretyApp.purchaseInsurance(airline, flight, timestamp, { from: passenger, value })
            bought = true;
        } catch (error) {
            //console.log(error);
        }

        assert.isFalse(bought, 'Can not purchase insurance for more de then 1 ether');
    });

    it('(passenger) purchase insurance', async () => {
        let airline = config.firstAirline;
        let flight = 'TE1921';
        let timestamp = 1642265173;

        let key = web3.utils.soliditySha3(airline, flight, timestamp);

        let passenger = accounts[6];
        let value = web3.utils.toWei('1', 'ether');

        await config.flightSuretyApp.purchaseInsurance(airline, flight, timestamp, { from: passenger, value });

        let count = await config.flightSuretyData.getPassengersCount(key);
        assert.equal(count.toNumber(), 1);
        
        let insuranceValue = await config.flightSuretyData.getPassengerInsuranceValue(key, passenger);
        assert.equal(insuranceValue.toString(), value);
    });

});
