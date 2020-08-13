const assert = require('assert');
const main = require('../index');
var jsdom = require("jsdom");

jsdom.env("http://127.0.0.1:5500/", function (error, window) {
    if (error) throw error;
    describe('Size', function () {
        describe('changeSize', function () {
            it('should save passed size', function () {
                assert.equal(main.sum(3, 2), 5);
            });
        });
    });
});
