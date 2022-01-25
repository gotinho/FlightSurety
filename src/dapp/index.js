
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';
import Web3 from 'web3';


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

            showFlights(contract);
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

        DOM.elid('btn-register-flight').onclick = async () => {
            let airline = DOM.elid('airlines').value;
            let flight = DOM.elid('new-flight').value;
            let timestamp = DOM.elid('new-flight-time').value;
            try {
                await contract.registerFlight(airline, flight, timestamp);
            } catch (error) {
                console.error(error.data);
                DOM.elid('airline-events').append(DOM.makeElement('p', { className: 'text-error' }, error.message));
            }
        };

        
    });
    
    showFlights(contract);

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

function showFlights(contract) {
    contract.getRegisteredFlights().then( flights =>{
        let table = DOM.elid('tb-flights');
        table.innerHTML = '';
        flights.forEach(f => {
            let line = DOM.makeElement('tr');
            line.appendChild(DOM.makeElement('td', f.flight));
            line.appendChild(DOM.makeElement('td', f.airline));
            table.appendChild(line);
        });
    });
}



