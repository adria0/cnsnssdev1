pragma solidity ^0.4.14;

import  "./SafeContract.sol";

/*

Protocol: 

1. Alice reates two 32byte random keys Kbob & Kcarol, and diposits the amount to be sent

   and computes, where || operator is concatenation
   
   metProof         = Kcarol||keccak256(Kbob)
   paymentProof     = Kcarol||Kbob
   metChallange     = keccak256(metProof)
   paymentChallange = keccak256(paymentProof)
 
   Remittance.diposit(
        metChallange, paymentChallange,
        {from : aliceaddr, value: amount)
    }

3. Alice sends Kbob to Bob and Kcarol to Carol

4. Carol asks Bob for his keccak256(Kbob), to compute

   this has two main goals:
   
   1) Binds the payment to her account. We need to do this to prevent 
      an evilish miner or a frontrunner to capture the Remitance.pay function
      and change to payment address if we don't do that in two steps.
   
   2) Gives a proof to Bob and Carol that they started the transaction.
   
   so, Carol executes: 

   Remittance.bind(metProof, carolAddr)
   
   this function checks that metChallage==keccak256(metProof)
   
5. Carol checks that the binding has been done (cannot be done two times)
   in the blockchain, then Bob and Carols exchanges Kbob, and the fiat, then
   carol computes:
   
   and executes
   
   Remittance.pay(paymentProof, { from : carolAddr })
   
   that sends the diposited amount to Carol
      
*/

contract Remittance is SafeContract {

    /// constants -----------------------------------------------
    
    uint256 constant public FEE = 1**15; // 1 miliether = 1 finney

    /// events --------------------------------------------------

    event LogDiposit(bytes32 metChallange, uint256 amount);
    event LogBinded(bytes32 metChallange, address destination);
    event LogPaid(bytes32 metChallange, address destination, uint256 amount);
    event LogClaimed(bytes32 metChallange);

    /// types ---------------------------------------------------

    struct Payment {
        address sender;
        address destination;
        uint256 amount;
        uint256 deadline;
        bytes32 paymentChallange;
    }
    
    /// variables ----------------------------------------------
    
    mapping (bytes32 => Payment) payments; 
    uint256                      public deadlineLimit;

    function Remittance(uint256 _deadlineLimit) {
        deadlineLimit = _deadlineLimit;
    }

    function diposit(bytes32 _metChallange, bytes32 _paymentChallange, uint256 _timeLimit)
    security_monitor() external payable
    {
       require(msg.value > FEE);
       require(_timeLimit <= deadlineLimit);
       require(payments[_metChallange].amount == 0);
  
       payments[_metChallange] = Payment({
         sender           : msg.sender,
         amount           : msg.value - FEE,
         deadline         : now + _timeLimit, 
         destination      : 0x0,
         paymentChallange : _paymentChallange
       });
       
       owner.transfer(FEE);
       LogDiposit(_metChallange,payments[_metChallange].amount);
    }
    
    function bind(bytes32 _metProof) 
    security_monitor() external
    {
        bytes32 metChallange = keccak256(_metProof);
        require(payments[metChallange].sender != 0x0 );
        require(payments[metChallange].deadline > now);
        require(payments[metChallange].destination == 0x0);
        
        payments[metChallange].destination = msg.sender;
        LogBinded(metChallange,msg.sender);
    }
    
    function withdraw(bytes32 _metProof, bytes32 _paymentProof) 
    security_monitor() external
    {
        bytes32 metChallange = keccak256(_metProof);
        bytes32 paymentChallange = keccak256(_paymentProof);
        
        require(payments[metChallange].sender != 0x0);
        require(payments[metChallange].deadline > now);
        require(payments[metChallange].destination == msg.sender);
        require(payments[metChallange].paymentChallange == paymentChallange);

        payments[metChallange].destination.transfer(payments[metChallange].amount);

        LogPaid(metChallange, msg.sender,payments[metChallange].amount );
        // delete payments[metChallange]; OMGWTF crashes metamask w/ testrpc :-?

    }
    
    function claim(bytes32 _metChallange)  
    security_monitor() external
    {
        require(payments[_metChallange].sender == msg.sender);
        require(now > payments[_metChallange].deadline);

        msg.sender.transfer(payments[_metChallange].amount);
        // delete payments[_metChallange]; OMGWTF crashes metamask w/ testrpc :-?

        LogClaimed(_metChallange);
    }
}
