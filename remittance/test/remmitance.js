/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertJump = require("./helpers/assertJump.js");
const timeTravel = require("./helpers/timeTravel.js");
const txPrice = require("./helpers/txPrice.js");

const Remittance = artifacts.require("../contracts/Remittance.sol");

contract("Remittance", (accounts) => {

    const DEADLINELIMIT    = 3600 * 48;
    const AMOUNT           = web3.toBigNumber(web3.toWei('1','ether'))

    const bconcat          = (x,y) => { return "0x"+x.substring(2)+y.substring(2) }
    const bsha3            = (x) => { return web3.sha3(x, { encoding : 'hex' })}

    const KCAROL           = "0x0102030405060708091011121314151617181920212223242526272829303132"
    const KBOB             = "0x0102030405060708091011121314151617181920212223242526272829303133"
    const METPROOF         = bsha3(bconcat(KCAROL,bsha3(KBOB)))
    const PAYMENTPROOF     = bsha3(bconcat(KCAROL,KBOB))
    const METCHALLANGE     = bsha3(METPROOF)
    const PAYMENTCHALLANGE = bsha3(PAYMENTPROOF)

    const {
        0: owner,
        1: alice,
        2: bob,
        3: carol
    } = accounts;

    let r;
    beforeEach(async () => {
        r = await Remittance.new(
            DEADLINELIMIT
        )
    });

    it("check construction parameters ", async () => {
       assert.equal((await r.deadlineLimit()).toNumber(), DEADLINELIMIT);
    });
     
    // just everything together, should be split and test each funcionality in
    //   an specialized test

    it("all positive case", async () => {
  
        const fee = await r.FEE()

        // -- alice diposits
        let trn = await r.diposit(
            METCHALLANGE, PAYMENTCHALLANGE, 3600,
            { from : alice, value : fee.add(AMOUNT) }
        )
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogDiposit");
        assert.equal(trn.logs[ 0 ].args.metChallange, METCHALLANGE);
        assert.equal(trn.logs[ 0 ].args.amount.toNumber(), AMOUNT.toNumber());
  
        // -- carol binds
        trn = await r.bind(
            METPROOF,
            { from : carol }
        )
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogBinded");
        assert.equal(trn.logs[ 0 ].args.metChallange, METCHALLANGE);
        assert.equal(trn.logs[ 0 ].args.destination, carol );

        // -- carol is being paid
        const balance = web3.eth.getBalance(carol);
        trn = await r.withdraw(
            METPROOF, PAYMENTPROOF,
            { from : carol }
        )
        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogPaid");
        assert.equal(trn.logs[ 0 ].args.metChallange, METCHALLANGE);
        assert.equal(trn.logs[ 0 ].args.destination, carol );
        assert.equal(trn.logs[ 0 ].args.amount.toNumber(), AMOUNT.toNumber() );

        const expectedDiff = AMOUNT.sub(txPrice(trn));
        const currentDiff = web3.eth.getBalance(carol).minus(balance);

        assert.equal(expectedDiff.toNumber(), currentDiff.toNumber());


    });

    it("claim case", async () => {
  
        const fee = await r.FEE()
  
        let trn = await r.diposit(
            METCHALLANGE, PAYMENTCHALLANGE, 3600,
            { from : alice, value : fee.add(AMOUNT) }
        )

        await timeTravel(3700);

        const balance = web3.eth.getBalance(alice);

        trn = await r.claim(
            METCHALLANGE,
            { from : alice }
        )

        assert.equal(trn.logs.length, 1);
        assert.equal(trn.logs[ 0 ].event, "LogClaimed");
        assert.equal(trn.logs[ 0 ].args.metChallange, METCHALLANGE);

        const expectedDiff = AMOUNT.sub(txPrice(trn));
        const currentDiff = web3.eth.getBalance(alice).minus(balance);

        assert.equal(expectedDiff.toNumber(), currentDiff.toNumber());
    });


    it("claim before case", async () => {
  
        const fee = await r.FEE()

        let trn = await r.diposit(
            METCHALLANGE, PAYMENTCHALLANGE, 3600,
            { from : alice, value : fee.add(AMOUNT) }
        )

        try {
            trn = await r.claim(
                METCHALLANGE,
                { from : alice }
            )
        } catch (error) {
            return assertJump(error);
        }
        assert.fail("should have thrown before");

    });

});
