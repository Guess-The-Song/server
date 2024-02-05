// test/user.test.js

describe('Spotify Integration Tests', function() {
    let socket;

    before(function() {
        this.timeout(10000);
        console.log('before 1');
    });

    beforeEach(() => {
        // Prepear a Socket.io client before running any tests
        console.log('beforeEach 1');
    });

    afterEach(() => {
        console.log('afterEach 1');
    });

    after(() => {
        // Stop the Socket.io server after all tests have run
        console.log('after 1');
    });

    // test user provider integration

    // test register
    describe('register Tests', () => {
        console.log('describe 1');

        beforeEach(() => {
            console.log('beforeEach 2');
        });

        it('Should log stuff', () => {
            console.log('it 1');
        });

        it('Should log stuff', () => {
            console.log('it 2');
        });

    });
});
