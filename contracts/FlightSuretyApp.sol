pragma solidity ^0.4.24;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner; // Account used to deploy contract

    FlightSuretyData private _dataContract;

    event AirlineDeposit(address airline, uint256 value);
    event AirlineRegistered(address airline, uint256 votes);
    event AirlineVoted(address airline, address votedFor);
    event FlightRegistered(address airline, string flight);
    event PurchasedInsurance(
        address pessenger,
        address airline,
        string flight,
        uint256 value
    );
    event PessengerWithdraw(address pessenger, uint256 value);

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        // Modify to call data contract's status
        require(isOperational(), "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireRegisteredAirline() {
        require(_dataContract.isAirline(msg.sender), "Not an airline.");
        _;
    }

    modifier requireFundedAirline() {
        require(
            _dataContract.getAirlineDepositedValue(msg.sender) >=
                _dataContract.minFundCollateral(),
            "Airline insufficient fund."
        );
        _;
    }

    modifier requireRegisteredFlight(
        address airline,
        string flight,
        uint256 timestamp
    ) {
        require(
            _dataContract.isFlightRegistered(
                getFlightKey(airline, flight, timestamp)
            ),
            "Flight not registered."
        );
        _;
    }

    modifier requireInPurchasePeriod(
        address airline,
        string flight,
        uint256 timestamp
    ) {
        require(
            _dataContract.getFlightStatus(getFlightKey(airline, flight, timestamp)) == STATUS_CODE_UNKNOWN,
            "Period for buying flight insurance has ended."
        );
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address dataContractAddress) public {
        contractOwner = msg.sender;
        _dataContract = FlightSuretyData(dataContractAddress);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns (bool) {
        return _dataContract.isOperational(); // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(address airline)
        external
        requireIsOperational
        requireRegisteredAirline
        requireFundedAirline
        returns (bool success, uint256 votes)
    {
        require(
            !_dataContract.isAirline(airline),
            "Airline already registered."
        );
        require(!_dataContract.hasVoted(airline, msg.sender), "Double voting.");

        if (_dataContract.airlinesCount() < 4) {
            _dataContract.registerAirline(airline);
            emit AirlineRegistered(airline, 0);
            return (true, 0);
        } else {
            votes = _dataContract.addVote(airline, msg.sender);
            emit AirlineVoted(msg.sender, airline);
            if (votes.mul(2) >= _dataContract.airlinesCount()) {
                _dataContract.registerAirline(airline);
                emit AirlineRegistered(airline, votes);
                return (true, votes);
            }
            return (true, votes);
        }
    }

    /**
     * Allows airline to deposit funds to contract
     */
    function deposit()
        public
        payable
        requireIsOperational
        requireRegisteredAirline
    {
        _dataContract.fund.value(msg.value)();
        _dataContract.incrementDepositedValue(msg.sender, msg.value);
        emit AirlineDeposit(msg.sender, msg.value);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight(string flight, uint256 timestamp)
        external
        requireIsOperational
        requireRegisteredAirline
        requireFundedAirline
    {
        require(
            !_dataContract.isFlightRegistered(
                getFlightKey(msg.sender, flight, timestamp)
            ),
            "Fight already registered."
        );
        _dataContract.registerFlight(msg.sender, flight, timestamp);
        emit FlightRegistered(msg.sender, flight);
    }

    /**
     * Passenger purchase insurance for flight
     */
    function purchaseInsurance(
        address airline,
        string flight,
        uint256 timestamp
    )
        public
        payable
        requireRegisteredFlight(airline, flight, timestamp)
        requireInPurchasePeriod(airline, flight, timestamp)
    {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        require(
            msg.value <= 1 ether,
            "Can not purchase insurance for more de then 1 ether"
        );
        require(
            _dataContract.getPassengerInsuranceValue(key, msg.sender) == 0,
            "Insurance already bought."
        );
        _dataContract.buy.value(msg.value)(key, msg.sender, msg.value);
        emit PurchasedInsurance(msg.sender, airline, flight, msg.value);
    }

    function withdraw() public requireIsOperational {
        uint256 balance = _dataContract.getBalance(msg.sender);
        require(balance > 0, "can't withdraw, invalid balance");
        _dataContract.pay(msg.sender);
        emit PessengerWithdraw(msg.sender, balance);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal {
        bytes32 key = getFlightKey(airline, flight, timestamp);

        uint8 status = _dataContract.getFlightStatus(key);
        if(status != STATUS_CODE_UNKNOWN) {
            return;
        }

        _dataContract.updateFlightStatus(key, statusCode);

        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            // credit 1.5 x insurance to penssengers
            uint256 pessengersCount = _dataContract.getPassengersCount(key);
            for (uint256 index = 0; index < pessengersCount; index++) {
                address pessenger = _dataContract.getPassenger(key, index);
                uint256 insurance = _dataContract.getPassengerInsuranceValue(key, pessenger);
                uint256 bonus = insurance.div(2);
                _dataContract.creditInsurees(pessenger, insurance.add(bonus));
            }
        }
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3]) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns (uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250 || nonce >= block.number) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}
