
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';
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

(async () => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // events subscription
        contract.subscribeAirlineDeposit((error, event) => {
            const airline = event.returnValues.airline;
            const value = Web3.utils.fromWei(event.returnValues.value, 'ether');

            DOM.elid('airline-events').append(DOM.makeElement('p', `Airline ${airline} has deposited ${value} ETH`));
        });
        contract.subscribeAirlineRegistered((error, event) => {
            const airline = event.returnValues.airline;
            const votes = event.returnValues.votes;

            DOM.elid('airline-events').append(DOM.makeElement('p', `Airline ${airline} registered with ${votes} votes`));
        });
        contract.subscribeAirlineVoted((error, event) => {
            const airline = event.returnValues.airline;
            const votedFor = event.returnValues.votedFor;

            DOM.elid('airline-events').append(DOM.makeElement('p', `Airline ${airline} has voted for ${votedFor}`));
        });
        contract.subscribeFlightRegistered((error, event) => {
            const airline = event.returnValues.airline;
            const flight = event.returnValues.flight;

            DOM.elid('airline-events').append(DOM.makeElement('p', `Airline ${airline} registered new flight ${flight}`));
        });

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error, result);
            display('Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: error, value: result }]);
        });


        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }]);
            });
        });


        // Airlines select
        contract.airlines.forEach((address, i) => {
            DOM.elid('airlines').append(DOM.makeElement('option', { value: address }, 'Airline ' + i));
            DOM.elid('airlines2').append(DOM.makeElement('option', { value: address }, 'Airline ' + i));
        });

        async function loadAirlineInfo() {
            const address = DOM.elid('airlines').value;
            DOM.elid('airline-address').innerText = address;
            const registered = await contract.isAirlineRegistered(address);
            DOM.elid('airline-registrered').innerText = registered;
            const funds = await contract.getAirlineFunds(address);
            DOM.elid('airline-funds').innerText = funds;
        }

        DOM.elid('airlines').addEventListener('change', () => {
            loadAirlineInfo();
        });

        // Deposit 
        DOM.elid('btn-airline-deposit').onclick = async () => {
            const value = DOM.elid('deposit-value').value;
            const asAirline = DOM.elid('airlines').value;
            try {
                await contract.deposit(asAirline, value);
                loadAirlineInfo();
            } catch (error) {
                console.log(error.message);
                DOM.elid('airline-events').append(DOM.makeElement('p', { className: 'text-error' }, error.message));
            }
        };

        // Register airline
        DOM.elid('btn-register-airline').onclick = async () => {
            const asAirline = DOM.elid('airlines').value;
            const forAirline = DOM.elid('airlines2').value;
            try {
                await contract.registerAirline(asAirline, forAirline);
            } catch (error) {
                console.error(error.data);
                DOM.elid('airline-events').append(DOM.makeElement('p', { className: 'text-error' }, error.message));
            }
        };

        flights.forEach(async (f, i) => {
            DOM.elid('airline-flight').append(DOM.makeElement('option', { value: i + 1 }, f.flight));
        });

        DOM.elid('btn-register-flight').onclick = async () => {
            let airline = DOM.elid('airlines').value;
            let f = flights[DOM.elid('airline-flight').value - 1];
            try {
                await contract.registerFlight(airline, f.flight, f.timestamp);
                f.airline = airline;
            } catch (error) {
                console.error(error.data);
                DOM.elid('airline-events').append(DOM.makeElement('p', { className: 'text-error' }, error.message));
            }
        };

    });


})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
        row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}





