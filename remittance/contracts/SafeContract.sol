pragma solidity ^0.4.14;

contract SafeContract {
    
    address public owner;
    address public ownerCandidate;
    bool    public stopped;

    event OwnerUpdate(address _prevOwner, address _newOwner);

    function SafeContract() {
        owner = msg.sender;
        stopped = false;
    }

    modifier security_monitor_sender(address _addr) {
        assert(msg.sender == _addr);
        assert(!stopped);
        _;
    }

    modifier security_monitor() {
        assert(!stopped);
        _;
    }

    function __transferOwnership(address _newOwner) public {
        require(msg.sender == owner);
        require(_newOwner != owner);
        ownerCandidate = _newOwner;
    }

    function __acceptOwnership() public {
        require(msg.sender == ownerCandidate);
        OwnerUpdate(owner, ownerCandidate);
        owner = ownerCandidate;
        ownerCandidate = 0x0;
    }

}