
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
        DOM.elid('airlines').addEventListener('change', (event) => {
            console.log(event.target.value);
            DOM.elid('airline-address').innerText = event.target.value;
        });

        // Deposit 
        DOM.elid('btn-airline-deposit').onclick = async () => {
            const value = DOM.elid('deposit-value').value;
            const asAirline = DOM.elid('airlines').value;
            try {
                await contract.deposit(asAirline, value);
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
                // await contract.registerAirline(asAirline, contract.airlines[1]);
                // console.log('voto 1');
                // await contract.registerAirline(asAirline, contract.airlines[2]);
                // console.log('voto 2');
                // await contract.registerAirline(asAirline, contract.airlines[3]);
                // console.log('voto 3');
                // await contract.registerAirline(asAirline, contract.airlines[4]);
                // console.log('voto 4');
                
            } catch (error) {
                console.error(error.data);
                DOM.elid('airline-events').append(DOM.makeElement('p', { className: 'text-error' }, error.message));
            }
        }

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





